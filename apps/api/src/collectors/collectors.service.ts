import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectorAssignmentAction,
  CollectorOperationalStatus,
  OrderStatus,
  Prisma,
  StaffRole,
  StaffStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminOrdersService } from '../admin-orders/admin-orders.service';
import {
  AssignCollectorDto,
  CollectorListQueryDto,
  EligibleCollectorsQueryDto,
  UnassignCollectorDto,
  UpdateCollectorStatusDto,
  UpdateServiceAreasDto,
} from './dto/collector.dto';
const STALE =
  'Đơn hàng đã được cập nhật bởi người khác. Vui lòng tải lại dữ liệu.';
const collectorInclude = {
  staffUser: true,
  serviceAreas: {
    orderBy: [
      { provinceNormalized: 'asc' as const },
      { districtNormalized: 'asc' as const },
    ],
  },
  _count: {
    select: {
      currentOrders: { where: { status: OrderStatus.COLLECTOR_ASSIGNED } },
    },
  },
} satisfies Prisma.CollectorProfileInclude;
const assignmentInclude = {
  appointment: true,
  currentCollector: true,
} satisfies Prisma.OrderInclude;
type AssignmentOrder = Prisma.OrderGetPayload<{
  include: typeof assignmentInclude;
}>;
type AssignableOrder = AssignmentOrder & {
  appointment: NonNullable<AssignmentOrder['appointment']>;
};
type CollectorCandidate = Prisma.CollectorProfileGetPayload<{
  include: { staffUser: true; serviceAreas: true };
}>;

