import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  LabTestStatus,
  OrderStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { LookupOrderDto } from './dto/lookup-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import {
  LegacyOrderStatusResponseDto,
  PublicOrderResponseDto,
} from './dto/public-order-response.dto';
import { ORDER_COLLECTION_FEE } from './orders.constants';

const INITIAL_HISTORY_TITLE = 'Đã tiếp nhận yêu cầu';
const INITIAL_HISTORY_DESCRIPTION =
  'HomeLab đã nhận được yêu cầu đặt lịch của bạn.';
const LOOKUP_NOT_FOUND_MESSAGE =
  'Không tìm thấy đơn phù hợp với thông tin đã cung cấp.';

const orderDetails = {
  items: { orderBy: { createdAt: 'asc' as const } },
  appointment: true,
} satisfies Prisma.OrderInclude;

const publicOrderDetails = {
  ...orderDetails,
  statusHistory: { orderBy: { occurredAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;

type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof orderDetails;
}>;
type PublicOrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof publicOrderDetails;
}>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto): Promise<OrderResponseDto> {
    if (new Set(dto.labTestIds).size !== dto.labTestIds.length) {
      throw new BadRequestException('Duplicate lab test IDs are not allowed');
    }

    const order = await this.prisma.transaction(async (transaction) => {
      const availableTests = await transaction.labTest.findMany({
        where: {
          id: { in: dto.labTestIds },
          status: LabTestStatus.ACTIVE,
          homeCollectable: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          specimenType: true,
          price: true,
        },
      });

      if (availableTests.length !== dto.labTestIds.length) {
        throw new BadRequestException(
          'One or more lab tests are unavailable for home collection',
        );
      }

      const testsById = new Map(availableTests.map((test) => [test.id, test]));
      const orderedTests = dto.labTestIds.map((id) => {
        const test = testsById.get(id);
        if (!test) {
          throw new BadRequestException(
            'One or more lab tests are unavailable for home collection',
          );
        }
        return test;
      });
      const subtotal = orderedTests.reduce(
        (amount, test) => amount.plus(test.price),
        new Prisma.Decimal(0),
      );
      const collectionFee = new Prisma.Decimal(ORDER_COLLECTION_FEE);

      return transaction.order.create({
        data: {
          orderCode: this.createOrderCode(),
          status: OrderStatus.PENDING_CONFIRMATION,
          contactName: dto.contactName.trim(),
          contactPhone: normalizePhone(dto.contactPhone),
          subtotal,
          collectionFee,
          totalAmount: subtotal.plus(collectionFee),
          items: {
            create: orderedTests.map((test) => ({
              labTestId: test.id,
              testCodeSnapshot: test.code,
              testNameSnapshot: test.name,
              specimenTypeSnapshot: test.specimenType,
              priceSnapshot: test.price,
            })),
          },
          appointment: {
            create: {
              scheduledDate: new Date(dto.appointment.scheduledDate),
              timeSlot: dto.appointment.timeSlot,
              province: dto.appointment.province.trim(),
              district: dto.appointment.district.trim(),
              ward: dto.appointment.ward.trim(),
              addressLine: dto.appointment.addressLine.trim(),
              note: dto.appointment.note?.trim() || null,
              status: AppointmentStatus.SCHEDULED,
            },
          },
          statusHistory: {
            create: {
              status: OrderStatus.PENDING_CONFIRMATION,
              title: INITIAL_HISTORY_TITLE,
              description: INITIAL_HISTORY_DESCRIPTION,
            },
          },
        },
        include: orderDetails,
      });
    });

    return this.toCreateResponse(order);
  }

  async lookup(dto: LookupOrderDto): Promise<PublicOrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderCode: dto.orderCode.trim().toUpperCase() },
      include: publicOrderDetails,
    });
    const suppliedPhone = normalizePhone(dto.contactPhone);
    const storedPhone = order ? normalizePhone(order.contactPhone) : '';

    if (!order || !secureEqual(storedPhone, suppliedPhone)) {
      throw new NotFoundException(LOOKUP_NOT_FOUND_MESSAGE);
    }

    return this.toPublicResponse(order);
  }

  async findByOrderCode(
    orderCode: string,
  ): Promise<LegacyOrderStatusResponseDto> {
    const normalizedCode = orderCode.trim().toUpperCase();
    const order = await this.prisma.order.findUnique({
      where: { orderCode: normalizedCode },
      select: { orderCode: true, status: true, createdAt: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderCode: order.orderCode,
      status: order.status,
      statusLabel: statusLabel(order.status),
      createdAt: order.createdAt,
    };
  }

  private createOrderCode(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
    return `HL-${date}-${suffix}`;
  }

  private toCreateResponse(order: OrderWithDetails): OrderResponseDto {
    if (!order.appointment) throw new Error('Order appointment is missing');
    return {
      orderCode: order.orderCode,
      status: order.status,
      items: order.items.map((item) => ({
        labTestId: item.labTestId,
        testCode: item.testCodeSnapshot,
        testName: item.testNameSnapshot,
        specimenType: item.specimenTypeSnapshot,
        price: item.priceSnapshot.toString(),
      })),
      appointment: {
        scheduledDate: order.appointment.scheduledDate,
        timeSlot: order.appointment.timeSlot,
        province: order.appointment.province,
        district: order.appointment.district,
        ward: order.appointment.ward,
        addressLine: order.appointment.addressLine,
        note: order.appointment.note,
        status: order.appointment.status,
      },
      subtotal: order.subtotal.toString(),
      collectionFee: order.collectionFee.toString(),
      totalAmount: order.totalAmount.toString(),
      createdAt: order.createdAt,
    };
  }

  private toPublicResponse(
    order: PublicOrderWithDetails,
  ): PublicOrderResponseDto {
    if (!order.appointment) throw new Error('Order appointment is missing');
    return {
      orderCode: order.orderCode,
      status: order.status,
      statusLabel: statusLabel(order.status),
      contact: { maskedPhone: maskPhone(order.contactPhone) },
      appointment: {
        scheduledDate: order.appointment.scheduledDate,
        timeSlot: order.appointment.timeSlot,
        province: order.appointment.province,
        district: order.appointment.district,
        ward: order.appointment.ward,
      },
      items: order.items.map((item) => ({
        testCode: item.testCodeSnapshot,
        testName: item.testNameSnapshot,
        specimenType: item.specimenTypeSnapshot,
        price: item.priceSnapshot.toString(),
      })),
      subtotal: order.subtotal.toString(),
      collectionFee: order.collectionFee.toString(),
      totalAmount: order.totalAmount.toString(),
      timeline: order.statusHistory.map((entry) => ({
        status: entry.status,
        title: entry.title,
        description: entry.description,
        occurredAt: entry.occurredAt,
      })),
      createdAt: order.createdAt,
    };
  }
}

function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[ .()-]/g, '');
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
}

function secureEqual(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function maskPhone(value: string): string {
  const normalized = normalizePhone(value);
  return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

function statusLabel(status: OrderStatus): string {
  if (status === OrderStatus.CONFIRMED) return 'Đã xác nhận';
  if (status === OrderStatus.CANCELLED) return 'Đã hủy';
  return 'Chờ xác nhận';
}
