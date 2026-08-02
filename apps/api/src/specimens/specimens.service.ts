import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CustodyActorType,
  OrderStatus,
  Prisma,
  SpecimenCustodyEventType,
  SpecimenRejectionReason,
  SpecimenStatus,
  StaffRole,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedStaff } from '../staff-auth/staff-request';
import {
  LabSpecimenListQueryDto,
  LabelsPrintedDto,
  PrepareSpecimensDto,
  ReceiveSpecimenDto,
  RejectSpecimenDto,
  ScanSpecimenDto,
  VersionedOperationDto,
} from './dto/specimen.dto';

const STALE = 'Dữ liệu đã thay đổi. Vui lòng tải lại trước khi tiếp tục.';
const specimenDetailInclude = {
  order: { include: { subject: true, appointment: true } },
  orderItems: {
    include: { orderItem: true },
    orderBy: { createdAt: 'asc' as const },
  },
  custodyEvents: {
    include: {
      actorCollectorProfile: { select: { employeeCode: true } },
    },
    orderBy: [{ occurredAt: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.SpecimenInclude;
type DetailedSpecimen = Prisma.SpecimenGetPayload<{
  include: typeof specimenDetailInclude;
}>;

const planInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
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
type PlanOrder = Prisma.OrderGetPayload<{ include: typeof planInclude }>;

type PlanItem = PlanOrder['items'][number];
type PlanGroup = {
  items: PlanItem[];
  specimenType: string;
  containerType: string;
  collectionGroupKey: string | null;
  targetVolumeMl: Prisma.Decimal | null;
  requiresManualReview: boolean;
};

@Injectable()
export class SpecimensService {
  constructor(private readonly prisma: PrismaService) {}

  prepare(
    orderCode: string,
    dto: PrepareSpecimensDto,
    staff: AuthenticatedStaff,
  ) {
    return this.serialized(async (tx) => {
      const code = normalizeCode(orderCode);
      let order = await tx.order.findUnique({
        where: { orderCode: code },
        include: planInclude,
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

      const retry = await tx.specimenCustodyEvent.findFirst({
        where: {
          operationId: dto.operationId,
          eventType: SpecimenCustodyEventType.SPECIMEN_PLANNED,
          specimen: { orderId: order.id },
        },
      });
      if (retry) return planResponse(order);

      if (order.version !== dto.expectedVersion)
        throw new ConflictException(STALE);
      if (
        order.status === OrderStatus.PENDING_CONFIRMATION ||
        order.status === OrderStatus.CANCELLED
      )
        throw new ConflictException(
          'Đơn phải được xác nhận trước khi chuẩn bị bệnh phẩm',
        );
      if (order.specimens.length)
        throw new ConflictException('Đơn đã có kế hoạch bệnh phẩm');
      if (!order.items.length)
        throw new ConflictException('Đơn không có xét nghiệm');

      const groups = buildPlan(order.items);
      for (const group of groups) {
        const specimen = await tx.specimen.create({
          data: {
            specimenCode: specimenCode(),
            barcodeValue: barcodeValue(),
            orderId: order.id,
            status: SpecimenStatus.LABELED,
            specimenType: group.specimenType,
            containerType: group.containerType,
            collectionGroupKey: group.collectionGroupKey,
            targetVolumeMl: group.targetVolumeMl,
            requiresManualReview: group.requiresManualReview,
            orderItems: {
              create: group.items.map((item) => ({ orderItemId: item.id })),
            },
            custodyEvents: {
              create: [
                {
                  eventType: SpecimenCustodyEventType.SPECIMEN_PLANNED,
                  actorType: actorType(staff.role),
                  actorStaffUserId: staff.id,
                  operationId: dto.operationId,
                  metadata: {
                    fromStatus: SpecimenStatus.PLANNED,
                    toStatus: SpecimenStatus.LABELED,
                  },
                },
                {
                  eventType: SpecimenCustodyEventType.LABEL_GENERATED,
                  actorType: actorType(staff.role),
                  actorStaffUserId: staff.id,
                  operationId: dto.operationId,
                  metadata: { symbology: 'CODE_128' },
                },
              ],
            },
          },
        });
        if (!specimen) throw new ConflictException('Không thể tạo bệnh phẩm');
      }

      const updated = await tx.order.updateMany({
        where: { id: order.id, version: dto.expectedVersion },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException(STALE);
      await tx.adminAuditLog.create({
        data: {
          staffUserId: staff.id,
          action: 'SPECIMEN_PLAN_CREATED',
          entityType: 'ORDER',
          entityReference: order.orderCode,
          metadata: { specimenCount: groups.length },
        },
      });
      order = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: planInclude,
      });
      return planResponse(order);
    });
  }

  async labels(orderCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderCode: normalizeCode(orderCode) },
      include: { specimens: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (!order.specimens.length)
      throw new ConflictException('Đơn chưa có kế hoạch bệnh phẩm');
    return {
      orderCode: order.orderCode,
      labels: order.specimens
        .filter((item) => item.status !== SpecimenStatus.CANCELLED)
        .map((item) => ({
          specimenCode: item.specimenCode,
          barcodeValue: item.barcodeValue,
          symbology: 'CODE_128' as const,
          specimenType: item.specimenType,
          containerType: item.containerType,
          targetVolumeMl: decimal(item.targetVolumeMl),
          labelCount: 1,
        })),
    };
  }

  recordPrinted(
    orderCode: string,
    dto: LabelsPrintedDto,
    staff: AuthenticatedStaff,
  ) {
    return this.serialized(async (tx) => {
      const order = await tx.order.findUnique({
        where: { orderCode: normalizeCode(orderCode) },
        include: { specimens: true },
      });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      const requested = new Set(dto.specimenCodes.map(normalizeCode));
      const specimens = order.specimens.filter((item) =>
        requested.has(item.specimenCode),
      );
      if (specimens.length !== requested.size)
        throw new BadRequestException(
          'Một hoặc nhiều mã bệnh phẩm không thuộc đơn hàng',
        );
      if (specimens.some((item) => item.status === SpecimenStatus.CANCELLED))
        throw new ConflictException('Không thể in nhãn bệnh phẩm đã hủy');

      const existing = await tx.specimenCustodyEvent.findMany({
        where: {
          operationId: dto.operationId,
          eventType: SpecimenCustodyEventType.LABEL_PRINTED,
          specimen: { orderId: order.id },
        },
      });
      if (existing.length) {
        const existingIds = new Set(existing.map((event) => event.specimenId));
        if (
          existing.length !== specimens.length ||
          specimens.some((item) => !existingIds.has(item.id)) ||
          existing.some(
            (event) =>
              metadataValue(event.metadata, 'printCount') !== dto.printCount,
          )
        )
          throw new ConflictException(
            'operationId đã được dùng cho yêu cầu in khác',
          );
        return {
          orderCode: order.orderCode,
          recorded: existing.length,
          idempotent: true,
        };
      }

      await tx.specimenCustodyEvent.createMany({
        data: specimens.map((item) => ({
          specimenId: item.id,
          eventType: SpecimenCustodyEventType.LABEL_PRINTED,
          actorType: actorType(staff.role),
          actorStaffUserId: staff.id,
          operationId: dto.operationId,
          metadata: { printCount: dto.printCount },
        })),
      });
      await tx.adminAuditLog.create({
        data: {
          staffUserId: staff.id,
          action: 'SPECIMEN_LABELS_PRINTED',
          entityType: 'ORDER',
          entityReference: order.orderCode,
          metadata: {
            specimenCodes: specimens.map((item) => item.specimenCode),
            printCount: dto.printCount,
          },
        },
      });
      return {
        orderCode: order.orderCode,
        recorded: specimens.length,
        idempotent: false,
      };
    });
  }

  async labSummary() {
    const today = localDayRange(new Date());
    const [inTransit, receivedToday, rejectedToday, recollection] =
      await this.prisma.transaction((tx) =>
        Promise.all([
          tx.specimen.count({ where: { status: SpecimenStatus.IN_TRANSIT } }),
          tx.specimen.count({ where: { receivedAt: today } }),
          tx.specimen.count({
            where: { status: SpecimenStatus.REJECTED, rejectedAt: today },
          }),
          tx.order.count({
            where: {
              requiresRecollection: true,
              status: { not: OrderStatus.CANCELLED },
            },
          }),
        ]),
      );
    return {
      inTransit,
      receivedToday,
      rejectedToday,
      ordersRequiringRecollection: recollection,
    };
  }

  async labList(query: LabSpecimenListQueryDto) {
    const where = { status: query.status } satisfies Prisma.SpecimenWhereInput;
    const [items, total] = await this.prisma.transaction((tx) =>
      Promise.all([
        tx.specimen.findMany({
          where,
          include: { order: { select: { orderCode: true } } },
          orderBy: { updatedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.specimen.count({ where }),
      ]),
    );
    return {
      data: items.map((item) => ({
        specimenCode: item.specimenCode,
        status: item.status,
        version: item.version,
        specimenType: item.specimenType,
        containerType: item.containerType,
        orderCode: item.order.orderCode,
        requiresManualReview: item.requiresManualReview,
        recollectionRequired: item.recollectionRequired,
        receivedAt: item.receivedAt,
        rejectedAt: item.rejectedAt,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async scan(dto: ScanSpecimenDto) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { barcodeValue: dto.barcodeValue.trim() },
      include: specimenDetailInclude,
    });
    if (!specimen)
      throw new NotFoundException('Không tìm thấy bệnh phẩm phù hợp');
    return specimenResponse(specimen, false);
  }

  async labDetail(specimenCodeValue: string) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { specimenCode: normalizeCode(specimenCodeValue) },
      include: specimenDetailInclude,
    });
    if (!specimen) throw new NotFoundException('Không tìm thấy bệnh phẩm');
    return specimenResponse(specimen, true);
  }

  receive(
    specimenCodeValue: string,
    dto: ReceiveSpecimenDto,
    staff: AuthenticatedStaff,
  ) {
    if (
      !dto.assessment.labelLegible ||
      !dto.assessment.containerIntact ||
      !dto.assessment.transportConditionAcceptable
    )
      throw new ConflictException(
        'Đánh giá không đạt phải sử dụng quy trình từ chối bệnh phẩm',
      );
    return this.mutateSpecimen(
      specimenCodeValue,
      dto,
      staff,
      SpecimenCustodyEventType.RECEIVED_AT_LAB,
      async (tx, specimen) => {
        if (specimen.status !== SpecimenStatus.IN_TRANSIT)
          throw new ConflictException(
            'Chỉ có thể tiếp nhận bệnh phẩm đang vận chuyển',
          );
        const now = new Date();
        await updateSpecimen(tx, specimen, dto.expectedVersion, {
          status: SpecimenStatus.RECEIVED,
          receivedAt: now,
          receivedByStaffUserId: staff.id,
        });
        await custody(tx, specimen, dto.operationId, staff, {
          eventType: SpecimenCustodyEventType.RECEIVED_AT_LAB,
          metadata: {
            fromStatus: SpecimenStatus.IN_TRANSIT,
            toStatus: SpecimenStatus.RECEIVED,
            labelLegible: true,
            containerIntact: true,
            transportConditionAcceptable: true,
            measuredTemperatureC: dto.assessment.measuredTemperatureC ?? null,
          },
        });
        await evaluateOrder(tx, specimen.orderId);
      },
      'SPECIMEN_RECEIVED',
    );
  }

  accept(
    specimenCodeValue: string,
    dto: VersionedOperationDto,
    staff: AuthenticatedStaff,
  ) {
    return this.mutateSpecimen(
      specimenCodeValue,
      dto,
      staff,
      SpecimenCustodyEventType.SPECIMEN_ACCEPTED,
      async (tx, specimen) => {
        if (specimen.status !== SpecimenStatus.RECEIVED)
          throw new ConflictException(
            'Chỉ có thể chấp nhận bệnh phẩm đã tiếp nhận',
          );
        await updateSpecimen(tx, specimen, dto.expectedVersion, {
          status: SpecimenStatus.ACCEPTED,
          acceptedAt: new Date(),
        });
        await custody(tx, specimen, dto.operationId, staff, {
          eventType: SpecimenCustodyEventType.SPECIMEN_ACCEPTED,
          metadata: {
            fromStatus: SpecimenStatus.RECEIVED,
            toStatus: SpecimenStatus.ACCEPTED,
          },
        });
        await evaluateOrder(tx, specimen.orderId);
      },
      'SPECIMEN_ACCEPTED',
    );
  }

  reject(
    specimenCodeValue: string,
    dto: RejectSpecimenDto,
    staff: AuthenticatedStaff,
  ) {
    const validatedNote = sanitizeNote(dto.note);
    if (dto.reason === SpecimenRejectionReason.OTHER && !validatedNote)
      throw new BadRequestException('Lý do OTHER bắt buộc phải có ghi chú');
    return this.mutateSpecimen(
      specimenCodeValue,
      dto,
      staff,
      SpecimenCustodyEventType.SPECIMEN_REJECTED,
      async (tx, specimen) => {
        if (
          specimen.status !== SpecimenStatus.IN_TRANSIT &&
          specimen.status !== SpecimenStatus.RECEIVED
        )
          throw new ConflictException(
            'Trạng thái bệnh phẩm không cho phép từ chối',
          );
        const now = new Date();
        const fromStatus = specimen.status;
        const note = sanitizeNote(dto.note, [
          specimen.order.contactName,
          specimen.order.contactPhone,
          specimen.order.subject?.fullName,
          specimen.order.appointment?.addressLine,
        ]);
        await updateSpecimen(tx, specimen, dto.expectedVersion, {
          status: SpecimenStatus.REJECTED,
          rejectedAt: now,
          rejectionReason: dto.reason,
          rejectionNote: note,
          recollectionRequired: dto.recollectionRequired,
          receivedAt: specimen.receivedAt ?? now,
          receivedByStaffUserId: staff.id,
        });
        if (fromStatus === SpecimenStatus.IN_TRANSIT)
          await custody(tx, specimen, dto.operationId, staff, {
            eventType: SpecimenCustodyEventType.RECEIVED_AT_LAB,
            metadata: {
              fromStatus: SpecimenStatus.IN_TRANSIT,
              toStatus: SpecimenStatus.REJECTED,
            },
          });
        await custody(tx, specimen, dto.operationId, staff, {
          eventType: SpecimenCustodyEventType.SPECIMEN_REJECTED,
          metadata: {
            fromStatus,
            toStatus: SpecimenStatus.REJECTED,
            reason: dto.reason,
            recollectionRequired: dto.recollectionRequired,
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: specimen.orderId,
            status: specimen.order.status,
            title: 'Bệnh phẩm cần được xử lý lại',
            description:
              'Một bệnh phẩm cần được xử lý lại. HomeLab sẽ liên hệ để hỗ trợ.',
          },
        });
        await evaluateOrder(tx, specimen.orderId);
      },
      'SPECIMEN_REJECTED',
      { reason: dto.reason, recollectionRequired: dto.recollectionRequired },
    );
  }

  private mutateSpecimen(
    specimenCodeValue: string,
    dto: VersionedOperationDto,
    staff: AuthenticatedStaff,
    idempotencyEvent: SpecimenCustodyEventType,
    operation: (
      tx: Prisma.TransactionClient,
      specimen: DetailedSpecimen,
    ) => Promise<void>,
    auditAction: string,
    auditMetadata: Prisma.InputJsonValue = {},
  ) {
    return this.serialized(async (tx) => {
      let specimen = await tx.specimen.findUnique({
        where: { specimenCode: normalizeCode(specimenCodeValue) },
        include: specimenDetailInclude,
      });
      if (!specimen) throw new NotFoundException('Không tìm thấy bệnh phẩm');
      const retry = specimen.custodyEvents.some(
        (event) =>
          event.operationId === dto.operationId &&
          event.eventType === idempotencyEvent,
      );
      if (retry) return specimenResponse(specimen, true);
      if (specimen.version !== dto.expectedVersion)
        throw new ConflictException(STALE);
      await operation(tx, specimen);
      await tx.adminAuditLog.create({
        data: {
          staffUserId: staff.id,
          action: auditAction,
          entityType: 'SPECIMEN',
          entityReference: specimen.specimenCode,
          metadata: auditMetadata,
        },
      });
      specimen = await tx.specimen.findUniqueOrThrow({
        where: { id: specimen.id },
        include: specimenDetailInclude,
      });
      return specimenResponse(specimen, true);
    });
  }

  private async serialized<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002')
      )
        throw new ConflictException(STALE);
      throw error;
    }
  }
}

function buildPlan(items: PlanItem[]): PlanGroup[] {
  const keyed = new Map<string, PlanItem[]>();
  const result: PlanGroup[] = [];
  for (const item of items) {
    const key = normalizeGroup(item.collectionGroupKeySnapshot);
    if (!key) {
      result.push(singleManual(item));
      continue;
    }
    const current = keyed.get(key) ?? [];
    current.push(item);
    keyed.set(key, current);
  }
  for (const [key, grouped] of keyed) {
    const first = grouped[0];
    const firstVolume = decimal(first.targetCollectionVolumeMlSnapshot);
    const inconsistent = grouped.some(
      (item) =>
        item.specimenTypeSnapshot !== first.specimenTypeSnapshot ||
        item.containerTypeSnapshot !== first.containerTypeSnapshot ||
        decimal(item.targetCollectionVolumeMlSnapshot) !== firstVolume,
    );
    if (inconsistent)
      throw new ConflictException(
        `Cấu hình collectionGroupKey ${key} không nhất quán`,
      );
    if (!first.targetCollectionVolumeMlSnapshot) {
      result.push(...grouped.map(singleManual));
      continue;
    }
    result.push({
      items: grouped,
      specimenType: first.specimenTypeSnapshot,
      containerType: first.containerTypeSnapshot,
      collectionGroupKey: key,
      targetVolumeMl: first.targetCollectionVolumeMlSnapshot,
      requiresManualReview: false,
    });
  }
  return result;
}

function singleManual(item: PlanItem): PlanGroup {
  return {
    items: [item],
    specimenType: item.specimenTypeSnapshot,
    containerType: item.containerTypeSnapshot,
    collectionGroupKey: normalizeGroup(item.collectionGroupKeySnapshot),
    targetVolumeMl: item.targetCollectionVolumeMlSnapshot,
    requiresManualReview: true,
  };
}

async function updateSpecimen(
  tx: Prisma.TransactionClient,
  specimen: DetailedSpecimen,
  version: number,
  data: Prisma.SpecimenUncheckedUpdateManyInput,
) {
  const updated = await tx.specimen.updateMany({
    where: { id: specimen.id, version },
    data: { ...data, version: { increment: 1 } },
  });
  if (updated.count !== 1) throw new ConflictException(STALE);
}

async function custody(
  tx: Prisma.TransactionClient,
  specimen: DetailedSpecimen,
  operationId: string,
  staff: AuthenticatedStaff,
  input: {
    eventType: SpecimenCustodyEventType;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await tx.specimenCustodyEvent.create({
    data: {
      specimenId: specimen.id,
      eventType: input.eventType,
      actorType: CustodyActorType.LAB_STAFF,
      actorStaffUserId: staff.id,
      operationId,
      metadata: input.metadata,
    },
  });
}

async function evaluateOrder(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      specimens: { where: { status: { not: SpecimenStatus.CANCELLED } } },
    },
  });
  const arrivedStatuses: SpecimenStatus[] = [
    SpecimenStatus.RECEIVED,
    SpecimenStatus.ACCEPTED,
    SpecimenStatus.REJECTED,
  ];
  const allArrived =
    order.specimens.length > 0 &&
    order.specimens.every((item) => arrivedStatuses.includes(item.status));
  const requiresRecollection = order.specimens.some(
    (item) =>
      item.status === SpecimenStatus.REJECTED && item.recollectionRequired,
  );
  const transition =
    allArrived && order.status === OrderStatus.IN_TRANSIT
      ? OrderStatus.RECEIVED_AT_LAB
      : order.status;
  if (
    transition === order.status &&
    requiresRecollection === order.requiresRecollection
  )
    return;
  const updated = await tx.order.updateMany({
    where: { id: order.id, version: order.version },
    data: {
      status: transition,
      requiresRecollection,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new ConflictException(STALE);
  if (transition !== order.status)
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: OrderStatus.RECEIVED_AT_LAB,
        title: 'Mẫu đã được tiếp nhận tại phòng xét nghiệm',
        description:
          'Các bệnh phẩm của đơn đã được tiếp nhận tại phòng xét nghiệm.',
      },
    });
}

function planResponse(order: PlanOrder) {
  return {
    orderCode: order.orderCode,
    version: order.version,
    specimens: order.specimens
      .filter((item) => item.status !== SpecimenStatus.CANCELLED)
      .map((item) => ({
        specimenCode: item.specimenCode,
        status: item.status,
        specimenType: item.specimenType,
        containerType: item.containerType,
        targetVolumeMl: decimal(item.targetVolumeMl),
        requiresManualReview: item.requiresManualReview,
        linkedTests: item.orderItems.map(({ orderItem }) => ({
          testCode: orderItem.testCodeSnapshot,
          testName: orderItem.testNameSnapshot,
        })),
      })),
  };
}

function specimenResponse(
  specimen: DetailedSpecimen,
  includeTimeline: boolean,
) {
  if (!specimen.order.subject)
    throw new ConflictException('Đơn thiếu thông tin người xét nghiệm');
  return {
    specimenCode: specimen.specimenCode,
    status: specimen.status,
    version: specimen.version,
    specimenType: specimen.specimenType,
    containerType: specimen.containerType,
    targetVolumeMl: decimal(specimen.targetVolumeMl),
    collectedVolumeMl: decimal(specimen.collectedVolumeMl),
    orderCode: specimen.order.orderCode,
    subject: {
      displayName: specimen.order.subject.fullName,
      dateOfBirth: specimen.order.subject.dateOfBirth
        .toISOString()
        .slice(0, 10),
    },
    linkedTests: specimen.orderItems.map(({ orderItem }) => ({
      testCode: orderItem.testCodeSnapshot,
      testName: orderItem.testNameSnapshot,
    })),
    collectedAt: specimen.collectedAt,
    inTransitAt: specimen.inTransitAt,
    receivedAt: specimen.receivedAt,
    acceptedAt: specimen.acceptedAt,
    rejectedAt: specimen.rejectedAt,
    ...(includeTimeline
      ? {
          rejectionReason: specimen.rejectionReason,
          rejectionNote: specimen.rejectionNote,
          recollectionRequired: specimen.recollectionRequired,
        }
      : {}),
    ...(includeTimeline
      ? {
          custodyTimeline: [...specimen.custodyEvents]
            .sort(custodyEventOrder)
            .map((event) => ({
              eventType: event.eventType,
              title: custodyText(event.eventType),
              actorType: event.actorType,
              actorEmployeeCode:
                event.actorCollectorProfile?.employeeCode ?? null,
              occurredAt: event.occurredAt,
              metadata: safeMetadata(event.metadata),
            })),
        }
      : {}),
  };
}

function safeMetadata(value: Prisma.JsonValue): Prisma.JsonValue {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  const allowed = new Set([
    'fromStatus',
    'toStatus',
    'reason',
    'recollectionRequired',
    'printCount',
    'symbology',
    'labelLegible',
    'containerIntact',
    'transportConditionAcceptable',
    'measuredTemperatureC',
  ]);
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => allowed.has(key)),
  );
}

function metadataValue(value: Prisma.JsonValue, key: string) {
  if (!value || Array.isArray(value) || typeof value !== 'object')
    return undefined;
  return value[key];
}

function custodyText(event: SpecimenCustodyEventType) {
  const labels: Record<SpecimenCustodyEventType, string> = {
    SPECIMEN_PLANNED: 'Đã lập kế hoạch bệnh phẩm',
    LABEL_GENERATED: 'Đã tạo nhãn barcode',
    LABEL_PRINTED: 'Đã ghi nhận in nhãn',
    SPECIMEN_COLLECTED: 'Đã lấy bệnh phẩm',
    HANDED_TO_TRANSPORT: 'Đã bàn giao vận chuyển',
    RECEIVED_AT_LAB: 'Đã tiếp nhận tại phòng xét nghiệm',
    SPECIMEN_ACCEPTED: 'Bệnh phẩm được chấp nhận',
    SPECIMEN_REJECTED: 'Bệnh phẩm bị từ chối',
  };
  return labels[event];
}

function custodyEventOrder(
  left: DetailedSpecimen['custodyEvents'][number],
  right: DetailedSpecimen['custodyEvents'][number],
) {
  const byTime = left.occurredAt.getTime() - right.occurredAt.getTime();
  return byTime || custodyRank(left.eventType) - custodyRank(right.eventType);
}

function custodyRank(type: SpecimenCustodyEventType) {
  return [
    SpecimenCustodyEventType.SPECIMEN_PLANNED,
    SpecimenCustodyEventType.LABEL_GENERATED,
    SpecimenCustodyEventType.LABEL_PRINTED,
    SpecimenCustodyEventType.SPECIMEN_COLLECTED,
    SpecimenCustodyEventType.HANDED_TO_TRANSPORT,
    SpecimenCustodyEventType.RECEIVED_AT_LAB,
    SpecimenCustodyEventType.SPECIMEN_ACCEPTED,
    SpecimenCustodyEventType.SPECIMEN_REJECTED,
  ].indexOf(type);
}

function actorType(role: StaffRole) {
  return role === StaffRole.ADMIN
    ? CustodyActorType.ADMIN
    : CustodyActorType.LAB_STAFF;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeGroup(value: string | null) {
  return value?.trim().toUpperCase() || null;
}

function specimenCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `SPC-${date}-${randomBytes(5).toString('hex').toUpperCase()}`;
}

function barcodeValue() {
  return randomBytes(24).toString('base64url');
}

function decimal(value: Prisma.Decimal | null) {
  return value?.toString() ?? null;
}

function sanitizeNote(
  value?: string,
  sensitiveValues: (string | null | undefined)[] = [],
) {
  let sanitized =
    value
      ?.replace(/<[^>]*>/g, '')
      .replace(/(?:\+84|0)(?:[ .()-]*\d){9,10}/g, '[REDACTED_PHONE]')
      .replace(
        /\b(?:password|token|cookie|authorization|session)\s*[:=]\s*\S+/gi,
        '[REDACTED_AUTH]',
      )
      .trim()
      .slice(0, 500) || null;
  if (!sanitized) return null;
  for (const sensitive of sensitiveValues) {
    if (!sensitive?.trim()) continue;
    sanitized = sanitized.replace(
      new RegExp(escapeRegExp(sensitive.trim()), 'gi'),
      '[REDACTED_SUBJECT]',
    );
  }
  return sanitized;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
