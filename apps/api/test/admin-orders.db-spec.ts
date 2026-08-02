import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import {
  AppointmentStatus,
  OrderStatus,
  StaffRole,
  StaffStatus,
} from '../src/generated/prisma/client';
import { AdminOrdersService } from '../src/admin-orders/admin-orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { OrdersService } from '../src/orders/orders.service';
import { hashToken } from '../src/staff-auth/staff-auth.service';

describe('Admin order management (PostgreSQL integration)', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let service: AdminOrdersService;
  let ordersService: OrdersService;
  let app: INestApplication;
  let staffId = '';
  let nonAdminId = '';
  const adminToken = `admin-${randomUUID()}`;
  const nonAdminToken = `staff-${randomUUID()}`;
  const orderIds: string[] = [];

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = module.get(PrismaService);
    service = module.get(AdminOrdersService);
    ordersService = module.get(OrdersService);
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    const staff = await prisma.staffUser.create({
      data: {
        email: `ticket9-${randomUUID()}@example.test`,
        passwordHash: 'synthetic-not-a-login-hash',
        fullName: 'Synthetic Admin',
        role: StaffRole.ADMIN,
        status: StaffStatus.ACTIVE,
      },
    });
    staffId = staff.id;
    const nonAdmin = await prisma.staffUser.create({
      data: {
        email: `ticket9-staff-${randomUUID()}@example.test`,
        passwordHash: 'synthetic-not-a-login-hash',
        fullName: 'Synthetic Lab Staff',
        role: StaffRole.LAB_STAFF,
        status: StaffStatus.ACTIVE,
      },
    });
    nonAdminId = nonAdmin.id;
    await prisma.staffSession.createMany({
      data: [
        {
          staffUserId: staffId,
          tokenHash: hashToken(adminToken),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
        {
          staffUserId: nonAdminId,
          tokenHash: hashToken(nonAdminToken),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      ],
    });
  });
  afterAll(async () => {
    await prisma.transaction(async (tx) => {
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      await tx.adminAuditLog.deleteMany({ where: { staffUserId: staffId } });
      await tx.staffUser.delete({ where: { id: staffId } });
      await tx.staffUser.delete({ where: { id: nonAdminId } });
    });
    await app.close();
  });

  async function seed(status: OrderStatus = OrderStatus.PENDING_CONFIRMATION) {
    const code = `T9-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
    const order = await prisma.order.create({
      data: {
        orderCode: code,
        status,
        contactName: 'Synthetic Customer',
        contactPhone: '0900001234',
        subtotal: '100000',
        collectionFee: '20000',
        totalAmount: '120000',
        appointment: {
          create: {
            scheduledDate: new Date(Date.now() + 7 * 86_400_000),
            timeSlot: '09:00-11:00',
            province: 'Synthetic Province',
            district: 'Synthetic District',
            ward: 'Synthetic Ward',
            addressLine: 'Synthetic test address',
            status: AppointmentStatus.SCHEDULED,
          },
        },
        statusHistory: {
          create: { status, title: 'Synthetic initial status' },
        },
      },
    });
    orderIds.push(order.id);
    return order;
  }

  it('lists with masked phone and search without exposing internal IDs', async () => {
    const order = await seed();
    const result = await service.list({
      page: 1,
      limit: 20,
      search: order.orderCode,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(result.data[0]).toMatchObject({
      orderCode: order.orderCode,
      maskedPhone: '******1234',
      version: 1,
    });
    expect(result.data[0]).not.toHaveProperty('id');
    expect(result.data[0]).not.toHaveProperty('contactPhone');
  });

  it('requires ADMIN for every admin order route and sends private cache headers', async () => {
    const code = (await seed()).orderCode;
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/admin/orders').expect(401);
    for (const path of [
      '/admin/orders',
      '/admin/orders/summary',
      `/admin/orders/${code}`,
    ])
      await request(server)
        .get(path)
        .set('Cookie', `homelab_staff_session=${nonAdminToken}`)
        .expect(403);
    for (const path of [
      `/admin/orders/${code}/confirm`,
      `/admin/orders/${code}/cancel`,
      `/admin/orders/${code}/appointment`,
    ])
      await request(server)
        .patch(path)
        .set('Cookie', `homelab_staff_session=${nonAdminToken}`)
        .set('Origin', 'http://localhost:3000')
        .send({})
        .expect(403);
    const adminResponse = await request(server)
      .get('/admin/orders')
      .set('Cookie', `homelab_staff_session=${adminToken}`)
      .expect(200);
    expect(adminResponse.headers['cache-control']).toContain('private');
    await request(server)
      .get('/admin/orders?sortBy=id')
      .set('Cookie', `homelab_staff_session=${adminToken}`)
      .expect(400);
    await request(server)
      .patch(`/admin/orders/${code}/confirm`)
      .set('Cookie', `homelab_staff_session=${adminToken}`)
      .set('Origin', 'https://invalid.example.test')
      .send({ expectedVersion: 1 })
      .expect(403);
  });

  it('supports pagination, normalized search, filters, date ranges and sorting', async () => {
    const first = await seed(OrderStatus.PENDING_CONFIRMATION);
    const second = await seed(OrderStatus.CONFIRMED);
    await prisma.transaction(async (tx) => {
      await tx.order.update({
        where: { id: first.id },
        data: {
          totalAmount: '110000',
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      });
      await tx.order.update({
        where: { id: second.id },
        data: {
          totalAmount: '990000',
          createdAt: new Date('2026-07-02T00:00:00.000Z'),
        },
      });
    });
    const searched = await service.list({
      page: 1,
      limit: 100,
      search: '+84900001234',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(
      searched.data.some((item) => item.orderCode === first.orderCode),
    ).toBe(true);
    const filtered = await service.list({
      page: 1,
      limit: 1,
      status: OrderStatus.CONFIRMED,
      createdFrom: '2026-07-01T00:00:00.000Z',
      createdTo: '2026-07-03T00:00:00.000Z',
      appointmentDateFrom: new Date(Date.now() + 6 * 86_400_000).toISOString(),
      appointmentDateTo: new Date(Date.now() + 8 * 86_400_000).toISOString(),
      sortBy: 'totalAmount',
      sortOrder: 'desc',
    });
    expect(filtered.data).toHaveLength(1);
    expect(filtered.data[0]?.orderCode).toBe(second.orderCode);
    expect(filtered.pagination).toMatchObject({ page: 1, limit: 1 });
  });

  it('confirms atomically and creates timeline plus privacy-safe audit', async () => {
    const order = await seed();
    const result = await service.confirm(
      order.orderCode,
      { expectedVersion: 1 },
      staffId,
    );
    expect(result).toMatchObject({ status: OrderStatus.CONFIRMED, version: 2 });
    expect(result.timeline.at(-1)?.title).toBe('Đơn hàng đã được xác nhận');
    const audit = await prisma.adminAuditLog.findFirst({
      where: { entityReference: order.orderCode },
    });
    expect(audit?.action).toBe('ORDER_CONFIRMED');
    expect(JSON.stringify(audit?.metadata)).not.toMatch(
      /0900001234|Synthetic Customer|address/i,
    );
  });

  it('rejects a stale version without another history or audit record', async () => {
    const order = await seed();
    await service.confirm(order.orderCode, { expectedVersion: 1 }, staffId);
    await expect(
      service.cancel(
        order.orderCode,
        { expectedVersion: 1, reason: 'Synthetic cancellation reason' },
        staffId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const current = await service.detail(order.orderCode);
    expect(current).toMatchObject({
      status: OrderStatus.CONFIRMED,
      version: 2,
    });
    expect(current.timeline).toHaveLength(2);
  });

  it('cancels confirmed order and appointment in the same transaction', async () => {
    const order = await seed(OrderStatus.CONFIRMED);
    const result = await service.cancel(
      order.orderCode,
      { expectedVersion: 1, reason: 'Synthetic operational reason' },
      staffId,
    );
    expect(result).toMatchObject({
      status: OrderStatus.CANCELLED,
      version: 2,
      appointment: { status: AppointmentStatus.CANCELLED },
    });
  });

  it('redacts contact and authentication-like values from cancellation audit', async () => {
    const order = await seed();
    await service.cancel(
      order.orderCode,
      {
        expectedVersion: 1,
        reason:
          'Synthetic Customer 0900001234 Synthetic test address token=secret-value',
      },
      staffId,
    );
    const audit = await prisma.adminAuditLog.findFirstOrThrow({
      where: { entityReference: order.orderCode, action: 'ORDER_CANCELLED' },
    });
    const metadata = JSON.stringify(audit.metadata);
    expect(metadata).toContain('REDACTED');
    expect(metadata).not.toMatch(
      /0900001234|Synthetic Customer|Synthetic test address|secret-value/i,
    );
  });

  it('rolls back status, version and timeline when audit creation fails', async () => {
    const order = await seed();
    await expect(
      service.confirm(order.orderCode, { expectedVersion: 1 }, randomUUID()),
    ).rejects.toBeDefined();
    const current = await service.detail(order.orderCode);
    expect(current).toMatchObject({
      status: OrderStatus.PENDING_CONFIRMATION,
      version: 1,
    });
    expect(current.timeline).toHaveLength(1);
  });

  it('reschedules while preserving order status and increments once', async () => {
    const order = await seed(OrderStatus.CONFIRMED);
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
    const result = await service.reschedule(
      order.orderCode,
      {
        expectedVersion: 1,
        scheduledDate: future,
        timeSlot: '13:00-15:00',
        reason: 'Synthetic scheduling reason',
      },
      staffId,
    );
    expect(result).toMatchObject({
      status: OrderStatus.CONFIRMED,
      version: 2,
      appointment: {
        timeSlot: '13:00-15:00',
        status: AppointmentStatus.RESCHEDULED,
      },
    });
    expect(result.timeline.at(-1)?.title).toBe('Lịch lấy mẫu đã được cập nhật');
  });

  it('public lookup reflects the new status without exposing admin detail', async () => {
    const order = await seed();
    await service.confirm(order.orderCode, { expectedVersion: 1 }, staffId);
    const result = await ordersService.lookup({
      orderCode: order.orderCode,
      contactPhone: '0900001234',
    });
    expect(result).toMatchObject({
      status: OrderStatus.CONFIRMED,
      contact: { maskedPhone: '******1234' },
    });
    expect(result.contact).not.toHaveProperty('phone');
    expect(result.appointment).not.toHaveProperty('addressLine');
  });

  it('rejects invalid transitions and past appointments', async () => {
    const cancelled = await seed(OrderStatus.CANCELLED);
    await expect(
      service.confirm(cancelled.orderCode, { expectedVersion: 1 }, staffId),
    ).rejects.toMatchObject({ status: 409 });
    expect(() =>
      service.reschedule(
        cancelled.orderCode,
        {
          expectedVersion: 1,
          scheduledDate: new Date(Date.now() - 86_400_000).toISOString(),
          timeSlot: '07:00-09:00',
          reason: 'Synthetic reason',
        },
        staffId,
      ),
    ).toThrow('Lịch lấy mẫu không được nằm trong quá khứ');
  });
});