@Injectable()
export class CollectorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminOrders: AdminOrdersService,
  ) {}
  async list(query: CollectorListQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.CollectorProfileWhereInput = {
      operationalStatus: query.operationalStatus,
      ...(search
        ? {
            OR: [
              { employeeCode: { contains: search, mode: 'insensitive' } },
              {
                staffUser: {
                  fullName: { contains: search, mode: 'insensitive' },
                },
              },
              {
                staffUser: { email: { contains: search, mode: 'insensitive' } },
              },
            ],
          }
        : {}),
      serviceAreas:
        query.province || query.district
          ? {
              some: {
                provinceNormalized: query.province
                  ? normalizeArea(query.province)
                  : undefined,
                districtNormalized: query.district
                  ? normalizeArea(query.district)
                  : undefined,
              },
            }
          : undefined,
    };
    const orderBy =
      query.sortBy === 'fullName'
        ? { staffUser: { fullName: query.sortOrder } }
        : { [query.sortBy]: query.sortOrder };
    const [collectors, total] = await this.prisma.transaction((tx) =>
      Promise.all([
        tx.collectorProfile.findMany({
          where,
          include: collectorInclude,
          orderBy,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        tx.collectorProfile.count({ where }),
      ]),
    );
    return {
      data: collectors.map((profile) => this.listItem(profile)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async detail(employeeCode: string) {
    const profile = await this.prisma.collectorProfile.findUnique({
      where: { employeeCode: normalizeCode(employeeCode) },
      include: collectorInclude,
    });
    if (!profile)
      throw new NotFoundException('Không tìm thấy nhân viên lấy mẫu');
    return {
      ...this.listItem(profile),
      phone: profile.phone,
      staffStatus: profile.staffUser.status,
      updatedAt: profile.updatedAt,
    };
  }
  async updateStatus(
    employeeCode: string,
    dto: UpdateCollectorStatusDto,
    staffUserId: string,
  ) {
    return this.prisma.transaction(async (tx) => {
      const profile = await tx.collectorProfile.findUnique({
        where: { employeeCode: normalizeCode(employeeCode) },
        include: {
          staffUser: true,
          _count: {
            select: {
              serviceAreas: true,
              currentOrders: {
                where: { status: OrderStatus.COLLECTOR_ASSIGNED },
              },
            },
          },
        },
      });
      if (!profile)
        throw new NotFoundException('Không tìm thấy nhân viên lấy mẫu');
      if (
        dto.operationalStatus === CollectorOperationalStatus.AVAILABLE &&
        profile.staffUser.status !== StaffStatus.ACTIVE
      )
        throw new ConflictException(
          'Không thể bật AVAILABLE cho tài khoản không hoạt động',
        );
      if (
        dto.operationalStatus === CollectorOperationalStatus.AVAILABLE &&
        profile._count.serviceAreas === 0
      )
        throw new ConflictException(
          'Nhân viên phải có khu vực phục vụ trước khi bật AVAILABLE',
        );
      const updated = await tx.collectorProfile.update({
        where: { id: profile.id },
        data: { operationalStatus: dto.operationalStatus },
      });
      await tx.adminAuditLog.create({
        data: {
          staffUserId,
          action: 'COLLECTOR_STATUS_UPDATED',
          entityType: 'COLLECTOR',
          entityReference: profile.employeeCode,
          metadata: {
            previousStatus: profile.operationalStatus,
            newStatus: dto.operationalStatus,
          },
        },
      });
      return {
        employeeCode: profile.employeeCode,
        operationalStatus: updated.operationalStatus,
        activeAssignmentCount: profile._count.currentOrders,
        warning:
          profile._count.currentOrders > 0
            ? `Nhân viên đang có ${profile._count.currentOrders} đơn được phân công.`
            : null,
      };
    });
  }
  async updateServiceAreas(
    employeeCode: string,
    dto: UpdateServiceAreasDto,
    staffUserId: string,
  ) {
    const areas = normalizeAreas(dto.serviceAreas);
    return this.prisma.transaction(async (tx) => {
      const profile = await tx.collectorProfile.findUnique({
        where: { employeeCode: normalizeCode(employeeCode) },
        include: { serviceAreas: true },
      });
      if (!profile)
        throw new NotFoundException('Không tìm thấy nhân viên lấy mẫu');
      if (
        profile.operationalStatus === CollectorOperationalStatus.AVAILABLE &&
        areas.length === 0
      )
        throw new BadRequestException(
          'Nhân viên AVAILABLE phải có ít nhất một khu vực phục vụ',
        );
      await tx.collectorServiceArea.deleteMany({
        where: { collectorProfileId: profile.id },
      });
      if (areas.length)
        await tx.collectorServiceArea.createMany({
          data: areas.map((area) => ({
            collectorProfileId: profile.id,
            ...area,
          })),
        });
      await tx.adminAuditLog.create({
        data: {
          staffUserId,
          action: 'COLLECTOR_SERVICE_AREAS_UPDATED',
          entityType: 'COLLECTOR',
          entityReference: profile.employeeCode,
          metadata: {
            previousAreas: profile.serviceAreas.map(areaPublic),
            newAreas: areas.map(areaPublic),
          },
        },
      });
      const updated = await tx.collectorProfile.findUnique({
        where: { id: profile.id },
        include: collectorInclude,
      });
      if (!updated)
        throw new NotFoundException('Không tìm thấy nhân viên lấy mẫu');
      return {
        ...this.listItem(updated),
        phone: updated.phone,
        staffStatus: updated.staffUser.status,
        updatedAt: updated.updatedAt,
      };
    });
  }
  async eligible(orderCode: string, query: EligibleCollectorsQueryDto) {
    const order = await this.assignmentOrder(this.prisma, orderCode);
    this.assertAssignableOrder(order);
    const range = localDayRange(order.appointment.scheduledDate);
    const search = query.search?.trim();
    const profiles = await this.prisma.collectorProfile.findMany({
      where: {
        ...(order.currentCollectorProfileId
          ? { id: { not: order.currentCollectorProfileId } }
          : {}),
        operationalStatus: CollectorOperationalStatus.AVAILABLE,
        staffUser: {
          role: StaffRole.COLLECTOR,
          status: StaffStatus.ACTIVE,
          ...(search
            ? {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        ...(search
          ? {
              OR: [
                { employeeCode: { contains: search, mode: 'insensitive' } },
                {
                  staffUser: {
                    fullName: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
        serviceAreas: {
          some: areaWhere(
            order.appointment.province,
            order.appointment.district,
          ),
        },
        currentOrders: {
          none: {
            id: { not: order.id },
            status: { not: OrderStatus.CANCELLED },
            appointment: {
              scheduledDate: range,
              timeSlot: order.appointment.timeSlot,
            },
          },
        },
      },
      include: { staffUser: true, serviceAreas: true },
      orderBy: { staffUser: { fullName: 'asc' } },
      take: 100,
    });
    return {
      data: profiles.map((profile) => ({
        employeeCode: profile.employeeCode,
        fullName: profile.staffUser.fullName,
        maskedPhone: maskPhone(profile.phone),
        serviceAreaMatch: true,
        isAvailable: true,
      })),
    };
  }
  assign(orderCode: string, dto: AssignCollectorDto, staffUserId: string) {
    return this.serialized(async (tx) => {
      const order = await this.assignmentOrder(tx, orderCode);
      this.assertAssignableOrder(order);
      if (order.version !== dto.expectedVersion)
        throw new ConflictException(STALE);
      const collector = await tx.collectorProfile.findUnique({
        where: { employeeCode: normalizeCode(dto.collectorEmployeeCode) },
        include: { staffUser: true, serviceAreas: true },
      });
      if (!collector)
        throw new BadRequestException('Nhân viên lấy mẫu không tồn tại');
      if (collector.id === order.currentCollectorProfileId)
        throw new ConflictException(
          'Nhân viên này đang được phân công cho đơn hàng',
        );
      this.assertEligibleCollector(collector, order);
      const range = localDayRange(order.appointment.scheduledDate);
      const conflict = await tx.order.findFirst({
        where: {
          id: { not: order.id },
          currentCollectorProfileId: collector.id,
          status: { not: OrderStatus.CANCELLED },
          appointment: {
            scheduledDate: range,
            timeSlot: order.appointment.timeSlot,
          },
        },
        select: { orderCode: true },
      });
      if (conflict)
        throw new ConflictException(
          'Nhân viên đã có lịch lấy mẫu trong khung giờ này',
        );
      const action = order.currentCollectorProfileId
        ? CollectorAssignmentAction.REASSIGNED
        : CollectorAssignmentAction.ASSIGNED;
      const updated = await tx.order.updateMany({
        where: { id: order.id, version: dto.expectedVersion },
        data: {
          currentCollectorProfileId: collector.id,
          status: OrderStatus.COLLECTOR_ASSIGNED,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new ConflictException(STALE);
      await tx.collectorAssignmentHistory.create({
        data: {
          orderId: order.id,
          collectorProfileId: collector.id,
          previousCollectorProfileId: order.currentCollectorProfileId,
          action,
          performedByStaffUserId: staffUserId,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.COLLECTOR_ASSIGNED,
          title:
            action === CollectorAssignmentAction.ASSIGNED
              ? 'Đã phân công nhân viên lấy mẫu'
              : 'Đã cập nhật nhân viên lấy mẫu',
          description:
            action === CollectorAssignmentAction.ASSIGNED
              ? 'HomeLab đã sắp xếp nhân viên thực hiện lịch lấy mẫu.'
              : 'HomeLab đã điều chỉnh nhân sự thực hiện lịch lấy mẫu.',
        },
      });
      await tx.adminAuditLog.create({
        data: {
          staffUserId,
          action:
            action === CollectorAssignmentAction.ASSIGNED
              ? 'ORDER_COLLECTOR_ASSIGNED'
              : 'ORDER_COLLECTOR_REASSIGNED',
          entityType: 'ORDER',
          entityReference: order.orderCode,
          metadata: {
            previousEmployeeCode: order.currentCollector?.employeeCode ?? null,
            newEmployeeCode: collector.employeeCode,
            previousStatus: order.status,
            newStatus: OrderStatus.COLLECTOR_ASSIGNED,
          },
        },
      });
    }).then(() => this.adminOrders.detail(orderCode));
  }
  unassign(orderCode: string, dto: UnassignCollectorDto, staffUserId: string) {
    return this.serialized(async (tx) => {
      const order = await this.assignmentOrder(tx, orderCode);
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      if (order.version !== dto.expectedVersion)
        throw new ConflictException(STALE);
      if (
        order.status !== OrderStatus.COLLECTOR_ASSIGNED ||
        !order.currentCollector
      )
        throw new ConflictException(
          'Đơn hàng chưa có nhân viên để gỡ phân công',
        );
      const updated = await tx.order.updateMany({
        where: { id: order.id, version: dto.expectedVersion },
        data: {
          currentCollectorProfileId: null,
          status: OrderStatus.CONFIRMED,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new ConflictException(STALE);
      const reason = sanitizeReason(dto.reason);
      await tx.collectorAssignmentHistory.create({
        data: {
          orderId: order.id,
          collectorProfileId: null,
          previousCollectorProfileId: order.currentCollector.id,
          action: CollectorAssignmentAction.UNASSIGNED,
          performedByStaffUserId: staffUserId,
          reason,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CONFIRMED,
          title: 'Đã cập nhật phân công lấy mẫu',
          description:
            'HomeLab đang sắp xếp lại nhân viên thực hiện lịch lấy mẫu.',
        },
      });
      await tx.adminAuditLog.create({
        data: {
          staffUserId,
          action: 'ORDER_COLLECTOR_UNASSIGNED',
          entityType: 'ORDER',
          entityReference: order.orderCode,
          metadata: {
            previousEmployeeCode: order.currentCollector.employeeCode,
            newEmployeeCode: null,
            previousStatus: order.status,
            newStatus: OrderStatus.CONFIRMED,
            reason,
          },
        },
      });
    }).then(() => this.adminOrders.detail(orderCode));
  }
  private assignmentOrder(
    client: Pick<Prisma.TransactionClient, 'order'> | PrismaService,
    orderCode: string,
  ): Promise<AssignmentOrder | null> {
    return client.order.findUnique({
      where: { orderCode: normalizeCode(orderCode) },
      include: assignmentInclude,
    });
  }
  private assertAssignableOrder(
    order: AssignmentOrder | null,
  ): asserts order is AssignableOrder {
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.COLLECTOR_ASSIGNED
    )
      throw new ConflictException(
        'Trạng thái đơn hàng không cho phép phân công',
      );
    if (!order.appointment || order.appointment.status === 'CANCELLED')
      throw new ConflictException('Lịch hẹn không còn hợp lệ');
  }
  private assertEligibleCollector(
    profile: CollectorCandidate,
    order: AssignableOrder,
  ) {
    if (
      profile.operationalStatus !== CollectorOperationalStatus.AVAILABLE ||
      profile.staffUser.role !== StaffRole.COLLECTOR ||
      profile.staffUser.status !== StaffStatus.ACTIVE
    )
      throw new ConflictException('Nhân viên không ở trạng thái sẵn sàng');
    const province = normalizeArea(order.appointment.province),
      district = normalizeArea(order.appointment.district);
    if (
      !profile.serviceAreas.some(
        (area) =>
          area.provinceNormalized === province &&
          (area.districtNormalized === null ||
            area.districtNormalized === district),
      )
    )
      throw new ConflictException(
        'Nhân viên không phục vụ khu vực của lịch hẹn',
      );
  }
  private async serialized(
    operation: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    try {
      await this.prisma.transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      )
        throw new ConflictException(
          'Dữ liệu phân công vừa thay đổi. Vui lòng thử lại.',
        );
      throw error;
    }
  }
  private listItem(
    profile: Prisma.CollectorProfileGetPayload<{
      include: typeof collectorInclude;
    }>,
  ) {
    return {
      employeeCode: profile.employeeCode,
      fullName: profile.staffUser.fullName,
      email: profile.staffUser.email,
      maskedPhone: maskPhone(profile.phone),
      operationalStatus: profile.operationalStatus,
      serviceAreas: profile.serviceAreas.map(areaPublic),
      activeAssignmentCount: profile._count.currentOrders,
      createdAt: profile.createdAt,
    };
  }
}
function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}
function normalizePhone(value: string) {
  const compact = value.trim().replace(/[ .()-]/g, '');
  return compact.startsWith('+84') ? `0${compact.slice(3)}` : compact;
}
function maskPhone(value: string) {
  const phone = normalizePhone(value);
  return `${'*'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}`;
}
function normalizeArea(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi');
}
function normalizeAreas(input: UpdateServiceAreasDto['serviceAreas']) {
  const map = new Map<
    string,
    {
      province: string;
      district: string | null;
      provinceNormalized: string;
      districtNormalized: string | null;
    }
  >();
  for (const item of input) {
    const province = item.province.trim().replace(/\s+/g, ' '),
      district = item.district?.trim().replace(/\s+/g, ' ') || null;
    const area = {
      province,
      district,
      provinceNormalized: normalizeArea(province),
      districtNormalized: district ? normalizeArea(district) : null,
    };
    map.set(
      `${area.provinceNormalized}|${area.districtNormalized ?? ''}`,
      area,
    );
  }
  return [...map.values()];
}
function areaPublic(area: { province: string; district: string | null }) {
  return { province: area.province, district: area.district };
}
function areaWhere(province: string, district: string) {
  return {
    provinceNormalized: normalizeArea(province),
    OR: [
      { districtNormalized: null },
      { districtNormalized: normalizeArea(district) },
    ],
  };
}
function localDayRange(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return {
    gte: new Date(`${parts}T00:00:00+07:00`),
    lt: new Date(new Date(`${parts}T00:00:00+07:00`).getTime() + 86_400_000),
  };
}
function sanitizeReason(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/(?:\+84|0)(?:[ .()-]*\d){9,10}/g, '[REDACTED_PHONE]')
    .replace(
      /\b(?:password|token|cookie|authorization)\s*[:=]\s*\S+/gi,
      '[REDACTED_AUTH]',
    )
    .trim()
    .slice(0, 500);
}
