import { randomUUID } from 'node:crypto';
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
import { OrderResponseDto } from './dto/order-response.dto';
import { ORDER_COLLECTION_FEE } from './orders.constants';

const orderDetails = {
  items: { orderBy: { createdAt: 'asc' as const } },
  appointment: true,
} satisfies Prisma.OrderInclude;

type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof orderDetails;
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
          status: OrderStatus.CONFIRMED,
          contactName: dto.contactName.trim(),
          contactPhone: dto.contactPhone,
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
        },
        include: orderDetails,
      });
    });

    return this.toResponse(order);
  }

  async findByOrderCode(orderCode: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      include: orderDetails,
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderCode} was not found`);
    }

    return this.toResponse(order);
  }

  private createOrderCode(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
    return `HL-${date}-${suffix}`;
  }

  private toResponse(order: OrderWithDetails): OrderResponseDto {
    if (!order.appointment) {
      throw new Error('Order appointment is missing');
    }

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
}
