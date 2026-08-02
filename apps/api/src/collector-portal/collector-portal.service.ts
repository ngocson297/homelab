import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  CollectionAttemptStatus,
  CollectionFailureReason,
  CollectorOperationalStatus,
  OrderStatus,
  Prisma,
  CustodyActorType,
  SpecimenCustodyEventType,
  SpecimenStatus,
  StaffRole,
  StaffStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CollectorOrdersQueryDto,
  CollectSpecimensDto,
  ExpectedVersionDto,
  ReportCollectionFailureDto,
} from './dto/collector-portal.dto';

const STALE = 'Dữ liệu đã thay đổi. Vui lòng tải lại.';
const detailInclude = {
  appointment: true,
  subject: true,
  items: {
    include: { labTest: { select: { preparationInstruction: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  statusHistory: { orderBy: { occurredAt: 'asc' as const } },
  collectionAttempts: { orderBy: { attemptNumber: 'desc' as const } },
  specimens: {
    include: {
      orderItems: {
        include: { orderItem: true },
        orderBy: { createdAt: 'asc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.OrderInclude;
type DetailOrder = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class CollectorPortalService {
  constructor(private readonly prisma: PrismaService) {}

  async me(staffUserId: string) {
    const profile = await this.profile(this.prisma, staffUserId);
    return {
      employeeCode: profile.employeeCode,
      fullName: profile.staffUser.fullName,
      email: profile.staffUser.email,
      maskedPhone: maskPhone(profile.phone),
      operationalStatus: profile.operationalStatus,
      serviceAreas: profile.serviceAreas.map((x) => ({
        province: x.province,
        district: x.district,
      })),
    };
  }

  async summary(staffUserId: string) {
    const profile = await this.profile(this.prisma, staffUserId);
    const today = localDayRange(new Date());
    const where = {
      currentCollectorProfileId: profile.id,
    } satisfies Prisma.OrderWhereInput;
    const [todayCount, groups] = await this.prisma.transaction((tx) =>
      Promise.all([
        tx.order.count({
          where: { ...where, appointment: { scheduledDate: today } },
        }),
        tx.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
      ]),
    );
    const counts = Object.fromEntries(
      Object.values(OrderStatus).map((s) => [s, 0]),
    );
    for (const group of groups) counts[group.status] = group._count._all;
    return {
      today: todayCount,
      upcoming: Number(counts.COLLECTOR_ASSIGNED ?? 0),
      onTheWay: Number(counts.COLLECTOR_ON_THE_WAY ?? 0),
      collected: Number(counts.COLLECTED ?? 0),
    };
  }

  async orders(staffUserId: string, query: CollectorOrdersQueryDto) {
    const profile = await this.profile(this.prisma, staffUserId);
    const where: Prisma.OrderWhereInput = {
      currentCollectorProfileId: profile.id,
      status: query.status,
      appointment: query.date
        ? {
            scheduledDate: localDayRange(
              new Date(`${query.date}T12:00:00+07:00`),
            ),
          }
        : undefined,
    };
    const [orders, total] = await this.prisma.transaction((tx) =>
      Promise.all([
        tx.order.findMany({
          where,
          include: {
            appointment: true,
            subject: true,
            _count: { select: { items: true } },
          },
          orderBy: { appointment: { scheduledDate: query.sortOrder } },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.order.count({ where }),
      ]),
    );
    return {
      data: orders.map((o) => ({
        orderCode: o.orderCode,
        status: o.status,
        statusLabel: label(o.status),
        appointment: o.appointment
          ? {
              scheduledDate: o.appointment.scheduledDate,
              timeSlot: o.appointment.timeSlot,
              province: o.appointment.province,
              district: o.appointment.district,
              ward: o.appointment.ward,
            }
          : null,
        subject: {
          displayName:
            o.subject?.fullName ?? 'Thiếu thông tin người xét nghiệm',
        },
        itemCount: o._count.items,
        version: o.version,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async detail(staffUserId: string, orderCode: string) {
    const profile = await this.profile(this.prisma, staffUserId);
    const order = await this.ownedOrder(this.prisma, profile.id, orderCode);
    return this.response(order);
  }

  startJourney(staffUserId: string, code: string, dto: ExpectedVersionDto) {
    return this.mutate(
      staffUserId,
      code,
      dto.expectedVersion,
      async (tx, profile, order) => {
        if (profile.operationalStatus !== CollectorOperationalStatus.AVAILABLE)
          throw new ConflictException('Nhân viên không ở trạng thái sẵn sàng');
        if (
          order.status !== OrderStatus.COLLECTOR_ASSIGNED ||
          order.appointment?.status === AppointmentStatus.CANCELLED
        )
          throw new ConflictException(
            'Trạng thái không cho phép bắt đầu di chuyển',
          );
        if (order.collectionAttempts.some((x) => !terminal(x.status)))
          throw new ConflictException('Đơn đã có lần lấy mẫu đang hoạt động');
        const activeSpecimens = order.specimens.filter(
          (item) => item.status !== SpecimenStatus.CANCELLED,
        );
        if (
          !activeSpecimens.length ||
          activeSpecimens.some((item) => item.status !== SpecimenStatus.LABELED)
        )
          throw new ConflictException(
            'Admin hoặc phòng xét nghiệm cần chuẩn bị đầy đủ nhãn bệnh phẩm',
          );
        const next = (order.collectionAttempts[0]?.attemptNumber ?? 0) + 1;
        await this.updateOrder(
          tx,
          order,
          dto.expectedVersion,
          OrderStatus.COLLECTOR_ON_THE_WAY,
        );
        await tx.collectionAttempt.create({
          data: {
            orderId: order.id,
            collectorProfileId: profile.id,
            attemptNumber: next,
            status: CollectionAttemptStatus.ON_THE_WAY,
            startedAt: new Date(),
          },
        });
        await this.event(
          tx,
          order,
          staffUserId,
          OrderStatus.COLLECTOR_ON_THE_WAY,
          'Nhân viên lấy mẫu đang di chuyển',
          'Nhân viên lấy mẫu đang trên đường đến địa điểm đã hẹn.',
          'COLLECTION_JOURNEY_STARTED',
          { employeeCode: profile.employeeCode },
          dto.operationId,
        );
      },
      dto.operationId,
      OrderStatus.COLLECTOR_ON_THE_WAY,
    );
  }

  collectSpecimens(
    staffUserId: string,
    code: string,
    dto: CollectSpecimensDto,
  ) {
    return this.mutate(
      staffUserId,
      code,
      dto.expectedVersion,
      async (tx, profile, order) => {
        if (order.status !== OrderStatus.COLLECTOR_ON_THE_WAY)
          throw new ConflictException(
            'Trạng thái không cho phép ghi nhận lấy mẫu',
          );
        if (!order.subject)
          throw new ConflictException('Thiếu thông tin người xét nghiệm');
        if (
          !dto.identityConfirmation.fullNameConfirmed ||
          !dto.identityConfirmation.dateOfBirthConfirmed ||
          !dto.consentConfirmed
        )
          throw new ConflictException(
            'Phải xác minh đủ hai thông tin nhận diện và sự đồng ý',
          );
        const attempt = order.collectionAttempts.find(
          (x) => x.status === CollectionAttemptStatus.ON_THE_WAY,
        );
        if (!attempt)
          throw new ConflictException('Không có lần lấy mẫu đang hoạt động');
        const active = order.specimens.filter(
          (item) => item.status !== SpecimenStatus.CANCELLED,
        );
        if (!active.length)
          throw new ConflictException('Đơn chưa có kế hoạch bệnh phẩm');
        const scanned = dto.specimens.map((item) => item.barcodeValue.trim());
        if (new Set(scanned).size !== scanned.length)
          throw new BadRequestException(
            'Barcode không được trùng trong yêu cầu',
          );
        if (scanned.length !== active.length)
          throw new BadRequestException(
            'Phải quét đủ tất cả bệnh phẩm của đơn hàng',
          );
        const byBarcode = new Map(
          active.map((item) => [item.barcodeValue, item]),
        );
        if (scanned.some((barcode) => !byBarcode.has(barcode)))
          throw new BadRequestException(
            'Một hoặc nhiều barcode không hợp lệ cho đơn hàng này',
          );
        if (active.some((item) => item.status !== SpecimenStatus.LABELED))
          throw new ConflictException('Bệnh phẩm đã được ghi nhận trước đó');
        const now = new Date();
        for (const input of dto.specimens) {
          const specimen = byBarcode.get(input.barcodeValue.trim());
          if (!specimen) throw new BadRequestException('Barcode không hợp lệ');
          const updated = await tx.specimen.updateMany({
            where: {
              id: specimen.id,
              version: specimen.version,
              status: SpecimenStatus.LABELED,
            },
            data: {
              status: SpecimenStatus.COLLECTED,
              collectedAt: now,
              collectedByCollectorProfileId: profile.id,
              collectedVolumeMl:
                input.collectedVolumeMl === undefined
                  ? null
                  : new Prisma.Decimal(String(input.collectedVolumeMl)),
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw new ConflictException(STALE);
          await tx.specimenCustodyEvent.create({
            data: {
              specimenId: specimen.id,
              eventType: SpecimenCustodyEventType.SPECIMEN_COLLECTED,
              actorType: CustodyActorType.COLLECTOR,
              actorStaffUserId: staffUserId,
              actorCollectorProfileId: profile.id,
              operationId: dto.operationId,
              metadata: {
                fromStatus: SpecimenStatus.LABELED,
                toStatus: SpecimenStatus.COLLECTED,
                employeeCode: profile.employeeCode,
              },
            },
          });
        }
        await this.updateOrder(
          tx,
          order,
          dto.expectedVersion,
          OrderStatus.COLLECTED,
        );
        await tx.collectionAttempt.update({
          where: { id: attempt.id },
          data: {
            status: CollectionAttemptStatus.COLLECTED,
            collectedAt: now,
            identityVerifiedAt: now,
            consentConfirmedAt: now,
          },
        });
        await this.event(
          tx,
          order,
          staffUserId,
          OrderStatus.COLLECTED,
          'Đã lấy mẫu',
          'Mẫu xét nghiệm đã được lấy và đang được chuẩn bị để vận chuyển.',
          'COLLECTION_COMPLETED',
          {
            employeeCode: profile.employeeCode,
            attemptNumber: attempt.attemptNumber,
            specimenCount: active.length,
          },
          dto.operationId,
        );
      },
      dto.operationId,
      OrderStatus.COLLECTED,
    );
  }

  markInTransit(staffUserId: string, code: string, dto: ExpectedVersionDto) {
    return this.mutate(
      staffUserId,
      code,
      dto.expectedVersion,
      async (tx, profile, order) => {
        if (order.status !== OrderStatus.COLLECTED)
          throw new ConflictException('Trạng thái không cho phép chuyển mẫu');
        const attempt = order.collectionAttempts.find(
          (x) => x.status === CollectionAttemptStatus.COLLECTED,
        );
        if (!attempt) throw new ConflictException('Không có mẫu đã lấy');
        const active = order.specimens.filter(
          (item) => item.status !== SpecimenStatus.CANCELLED,
        );
        if (
          !active.length ||
          active.some((item) => item.status !== SpecimenStatus.COLLECTED)
        )
          throw new ConflictException(
            'Tất cả bệnh phẩm phải ở trạng thái COLLECTED',
          );
        const now = new Date();
        for (const specimen of active) {
          const updated = await tx.specimen.updateMany({
            where: {
              id: specimen.id,
              version: specimen.version,
              status: SpecimenStatus.COLLECTED,
            },
            data: {
              status: SpecimenStatus.IN_TRANSIT,
              inTransitAt: now,
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw new ConflictException(STALE);
          await tx.specimenCustodyEvent.create({
            data: {
              specimenId: specimen.id,
              eventType: SpecimenCustodyEventType.HANDED_TO_TRANSPORT,
              actorType: CustodyActorType.COLLECTOR,
              actorStaffUserId: staffUserId,
              actorCollectorProfileId: profile.id,
              operationId: dto.operationId,
              metadata: {
                fromStatus: SpecimenStatus.COLLECTED,
                toStatus: SpecimenStatus.IN_TRANSIT,
                employeeCode: profile.employeeCode,
              },
            },
          });
        }
        await this.updateOrder(
          tx,
          order,
          dto.expectedVersion,
          OrderStatus.IN_TRANSIT,
        );
        await tx.collectionAttempt.update({
          where: { id: attempt.id },
          data: {
            status: CollectionAttemptStatus.IN_TRANSIT,
            inTransitAt: now,
          },
        });
        await this.event(
          tx,
          order,
          staffUserId,
          OrderStatus.IN_TRANSIT,
          'Mẫu đang được vận chuyển',
          'Mẫu xét nghiệm đang được chuyển tới phòng xét nghiệm.',
          'COLLECTION_IN_TRANSIT',
          {
            employeeCode: profile.employeeCode,
            attemptNumber: attempt.attemptNumber,
            specimenCount: active.length,
          },
          dto.operationId,
        );
      },
      dto.operationId,
      OrderStatus.IN_TRANSIT,
    );
  }

  reportFailure(
    staffUserId: string,
    code: string,
    dto: ReportCollectionFailureDto,
  ) {
    if (
      dto.reason === CollectionFailureReason.OTHER &&
      (!dto.note || dto.note.trim().length < 3)
    )
      throw new ConflictException('Lý do khác cần có ghi chú');
    return this.mutate(
      staffUserId,
      code,
      dto.expectedVersion,
      async (tx, profile, order) => {
        if (
          order.status !== OrderStatus.COLLECTOR_ASSIGNED &&
          order.status !== OrderStatus.COLLECTOR_ON_THE_WAY
        )
          throw new ConflictException(
            'Trạng thái không cho phép báo cáo thất bại',
          );
        const now = new Date(),
          note = sanitize(dto.note, [
            order.contactName,
            order.contactPhone,
            order.subject?.fullName,
            order.appointment?.addressLine,
          ]);
        let attempt = order.collectionAttempts.find(
          (x) => x.status === CollectionAttemptStatus.ON_THE_WAY,
        );
        if (attempt)
          await tx.collectionAttempt.update({
            where: { id: attempt.id },
            data: {
              status: CollectionAttemptStatus.FAILED,
              failedAt: now,
              failureReason: dto.reason,
              failureNote: note,
            },
          });
        else {
          const next = (order.collectionAttempts[0]?.attemptNumber ?? 0) + 1;
          attempt = await tx.collectionAttempt.create({
            data: {
              orderId: order.id,
              collectorProfileId: profile.id,
              attemptNumber: next,
              status: CollectionAttemptStatus.FAILED,
              startedAt: now,
              failedAt: now,
              failureReason: dto.reason,
              failureNote: note,
            },
          });
        }
        await this.updateOrder(
          tx,
          order,
          dto.expectedVersion,
          OrderStatus.CONFIRMED,
          true,
        );
        await tx.collectorAssignmentHistory.create({
          data: {
            orderId: order.id,
            previousCollectorProfileId: profile.id,
            action: 'UNASSIGNED',
            performedByStaffUserId: staffUserId,
            reason: `Collection failure: ${dto.reason}`,
          },
        });
        await this.event(
          tx,
          order,
          staffUserId,
          OrderStatus.CONFIRMED,
          'Chưa thể thực hiện lấy mẫu',
          'Lịch lấy mẫu cần được HomeLab hỗ trợ sắp xếp lại.',
          'COLLECTION_FAILED',
          {
            employeeCode: profile.employeeCode,
            attemptNumber: attempt.attemptNumber,
            failureReason: dto.reason,
            note,
          },
          dto.operationId,
        );
      },
      dto.operationId,
      OrderStatus.CONFIRMED,
    );
  }

  private async mutate(
    staffId: string,
    code: string,
    version: number,
    operation: (
      tx: Prisma.TransactionClient,
      profile: Awaited<ReturnType<CollectorPortalService['profile']>>,
      order: DetailOrder,
    ) => Promise<void>,
    operationId: string,
    idempotentStatus: OrderStatus,
  ) {
    try {
      return await this.prisma.transaction(
        async (tx) => {
          const profile = await this.profile(tx, staffId);
          const order = await tx.order.findUnique({
            where: { orderCode: code.trim().toUpperCase() },
            include: detailInclude,
          });
          if (!order) throw new NotFoundException('Không tìm thấy nhiệm vụ');
          const previous = order.statusHistory.find(
            (item) => item.operationId === operationId,
          );
          const ownsCurrent = order.currentCollectorProfileId === profile.id;
          const ownsRetry =
            order.currentCollectorProfileId === null &&
            !!previous &&
            order.collectionAttempts.some(
              (attempt) => attempt.collectorProfileId === profile.id,
            );
          if (!ownsCurrent && !ownsRetry)
            throw new NotFoundException('Không tìm thấy nhiệm vụ');
          if (previous) {
            if (previous.status !== idempotentStatus)
              throw new ConflictException(
                'operationId đã được sử dụng cho thao tác khác',
              );
            return this.response(order);
          }
          if (order.version !== version) throw new ConflictException(STALE);
          await operation(tx, profile, order);
          const updated = await this.ownedOrder(tx, profile.id, code, true);
          return this.response(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002')
      )
        throw new ConflictException(STALE);
      throw error;
    }
  }
  private async profile(
    client: Prisma.TransactionClient | PrismaService,
    staffId: string,
  ) {
    const profile = await client.collectorProfile.findUnique({
      where: { staffUserId: staffId },
      include: { staffUser: true, serviceAreas: true },
    });
    if (
      !profile ||
      profile.staffUser.role !== StaffRole.COLLECTOR ||
      profile.staffUser.status !== StaffStatus.ACTIVE ||
      profile.operationalStatus === CollectorOperationalStatus.INACTIVE
    )
      throw new ForbiddenException('Collector profile is not active');
    return profile;
  }
  private async ownedOrder(
    client: Prisma.TransactionClient | PrismaService,
    profileId: string,
    code: string,
    allowCleared = false,
  ): Promise<DetailOrder> {
    const order = await client.order.findFirst({
      where: {
        orderCode: code.trim().toUpperCase(),
        ...(allowCleared ? {} : { currentCollectorProfileId: profileId }),
      },
      include: detailInclude,
    });
    if (
      !order ||
      (allowCleared &&
        order.collectionAttempts[0]?.collectorProfileId !== profileId)
    )
      throw new NotFoundException('Không tìm thấy nhiệm vụ');
    return order;
  }
  private async updateOrder(
    tx: Prisma.TransactionClient,
    order: DetailOrder,
    version: number,
    status: OrderStatus,
    clear = false,
  ) {
    const result = await tx.order.updateMany({
      where: {
        id: order.id,
        version,
        currentCollectorProfileId: order.currentCollectorProfileId,
      },
      data: {
        status,
        version: { increment: 1 },
        ...(clear ? { currentCollectorProfileId: null } : {}),
      },
    });
    if (result.count !== 1) throw new ConflictException(STALE);
  }
  private async event(
    tx: Prisma.TransactionClient,
    order: DetailOrder,
    staffId: string,
    status: OrderStatus,
    title: string,
    description: string,
    action: string,
    metadata: Prisma.InputJsonValue,
    operationId?: string,
  ) {
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status, title, description, operationId },
    });
    await tx.adminAuditLog.create({
      data: {
        staffUserId: staffId,
        action,
        entityType: 'ORDER',
        entityReference: order.orderCode,
        metadata,
      },
    });
  }
  private response(order: DetailOrder) {
    if (!order.appointment)
      throw new ConflictException('Đơn không có lịch hẹn');
    const attempt = order.collectionAttempts[0] ?? null;
    return {
      orderCode: order.orderCode,
      status: order.status,
      statusLabel: label(order.status),
      version: order.version,
      contact: { name: order.contactName, phone: order.contactPhone },
      subject: order.subject
        ? {
            fullName: order.subject.fullName,
            dateOfBirth: order.subject.dateOfBirth.toISOString().slice(0, 10),
            sex: order.subject.sex,
            relationshipToContact: order.subject.relationshipToContact,
          }
        : null,
      appointment: {
        scheduledDate: order.appointment.scheduledDate,
        timeSlot: order.appointment.timeSlot,
        province: order.appointment.province,
        district: order.appointment.district,
        ward: order.appointment.ward,
        addressLine: order.appointment.addressLine,
        note: order.appointment.note,
      },
      items: order.items.map((x) => ({
        testCode: x.testCodeSnapshot,
        testName: x.testNameSnapshot,
        specimenType: x.specimenTypeSnapshot,
        preparationInstruction: x.preparationInstructionSnapshot,
      })),
      specimens: order.specimens
        .filter((item) => item.status !== SpecimenStatus.CANCELLED)
        .map((item) => ({
          specimenCode: item.specimenCode,
          status: item.status,
          specimenType: item.specimenType,
          containerType: item.containerType,
          targetVolumeMl: item.targetVolumeMl?.toString() ?? null,
          collectedVolumeMl: item.collectedVolumeMl?.toString() ?? null,
          requiresManualReview: item.requiresManualReview,
          collectedAt: item.collectedAt,
          inTransitAt: item.inTransitAt,
          linkedTests: item.orderItems.map(({ orderItem }) => ({
            testCode: orderItem.testCodeSnapshot,
            testName: orderItem.testNameSnapshot,
          })),
        })),
      currentAttempt: attempt
        ? {
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            startedAt: attempt.startedAt,
            collectedAt: attempt.collectedAt,
            inTransitAt: attempt.inTransitAt,
            failedAt: attempt.failedAt,
          }
        : null,
      timeline: order.statusHistory.map((x) => ({
        status: x.status,
        title: x.title,
        description: x.description,
        occurredAt: x.occurredAt,
      })),
    };
  }
}

function terminal(status: CollectionAttemptStatus) {
  return (
    status === CollectionAttemptStatus.FAILED ||
    status === CollectionAttemptStatus.IN_TRANSIT
  );
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
function maskPhone(value: string) {
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}
function sanitize(
  value?: string,
  sensitiveValues: (string | null | undefined)[] = [],
) {
  let sanitized =
    value
      ?.replace(/<[^>]*>/g, '')
      .replace(/(?:\+84|0)(?:[ .()-]*\d){9,10}/g, '[REDACTED_PHONE]')
      .replace(
        /\b(?:password|token|cookie|authorization)\s*[:=]\s*\S+/gi,
        '[REDACTED_AUTH]',
      )
      .trim()
      .slice(0, 500) || null;
  if (!sanitized) return null;
  for (const sensitive of sensitiveValues) {
    if (!sensitive?.trim()) continue;
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
function label(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    PENDING_CONFIRMATION: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    COLLECTOR_ASSIGNED: 'Đã phân công',
    COLLECTOR_ON_THE_WAY: 'Đang di chuyển',
    COLLECTED: 'Đã lấy mẫu',
    IN_TRANSIT: 'Đang vận chuyển',
    RECEIVED_AT_LAB: 'Đã tiếp nhận tại phòng xét nghiệm',
    CANCELLED: 'Đã hủy',
  };
  return labels[status];
}
