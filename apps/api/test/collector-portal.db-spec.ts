import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { CollectorPortalService } from '../src/collector-portal/collector-portal.service';
import {
  CollectionFailureReason,
  CollectorOperationalStatus,
  LabTestStatus,
  OrderStatus,
  SpecimenStatus,
  StaffRole,
  StaffStatus,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Collector portal workflow (PostgreSQL)', () => {
  let module: TestingModule,
    prisma: PrismaService,
    service: CollectorPortalService;
  const staffIds: string[] = [],
    orderIds: string[] = [];
  let firstStaff = '',
    secondStaff = '',
    firstProfile = '',
    labTestId = '';
  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    prisma = module.get(PrismaService);
    service = module.get(CollectorPortalService);
    ({ staffId: firstStaff, profileId: firstProfile } = await collector('A'));
    ({ staffId: secondStaff } = await collector('B'));
    const labTest = await prisma.labTest.create({
      data: {
        code: `T11-${randomUUID().slice(0, 8).toUpperCase()}`,
        name: 'Synthetic collector workflow test',
        specimenType: 'Synthetic blood',
        containerType: 'Synthetic tube',
        targetCollectionVolumeMl: '3.00',
        turnaroundTimeHours: 24,
        homeCollectable: true,
        price: '100000',
        status: LabTestStatus.ACTIVE,
      },
    });
    labTestId = labTest.id;
  });
  afterAll(async () => {
    await prisma.transaction(async (tx) => {
      await tx.specimenCustodyEvent.deleteMany({
        where: { specimen: { orderId: { in: orderIds } } },
      });
      await tx.specimenOrderItem.deleteMany({
        where: { specimen: { orderId: { in: orderIds } } },
      });
      await tx.specimen.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      await tx.adminAuditLog.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await tx.collectorProfile.deleteMany({
        where: { staffUserId: { in: staffIds } },
      });
      await tx.staffUser.deleteMany({ where: { id: { in: staffIds } } });
      await tx.labTest.delete({ where: { id: labTestId } });
    });
    await module.close();
  });
  async function collector(tag: string) {
    const staff = await prisma.staffUser.create({
      data: {
        email: `${randomUUID()}@example.test`,
        passwordHash: 'synthetic-hash',
        fullName: `Synthetic Collector ${tag}`,
        role: StaffRole.COLLECTOR,
        status: StaffStatus.ACTIVE,
      },
    });
    staffIds.push(staff.id);
    const profile = await prisma.collectorProfile.create({
      data: {
        staffUserId: staff.id,
        employeeCode: `T11-${tag}-${randomUUID().slice(0, 6)}`,
        phone: '0900009876',
        phoneNormalized: '0900009876',
        operationalStatus: CollectorOperationalStatus.AVAILABLE,
      },
    });
    return { staffId: staff.id, profileId: profile.id };
  }
  async function order(profileId = firstProfile) {
    const value = await prisma.order.create({
      data: {
        orderCode: `T11-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
        status: OrderStatus.COLLECTOR_ASSIGNED,
        currentCollectorProfileId: profileId,
        contactName: 'Synthetic Contact',
        contactPhone: '0900001234',
        subtotal: '100000',
        collectionFee: '20000',
        totalAmount: '120000',
        subject: {
          create: {
            fullName: 'Synthetic Subject',
            dateOfBirth: new Date('1990-01-20T00:00:00Z'),
            sex: 'UNKNOWN',
          },
        },
        appointment: {
          create: {
            scheduledDate: new Date(Date.now() + 86400000),
            timeSlot: '09:00-11:00',
            province: 'Synthetic Province',
            district: 'Synthetic District',
            ward: 'Synthetic Ward',
            addressLine: 'Synthetic address',
          },
        },
        statusHistory: {
          create: {
            status: OrderStatus.COLLECTOR_ASSIGNED,
            title: 'Synthetic assigned',
          },
        },
        items: {
          create: {
            labTestId,
            testCodeSnapshot: 'T11-SYNTHETIC',
            testNameSnapshot: 'Synthetic collector workflow test',
            specimenTypeSnapshot: 'Synthetic blood',
            containerTypeSnapshot: 'Synthetic tube',
            collectionGroupKeySnapshot: null,
            targetCollectionVolumeMlSnapshot: '3.00',
            preparationInstructionSnapshot: null,
            transportInstructionSnapshot: null,
            priceSnapshot: '100000',
          },
        },
      },
      include: { items: true },
    });
    const barcodeValue = `t11_${randomUUID().replaceAll('-', '')}`;
    await prisma.specimen.create({
      data: {
        specimenCode: `SPC-T11-${randomUUID().slice(0, 12).toUpperCase()}`,
        barcodeValue,
        orderId: value.id,
        status: SpecimenStatus.LABELED,
        specimenType: 'Synthetic blood',
        containerType: 'Synthetic tube',
        targetVolumeMl: '3.00',
        orderItems: { create: { orderItemId: value.items[0].id } },
      },
    });
    orderIds.push(value.id);
    return { ...value, barcodeValue };
  }
  it('scopes list/detail to the authenticated collector and minimizes list data', async () => {
    const own = await order();
    await order(
      (
        await prisma.collectorProfile.findUniqueOrThrow({
          where: { staffUserId: secondStaff },
        })
      ).id,
    );
    const list = await service.orders(firstStaff, {
      page: 1,
      limit: 20,
      sortOrder: 'asc',
    });
    expect(list.data.map((x) => x.orderCode)).toContain(own.orderCode);
    expect(JSON.stringify(list)).not.toContain('0900001234');
    expect(JSON.stringify(list)).not.toContain('Synthetic address');
    await expect(
      service.detail(secondStaff, own.orderCode),
    ).rejects.toMatchObject({ status: 404 });
  });
  it('executes journey, identity verification and transit atomically with one version increment', async () => {
    const created = await order();
    const started = await service.startJourney(firstStaff, created.orderCode, {
      expectedVersion: 1,
      operationId: randomUUID(),
    });
    expect(started).toMatchObject({
      status: 'COLLECTOR_ON_THE_WAY',
      version: 2,
      currentAttempt: { attemptNumber: 1, status: 'ON_THE_WAY' },
    });
    await expect(
      service.collectSpecimens(firstStaff, created.orderCode, {
        expectedVersion: 2,
        operationId: randomUUID(),
        identityConfirmation: {
          fullNameConfirmed: true,
          dateOfBirthConfirmed: false,
        },
        consentConfirmed: true,
        specimens: [{ barcodeValue: created.barcodeValue }],
      }),
    ).rejects.toMatchObject({ status: 409 });
    const collected = await service.collectSpecimens(
      firstStaff,
      created.orderCode,
      {
        expectedVersion: 2,
        operationId: randomUUID(),
        identityConfirmation: {
          fullNameConfirmed: true,
          dateOfBirthConfirmed: true,
        },
        consentConfirmed: true,
        specimens: [
          { barcodeValue: created.barcodeValue, collectedVolumeMl: 3 },
        ],
      },
    );
    expect(collected).toMatchObject({
      status: 'COLLECTED',
      version: 3,
      currentAttempt: { status: 'COLLECTED' },
    });
    const transit = await service.markInTransit(firstStaff, created.orderCode, {
      expectedVersion: 3,
      operationId: randomUUID(),
    });
    expect(transit).toMatchObject({
      status: 'IN_TRANSIT',
      version: 4,
      currentAttempt: { status: 'IN_TRANSIT' },
    });
    await expect(
      service.markInTransit(firstStaff, created.orderCode, {
        expectedVersion: 4,
        operationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('reports failure, clears assignment and records safe histories', async () => {
    const created = await order();
    const failed = await service.reportFailure(firstStaff, created.orderCode, {
      expectedVersion: 1,
      operationId: randomUUID(),
      reason: CollectionFailureReason.PATIENT_UNAVAILABLE,
    });
    expect(failed).toMatchObject({
      status: 'CONFIRMED',
      version: 2,
      currentAttempt: { status: 'FAILED' },
    });
    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: created.id },
      include: { collectorAssignmentHistory: true, statusHistory: true },
    });
    expect(stored.currentCollectorProfileId).toBeNull();
    expect(stored.collectorAssignmentHistory.at(-1)?.action).toBe('UNASSIGNED');
    expect(stored.statusHistory.at(-1)?.description).not.toContain(
      'PATIENT_UNAVAILABLE',
    );
    expect(() =>
      service.reportFailure(firstStaff, created.orderCode, {
        expectedVersion: 2,
        operationId: randomUUID(),
        reason: CollectionFailureReason.OTHER,
        note: '',
      }),
    ).toThrow();
  });
});
