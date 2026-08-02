import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  OrderStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminOrderListQueryDto,
  CancelOrderDto,
  ExpectedVersionDto,
  RescheduleAppointmentDto,
} from './dto/admin-order.dto';

const STALE_MESSAGE =
  'Đơn hàng đã được cập nhật bởi người khác. Vui lòng tải lại dữ liệu.';
const detailInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
  appointment: true,
  statusHistory: { orderBy: { occurredAt: 'asc' as const } },
  currentCollector: { include: { staffUser: true } },
  subject: true,
  collectionAttempts: {
    include: { collectorProfile: true },
    orderBy: { attemptNumber: 'desc' as const },
  },
} satisfies Prisma.OrderInclude;
type DetailedOrder = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminOrderListQueryDto) {
    this.assertRanges(query);
    const where = this.where(query);
    const orderBy =
      query.sortBy === 'scheduledDate'
        ? { appointment: { scheduledDate: query.sortOrder } }
        : { [query.sortBy]: query.sortOrder };
    const [orders, total] = await this.prisma.transaction(async (tx) =>
      Promise.all([
        tx.order.findMany({
          where,
          include: { appointment: true, _count: { select: { items: true } } },
          orderBy,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.order.count({ where }),
      ]),
    );
    return {
      data: orders.map((order) => ({
        orderCode: order.orderCode,
        status: order.status,
        statusLabel: statusLabel(order.status),
        contactName: order.contactName,
        maskedPhone: maskPhone(order.contactPhone),
        appointment: order.appointment
          ? {
              scheduledDate: order.appointment.scheduledDate,
              timeSlot: order.appointment.timeSlot,
              province: order.appointment.province,
              district: order.appointment.district,
              ward: order.appointment.ward,
            }
          : null,
        itemCount: order._count.items,
        totalAmount: order.totalAmount.toString(),
        version: order.version,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async summary() {
    const groups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      Object.values(OrderStatus).map((status) => [status, 0]),
    ) as Record<OrderStatus, number>;
    for (const group of groups) counts[group.status] = group._count._all;
    return { counts };
  }

  async detail(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode: normalizeCode(orderCode) },
      include: detailInclude,
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return this.response(order);
  }

  confirm(orderCode: string, dto: ExpectedVersionDto, staffUserId: string) {
    return this.mutate(
      orderCode,
      dto.expectedVersion,
      staffUserId,
      async (tx, order) => {
        if (order.status !== OrderStatus.PENDING_CONFIRMATION)
          throw new ConflictException(
            'Trạng thái đơn hàng không cho phép xác nhận',
          );
        await this.atomicUpdate(tx, order, dto.expectedVersion, {
          status: OrderStatus.CONFIRMED,
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: OrderStatus.CONFIRMED,
            title: 'Đơn hàng đã được xác nhận',
            description: 'HomeLab đã xác nhận lịch lấy mẫu.',
          },
        });
        await this.audit(tx, staffUserId, order.orderCode, 'ORDER_CONFIRMED', {
          previousStatus: order.status,
          newStatus: OrderStatus.CONFIRMED,
        });
      },
    );
  }

  cancel(orderCode: string, dto: CancelOrderDto, staffUserId: string) {
    return this.mutate(
      orderCode,
      dto.expectedVersion,
      staffUserId,
      async (tx, order) => {
        if (
          order.status !== OrderStatus.PENDING_CONFIRMATION &&
          order.status !== OrderStatus.CONFIRMED
        )
          throw new ConflictException(
            'Trạng thái đơn hàng không cho phép hủy trực tiếp',
          );
        await this.atomicUpdate(tx, order, dto.expectedVersion, {
          status: OrderStatus.CANCELLED,
        });
        await tx.appointment.updateMany({
          where: { orderId: order.id },
          data: { status: AppointmentStatus.CANCELLED },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: OrderStatus.CANCELLED,
            title: 'Đơn hàng đã được hủy',
            description:
              'Đơn hàng đã được HomeLab cập nhật sang trạng thái đã hủy.',
          },
        });
        await this.audit(tx, staffUserId, order.orderCode, 'ORDER_CANCELLED', {
          previousStatus: order.status,
          newStatus: OrderStatus.CANCELLED,
          reason: sanitizeReason(dto.reason, order),
        });
      },
    );
  }

  reschedule(
    orderCode: string,
    dto: RescheduleAppointmentDto,
    staffUserId: string,
  ) {
    const scheduledDate = new Date(dto.scheduledDate);
    if (scheduledDate.getTime() <= Date.now())
      throw new BadRequestException(
        'Lịch lấy mẫu không được nằm trong quá khứ',
      );
    return this.mutate(
      orderCode,
      dto.expectedVersion,
      staffUserId,
      async (tx, order) => {
        if (order.status === OrderStatus.CANCELLED)
          throw new ConflictException('Không thể đổi lịch của đơn đã hủy');
        if (!order.appointment)
          throw new ConflictException('Đơn hàng không có lịch hẹn');
        if (
          order.appointment.scheduledDate.getTime() ===
            scheduledDate.getTime() &&
          order.appointment.timeSlot === dto.timeSlot
        )
          throw new ConflictException('Lịch mới phải khác lịch hiện tại');
        if (order.currentCollectorProfileId) {
          const range = localDayRange(scheduledDate);
          const conflict = await tx.order.findFirst({
            where: {
              id: { not: order.id },
              currentCollectorProfileId: order.currentCollectorProfileId,
              status: { not: OrderStatus.CANCELLED },
              appointment: { scheduledDate: range, timeSlot: dto.timeSlot },
            },
            select: { id: true },
          });
          if (conflict)
            throw new ConflictException(
              'Nhân viên lấy mẫu đã có lịch trong khung giờ mới',
            );
        }
        await this.atomicUpdate(tx, order, dto.expectedVersion, {});
        await tx.appointment.update({
          where: { orderId: order.id },
          data: {
            scheduledDate,
            timeSlot: dto.timeSlot,
            status: AppointmentStatus.RESCHEDULED,
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: order.status,
            title: 'Lịch lấy mẫu đã được cập nhật',
            description: 'Lịch lấy mẫu tại nhà đã được điều chỉnh.',
          },
        });
        await this.audit(
          tx,
          staffUserId,
          order.orderCode,
          'APPOINTMENT_RESCHEDULED',
          {
            previousSchedule: {
              scheduledDate: order.appointment.scheduledDate.toISOString(),
              timeSlot: order.appointment.timeSlot,
            },
            newSchedule: {
              scheduledDate: scheduledDate.toISOString(),
              timeSlot: dto.timeSlot,
            },
            reason: sanitizeReason(dto.reason, order),
          },
        );
      },
    );
  }

  private async mutate(
    orderCode: string,
    expectedVersion: number,
    staffUserId: string,
    operation: (
      tx: Prisma.TransactionClient,
      order: DetailedOrder,
    ) => Promise<void>,
  ) {
    return this.prisma.transaction(async (tx) => {
      const normalized = normalizeCode(orderCode);
      const order = await tx.order.findUnique({
        where: { orderCode: normalized },
        include: detailInclude,
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (order.version !== expectedVersion)
        throw new ConflictException(STALE_MESSAGE);
      await operation(tx, order);
      const updated = await tx.order.findUnique({
        where: { orderCode: normalized },
        include: detailInclude,
      });
      if (!updated) throw new NotFoundException('Không tìm thấy đơn hàng');
      return this.response(updated);
    });
  }

  private async atomicUpdate(
    tx: Prisma.TransactionClient,
    order: DetailedOrder,
    version: number,
    data: Prisma.OrderUpdateManyMutationInput,
  ) {
    const result = await tx.order.updateMany({
      where: { id: order.id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) throw new ConflictException(STALE_MESSAGE);
  }

  private audit(
    tx: Prisma.TransactionClient,
    staffUserId: string,
    orderCode: string,
    action: string,
    metadata: Prisma.InputJsonValue,
  ) {
    return tx.adminAuditLog.create({
      data: {
        staffUserId,
        action,
        entityType: 'ORDER',
        entityReference: orderCode,
        metadata,
      },
    });
  }

  private where(query: AdminOrderListQueryDto): Prisma.OrderWhereInput {
    const search = query.search?.trim();
    return {
      status: query.status,
      ...(search
        ? {
            OR: [
              { orderCode: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
              { contactPhone: { contains: normalizePhone(search) } },
            ],
          }
        : {}),
      createdAt: dateRange(query.createdFrom, query.createdTo),
      appointment:
        query.appointmentDateFrom || query.appointmentDateTo
          ? {
              scheduledDate: dateRange(
                query.appointmentDateFrom,
                query.appointmentDateTo,
              ),
            }
          : undefined,
    };
  }

  private assertRanges(query: AdminOrderListQueryDto) {
    for (const [from, to] of [
      [query.createdFrom, query.createdTo],
      [query.appointmentDateFrom, query.appointmentDateTo],
    ])
      if (from && to && new Date(from) > new Date(to))
        throw new BadRequestException(
          'Ngày bắt đầu không được sau ngày kết thúc',
        );
  }

  private response(order: DetailedOrder) {
    if (!order.appointment)
      throw new ConflictException('Đơn hàng không có lịch hẹn');
    return {
      orderCode: order.orderCode,
      status: order.status,
      statusLabel: statusLabel(order.status),
      version: order.version,
      contact: { name: order.contactName, phone: order.contactPhone },
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
      currentCollector: order.currentCollector
        ? {
            employeeCode: order.currentCollector.employeeCode,
            fullName: order.currentCollector.staffUser.fullName,
            maskedPhone: maskPhone(order.currentCollector.phone),
            operationalStatus: order.currentCollector.operationalStatus,
          }
        : null,
      subject: order.subject
        ? {
            fullName: order.subject.fullName,
            dateOfBirth: order.subject.dateOfBirth.toISOString().slice(0, 10),
            sex: order.subject.sex,
            relationshipToContact: order.subject.relationshipToContact,
          }
        : null,
      collectionAttempts: order.collectionAttempts.map((attempt) => ({
        attemptNumber: attempt.attemptNumber,
        collectorEmployeeCode: attempt.collectorProfile.employeeCode,
        status: attempt.status,
        startedAt: attempt.startedAt,
        collectedAt: attempt.collectedAt,
        inTransitAt: attempt.inTransitAt,
        failedAt: attempt.failedAt,
        failureReason: attempt.failureReason,
      })),
      requiresCollectionAttention:
        order.collectionAttempts[0]?.status === 'FAILED',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

function dateRange(
  from?: string,
  to?: string,
): Prisma.DateTimeFilter | undefined {
  return from || to
    ? {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      }
    : undefined;
}
function localDayRange(date: Date): Prisma.DateTimeFilter {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const start = new Date(`${day}T00:00:00+07:00`);
  return { gte: start, lt: new Date(start.getTime() + 86_400_000) };
}
function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}
function normalizePhone(value: string) {
  const compact = value.trim().replace(/[ .()-]/g, '');
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
}
function maskPhone(value: string) {
  const normalized = normalizePhone(value);
  return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}
function sanitizeReason(value: string, order: DetailedOrder) {
  let sanitized = value
    .replace(/<[^>]*>/g, '')
    .replace(/(?:\+84|0)(?:[ .()-]*\d){9,10}/g, '[REDACTED_PHONE]')
    .replace(
      /\b(?:password|token|cookie|authorization)\s*[:=]\s*\S+/gi,
      '[REDACTED_AUTH]',
    )
    .trim()
    .slice(0, 500);
  for (const sensitive of [
    order.contactName,
    order.contactPhone,
    order.appointment?.addressLine,
  ]) {
    if (sensitive?.trim())
      sanitized = sanitized.replace(
        new RegExp(escapeRegExp(sensitive.trim()), 'gi'),
        '[REDACTED_CONTACT]',
      );
  }
  return sanitized;
}
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function statusLabel(status: OrderStatus) {
  if (status === OrderStatus.COLLECTOR_ASSIGNED) return 'Đã phân công lấy mẫu';
  if (status === OrderStatus.COLLECTOR_ON_THE_WAY) return 'Đang di chuyển';
  if (status === OrderStatus.COLLECTED) return 'Đã lấy mẫu';
  if (status === OrderStatus.IN_TRANSIT) return 'Mẫu đang vận chuyển';
  return status === OrderStatus.CONFIRMED
    ? 'Đã xác nhận'
    : status === OrderStatus.CANCELLED
      ? 'Đã hủy'
      : 'Chờ xác nhận';
}
