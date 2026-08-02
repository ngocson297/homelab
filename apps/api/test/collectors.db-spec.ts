import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { CollectorsService } from '../src/collectors/collectors.service';
import {
  CollectorOperationalStatus,
  OrderStatus,
  StaffRole,
  StaffStatus,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrdersService } from '../src/orders/orders.service';

describe('Collector management and assignment (PostgreSQL)', () => {
  let module: TestingModule,
    prisma: PrismaService,
    service: CollectorsService,
    orders: OrdersService;
  const staffIds: string[] = [],
    orderIds: string[] = [];
  let adminId = '',
    firstCode = '',
    secondCode = '',
    offCode = '',
    otherCode = '';
  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = module.get(PrismaService);
    service = module.get(CollectorsService);
    orders = module.get(OrdersService);
    adminId = await createStaff(StaffRole.ADMIN, 'Ticket 10 Admin');
    const tag = randomUUID().slice(0, 6).toUpperCase();
    firstCode = await createCollector(
      `COL-${tag}-A`,
      CollectorOperationalStatus.AVAILABLE,
      'Synthetic Province',
      'Synthetic District',
    );
    secondCode = await createCollector(
      `COL-${tag}-B`,
      CollectorOperationalStatus.AVAILABLE,
      'Synthetic Province',
      null,
    );
    offCode = await createCollector(
      `COL-${tag}-OFF`,
      CollectorOperationalStatus.OFF_DUTY,
      'Synthetic Province',
      null,
    );
    otherCode = await createCollector(
      `COL-${tag}-OTHER`,
      CollectorOperationalStatus.AVAILABLE,
      'Other Province',
      null,
    );
  });
  afterAll(async () => {
    await prisma.transaction(async (tx) => {
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      await tx.adminAuditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await tx.collectorProfile.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await tx.staffUser.deleteMany({ where: { id: { in: staffIds } } });
    });
    await module.close();
  });
  async function createStaff(role: StaffRole, name: string) {
    const staff = await prisma.staffUser.create({
      data: {
        email: `${randomUUID()}@example.test`,
        passwordHash: 'synthetic-hash',
        fullName: name,
        role,
        status: StaffStatus.ACTIVE,
      },
    });
    staffIds.push(staff.id);
    return staff.id;
  }
  async function createCollector(
    code: string,
    status: CollectorOperationalStatus,
    province: string,
    district: string | null,
  ) {
    const staffId = await createStaff(StaffRole.COLLECTOR, `Synthetic ${code}`);
    await prisma.collectorProfile.create({
      data: {
        staffUserId: staffId,
        employeeCode: code,
        phone: '0900009876',
        phoneNormalized: '0900009876',
        operationalStatus: status,
        serviceAreas: {
          create: {
            province,
            district,
            provinceNormalized: province.toLowerCase(),
            districtNormalized: district?.toLowerCase() ?? null,
          },
        },
      },
    });
    return code;
  }
  async function createOrder(
    status = OrderStatus.CONFIRMED,
    offsetDays = 5,
    timeSlot = '09:00-11:00',
  ) {
    const order = await prisma.order.create({
      data: {
        orderCode: `T10-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
        status,
        contactName: 'Synthetic Customer',
        contactPhone: '0900001234',
        subtotal: '100000',
        collectionFee: '20000',
        totalAmount: '120000',
        appointment: {
          create: {
            scheduledDate: new Date(Date.now() + offsetDays * 86_400_000),
            timeSlot,
            province: 'Synthetic Province',
            district: 'Synthetic District',
            ward: 'Synthetic Ward',
            addressLine: 'Synthetic address',
          },
        },
        statusHistory: { create: { status, title: 'Synthetic initial' } },
      },
    });
    orderIds.push(order.id);
    return order;
  }

  it('lists/searches collectors with masked phone and returns operational detail', async () => {
    const list = await service.list({
      page: 1,
      limit: 20,
      search: firstCode,
      sortBy: 'employeeCode',
      sortOrder: 'asc',
    });
    expect(list.data[0]).toMatchObject({
      employeeCode: firstCode,
      maskedPhone: '******9876',
    });
    expect(list.data[0]).not.toHaveProperty('phone');
    const detail = await service.detail(firstCode);
    expect(detail.phone).toBe('0900009876');
    await expect(service.detail('MISSING')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('updates status and service areas with audit and validates ACTIVE/AVAILABLE rules', async () => {
    const result = await service.updateStatus(
      firstCode,
      { operationalStatus: CollectorOperationalStatus.OFF_DUTY },
      adminId,
    );
    expect(result.operationalStatus).toBe('OFF_DUTY');
    await service.updateServiceAreas(
      firstCode,
      {
        serviceAreas: [
          { province: ' Synthetic Province ', district: null },
          { province: 'Synthetic Province', district: null },
        ],
      },
      adminId,
    );
    const detail = await service.detail(firstCode);
    expect(detail.serviceAreas).toHaveLength(1);
    await service.updateStatus(
      firstCode,
      { operationalStatus: CollectorOperationalStatus.AVAILABLE },
      adminId,
    );
    const profile = await prisma.collectorProfile.findUniqueOrThrow({
      where: { employeeCode: firstCode },
    });
    await prisma.staffUser.update({
      where: { id: profile.staffUserId },
      data: { status: StaffStatus.INACTIVE },
    });
    await expect(
      service.updateStatus(
        firstCode,
        { operationalStatus: CollectorOperationalStatus.AVAILABLE },
        adminId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await prisma.staffUser.update({
      where: { id: profile.staffUserId },
      data: { status: StaffStatus.ACTIVE },
    });
  });
  it('returns only truly eligible collectors by area, status and role', async () => {
    const order = await createOrder();
    const eligible = await service.eligible(order.orderCode, {});
    expect(eligible.data.map((x) => x.employeeCode)).toEqual(
      expect.arrayContaining([firstCode, secondCode]),
    );
    expect(eligible.data.map((x) => x.employeeCode)).not.toEqual(
      expect.arrayContaining([offCode, otherCode]),
    );
  });
  it('assigns, reassigns and unassigns with one version increment each', async () => {
    const order = await createOrder();
    const assigned = await service.assign(
      order.orderCode,
      { expectedVersion: 1, collectorEmployeeCode: firstCode },
      adminId,
    );
    expect(assigned).toMatchObject({
      status: OrderStatus.COLLECTOR_ASSIGNED,
      version: 2,
      currentCollector: { employeeCode: firstCode },
    });
    const reassignCandidates = await service.eligible(order.orderCode, {});
    expect(reassignCandidates.data.map((x) => x.employeeCode)).not.toContain(
      firstCode,
    );
    await expect(
      service.assign(
        order.orderCode,
        { expectedVersion: 2, collectorEmployeeCode: firstCode },
        adminId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const reassigned = await service.assign(
      order.orderCode,
      { expectedVersion: 2, collectorEmployeeCode: secondCode },
      adminId,
    );
    expect(reassigned).toMatchObject({
      status: OrderStatus.COLLECTOR_ASSIGNED,
      version: 3,
      currentCollector: { employeeCode: secondCode },
    });
    const unassigned = await service.unassign(
      order.orderCode,
      { expectedVersion: 3, reason: 'Synthetic scheduling adjustment' },
      adminId,
    );
    expect(unassigned).toMatchObject({
      status: OrderStatus.CONFIRMED,
      version: 4,
      currentCollector: null,
    });
    const history = await prisma.transaction((tx) =>
      tx.collectorAssignmentHistory.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
      }),
    );
    expect(history.map((x) => x.action)).toEqual([
      'ASSIGNED',
      'REASSIGNED',
      'UNASSIGNED',
    ]);
  });
  it('rejects pending/cancelled, stale and unassigned operations as business conflicts', async () => {
    const pending = await createOrder(OrderStatus.PENDING_CONFIRMATION);
    await expect(
      service.assign(
        pending.orderCode,
        { expectedVersion: 1, collectorEmployeeCode: firstCode },
        adminId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const confirmed = await createOrder();
    await expect(
      service.assign(
        confirmed.orderCode,
        { expectedVersion: 99, collectorEmployeeCode: firstCode },
        adminId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.unassign(
        confirmed.orderCode,
        { expectedVersion: 1, reason: 'Synthetic reason' },
        adminId,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('prevents same-day/time-slot overlap and excludes the collector from eligibility', async () => {
    const first = await createOrder(OrderStatus.CONFIRMED, 9, '13:00-15:00');
    const second = await createOrder(OrderStatus.CONFIRMED, 9, '13:00-15:00');
    await service.assign(
      first.orderCode,
      { expectedVersion: 1, collectorEmployeeCode: firstCode },
      adminId,
    );
    const eligible = await service.eligible(second.orderCode, {});
    expect(eligible.data.map((x) => x.employeeCode)).not.toContain(firstCode);
    await expect(
      service.assign(
        second.orderCode,
        { expectedVersion: 1, collectorEmployeeCode: firstCode },
        adminId,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('rolls back assignment when audit fails', async () => {
    const order = await createOrder();
    await expect(
      service.assign(
        order.orderCode,
        { expectedVersion: 1, collectorEmployeeCode: firstCode },
        randomUUID(),
      ),
    ).rejects.toBeDefined();
    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { statusHistory: true, collectorAssignmentHistory: true },
    });
    expect(stored).toMatchObject({
      status: OrderStatus.CONFIRMED,
      version: 1,
      currentCollectorProfileId: null,
    });
    expect(stored.collectorAssignmentHistory).toHaveLength(0);
    expect(stored.statusHistory).toHaveLength(1);
  });
  it('public lookup reflects assignment status without collector details', async () => {
    const order = await createOrder();
    await service.assign(
      order.orderCode,
      { expectedVersion: 1, collectorEmployeeCode: secondCode },
      adminId,
    );
    const publicOrder = await orders.lookup({
      orderCode: order.orderCode,
      contactPhone: '0900001234',
    });
    expect(publicOrder.status).toBe(OrderStatus.COLLECTOR_ASSIGNED);
    expect(publicOrder).not.toHaveProperty('currentCollector');
    expect(JSON.stringify(publicOrder)).not.toContain(secondCode);
  });
});
