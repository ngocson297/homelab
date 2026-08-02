import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CollectorPortalService } from '../src/collector-portal/collector-portal.service';
import {
  CollectorOperationalStatus,
  CustodyActorType,
  LabTestStatus,
  OrderStatus,
  SpecimenCustodyEventType,
  SpecimenRejectionReason,
  SpecimenStatus,
  StaffRole,
  StaffStatus,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { SpecimensService } from '../src/specimens/specimens.service';
import type { AuthenticatedStaff } from '../src/staff-auth/staff-request';
import { hashToken } from '../src/staff-auth/staff-auth.service';

type SnapshotInput = {
  groupKey?: string | null;
  specimenType?: string;
  containerType?: string;
  targetVolume?: string | null;
};

describe('Specimen management and custody (PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let specimens: SpecimensService;
  let collectorPortal: CollectorPortalService;
  let server: Parameters<typeof request>[0];

  const staffIds: string[] = [];
  const labTestIds: string[] = [];
  const orderIds: string[] = [];
  const adminToken = `t12-admin-${randomUUID()}`;
  const labToken = `t12-lab-${randomUUID()}`;
  const collectorToken = `t12-collector-${randomUUID()}`;
  const otherCollectorToken = `t12-collector-other-${randomUUID()}`;

  let admin: AuthenticatedStaff;
  let labStaff: AuthenticatedStaff;
  let collector: AuthenticatedStaff;
  let otherCollector: AuthenticatedStaff;
  let collectorProfileId = '';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    specimens = app.get(SpecimensService);
    collectorPortal = app.get(CollectorPortalService);
    server = app.getHttpServer() as Parameters<typeof request>[0];

    admin = await createStaff(StaffRole.ADMIN, 'Admin', adminToken);
    labStaff = await createStaff(StaffRole.LAB_STAFF, 'Lab', labToken);
    collector = await createStaff(
      StaffRole.COLLECTOR,
      'Collector',
      collectorToken,
    );
    otherCollector = await createStaff(
      StaffRole.COLLECTOR,
      'Other Collector',
      otherCollectorToken,
    );
    const profile = await prisma.collectorProfile.create({
      data: {
        staffUserId: collector.id,
        employeeCode: `T12-COL-${randomUUID().slice(0, 8).toUpperCase()}`,
        phone: '0900009876',
        phoneNormalized: '0900009876',
        operationalStatus: CollectorOperationalStatus.AVAILABLE,
      },
    });
    collectorProfileId = profile.id;
    await prisma.collectorProfile.create({
      data: {
        staffUserId: otherCollector.id,
        employeeCode: `T12-OTH-${randomUUID().slice(0, 8).toUpperCase()}`,
        phone: '0900008765',
        phoneNormalized: '0900008765',
        operationalStatus: CollectorOperationalStatus.AVAILABLE,
      },
    });
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
      await tx.labTest.deleteMany({ where: { id: { in: labTestIds } } });
    });
    await app.close();
  });

  async function createStaff(
    role: StaffRole,
    tag: string,
    rawToken: string,
  ): Promise<AuthenticatedStaff> {
    const value = await prisma.staffUser.create({
      data: {
        email: `ticket12-${tag.toLowerCase()}-${randomUUID()}@example.test`,
        passwordHash: 'synthetic-not-a-login-hash',
        fullName: `Synthetic Ticket 12 ${tag}`,
        role,
        status: StaffStatus.ACTIVE,
        sessions: {
          create: {
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + 3_600_000),
          },
        },
      },
    });
    staffIds.push(value.id);
    return {
      id: value.id,
      sessionId: `synthetic-${tag.toLowerCase()}`,
      email: value.email,
      fullName: value.fullName,
      role: value.role,
    };
  }

  async function createOrder(
    snapshots: SnapshotInput[],
    status: OrderStatus = OrderStatus.CONFIRMED,
  ) {
    const tests = await Promise.all(
      snapshots.map(async (snapshot, index) => {
        const value = await prisma.labTest.create({
          data: {
            code: `T12-${randomUUID().slice(0, 8).toUpperCase()}-${index}`,
            name: `Synthetic specimen test ${index + 1}`,
            specimenType: snapshot.specimenType ?? 'Synthetic blood',
            containerType: snapshot.containerType ?? 'Synthetic tube',
            collectionGroupKey: snapshot.groupKey ?? null,
            targetCollectionVolumeMl: snapshot.targetVolume ?? null,
            turnaroundTimeHours: 24,
            homeCollectable: true,
            price: '100000',
            status: LabTestStatus.ACTIVE,
          },
        });
        labTestIds.push(value.id);
        return { value, snapshot };
      }),
    );

    const order = await prisma.order.create({
      data: {
        orderCode: `HL-20260803-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
        status,
        contactName: 'Synthetic Contact',
        contactPhone: '0900001234',
        subtotal: String(tests.length * 100000),
        collectionFee: '30000',
        totalAmount: String(tests.length * 100000 + 30000),
        subject: {
          create: {
            fullName: 'Synthetic Subject',
            dateOfBirth: new Date('1990-01-20T00:00:00Z'),
            sex: 'UNKNOWN',
          },
        },
        appointment: {
          create: {
            scheduledDate: new Date(Date.now() + 86_400_000),
            timeSlot: '09:00-11:00',
            province: 'Synthetic Province',
            district: 'Synthetic District',
            ward: 'Synthetic Ward',
            addressLine: 'Synthetic test address',
          },
        },
        statusHistory: {
          create: { status, title: 'Synthetic initial status' },
        },
        items: {
          create: tests.map(({ value, snapshot }) => ({
            labTestId: value.id,
            testCodeSnapshot: value.code,
            testNameSnapshot: value.name,
            specimenTypeSnapshot: value.specimenType,
            containerTypeSnapshot: value.containerType,
            collectionGroupKeySnapshot:
              snapshot.groupKey?.trim().toUpperCase() ?? null,
            targetCollectionVolumeMlSnapshot: snapshot.targetVolume ?? null,
            preparationInstructionSnapshot: null,
            transportInstructionSnapshot: null,
            priceSnapshot: value.price,
          })),
        },
      },
    });
    orderIds.push(order.id);
    return order;
  }

  async function createInTransitOrder(specimenCount: number) {
    const order = await createOrder(
      Array.from({ length: specimenCount }, () => ({ groupKey: null })),
      OrderStatus.IN_TRANSIT,
    );
    const items = await prisma.transaction((tx) =>
      tx.orderItem.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
      }),
    );
    const created = [];
    for (const [index, item] of items.entries()) {
      created.push(
        await prisma.specimen.create({
          data: {
            specimenCode: `SPC-T12-${randomUUID().slice(0, 12).toUpperCase()}`,
            barcodeValue: `t12_${randomUUID().replaceAll('-', '')}`,
            orderId: order.id,
            status: SpecimenStatus.IN_TRANSIT,
            specimenType: item.specimenTypeSnapshot,
            containerType: item.containerTypeSnapshot,
            collectedVolumeMl: String(index + 2),
            collectedAt: new Date(Date.now() - 60_000),
            collectedByCollectorProfileId: collectorProfileId,
            inTransitAt: new Date(Date.now() - 30_000),
            version: 3,
            orderItems: { create: { orderItemId: item.id } },
            custodyEvents: {
              create: [
                {
                  eventType: SpecimenCustodyEventType.SPECIMEN_COLLECTED,
                  actorType: CustodyActorType.COLLECTOR,
                  actorStaffUserId: collector.id,
                  actorCollectorProfileId: collectorProfileId,
                  operationId: randomUUID(),
                },
                {
                  eventType: SpecimenCustodyEventType.HANDED_TO_TRANSPORT,
                  actorType: CustodyActorType.COLLECTOR,
                  actorStaffUserId: collector.id,
                  actorCollectorProfileId: collectorProfileId,
                  operationId: randomUUID(),
                },
              ],
            },
          },
        }),
      );
    }
    return { order, specimens: created };
  }

  async function createPreparedAssignedOrder(specimenCount = 2) {
    const order = await createOrder(
      Array.from({ length: specimenCount }, () => ({ groupKey: null })),
    );
    await specimens.prepare(
      order.orderCode,
      { expectedVersion: 1, operationId: randomUUID() },
      admin,
    );
    const assigned = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.COLLECTOR_ASSIGNED,
        currentCollectorProfileId: collectorProfileId,
        version: { increment: 1 },
      },
    });
    const planned = await prisma.specimen.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });
    return { order: assigned, specimens: planned };
  }

  it('enforces role, CSRF/origin and private cache headers', async () => {
    const order = await createOrder([{ groupKey: null }]);
    const path = `/admin/orders/${order.orderCode}/specimens/prepare`;

    await request(server).post(path).send({}).expect(401);
    await request(server)
      .post(path)
      .set('Cookie', `homelab_staff_session=${collectorToken}`)
      .set('Origin', 'http://localhost:3000')
      .send({ expectedVersion: 1, operationId: randomUUID() })
      .expect(403);
    await request(server)
      .post(path)
      .set('Cookie', `homelab_staff_session=${adminToken}`)
      .set('Origin', 'https://invalid.example.test')
      .send({ expectedVersion: 1, operationId: randomUUID() })
      .expect(403);

    const response = await request(server)
      .post(path)
      .set('Cookie', `homelab_staff_session=${labToken}`)
      .set('Origin', 'http://localhost:3000')
      .send({ expectedVersion: 1, operationId: randomUUID() })
      .expect(200);
    expect(response.headers['cache-control']).toContain('private');

    const barcode = (
      await prisma.specimen.findFirstOrThrow({ where: { orderId: order.id } })
    ).barcodeValue;
    await request(server)
      .post('/lab/specimens/scan')
      .set('Cookie', `homelab_staff_session=${adminToken}`)
      .set('Origin', 'http://localhost:3000')
      .send({ barcodeValue: barcode })
      .expect(403);
    const scan = await request(server)
      .post('/lab/specimens/scan')
      .set('Cookie', `homelab_staff_session=${labToken}`)
      .set('Origin', 'http://localhost:3000')
      .send({ barcodeValue: barcode })
      .expect(200);
    expect(scan.headers['cache-control']).toContain('private');
  });

  it('groups only exact configured keys, keeps null items separate, and is idempotent', async () => {
    const order = await createOrder([
      { groupKey: ' GROUP-T12 ', targetVolume: '3.50' },
      { groupKey: 'group-t12', targetVolume: '3.50' },
      { groupKey: null, targetVolume: null },
    ]);
    const operationId = randomUUID();
    const prepared = await specimens.prepare(
      order.orderCode,
      { expectedVersion: 1, operationId },
      admin,
    );
    expect(prepared).toMatchObject({ version: 2 });
    expect(prepared.specimens).toHaveLength(2);
    expect(
      prepared.specimens.map((item) => item.linkedTests.length).sort(),
    ).toEqual([1, 2]);
    expect(
      prepared.specimens.find((item) => item.linkedTests.length === 1),
    ).toMatchObject({ requiresManualReview: true });
    expect(
      prepared.specimens.find((item) => item.linkedTests.length === 2),
    ).toMatchObject({ requiresManualReview: false, targetVolumeMl: '3.5' });

    const stored = await prisma.specimen.findMany({
      where: { orderId: order.id },
      include: { custodyEvents: true },
    });
    expect(new Set(stored.map((item) => item.barcodeValue)).size).toBe(2);
    for (const specimen of stored) {
      expect(specimen.barcodeValue).not.toContain(order.orderCode);
      expect(specimen.barcodeValue).not.toContain('0900001234');
      expect(specimen.barcodeValue).not.toContain('Synthetic');
      expect(
        specimen.custodyEvents.map((event) => event.eventType).sort(),
      ).toEqual(
        [
          SpecimenCustodyEventType.LABEL_GENERATED,
          SpecimenCustodyEventType.SPECIMEN_PLANNED,
        ].sort(),
      );
    }
    expect(JSON.stringify(prepared)).not.toContain(stored[0]?.barcodeValue);

    const retried = await specimens.prepare(
      order.orderCode,
      { expectedVersion: 1, operationId },
      admin,
    );
    expect(retried).toMatchObject({ version: 2 });
    await expect(
      prisma.specimen.count({ where: { orderId: order.id } }),
    ).resolves.toBe(2);

    const labelsBefore = await specimens.labels(order.orderCode);
    const printOperation = randomUUID();
    const codes = labelsBefore.labels.map((label) => label.specimenCode);
    await specimens.recordPrinted(
      order.orderCode,
      { operationId: printOperation, specimenCodes: codes, printCount: 1 },
      admin,
    );
    await specimens.recordPrinted(
      order.orderCode,
      { operationId: printOperation, specimenCodes: codes, printCount: 1 },
      admin,
    );
    const printedEvents = await prisma.transaction((tx) =>
      tx.specimenCustodyEvent.count({
        where: {
          specimen: { orderId: order.id },
          eventType: SpecimenCustodyEventType.LABEL_PRINTED,
        },
      }),
    );
    expect(printedEvents).toBe(2);
    await expect(specimens.labels(order.orderCode)).resolves.toEqual(
      labelsBefore,
    );
  });

  it('rolls back the whole plan when a configured group is inconsistent', async () => {
    const order = await createOrder([
      {
        groupKey: 'GROUP-INCONSISTENT',
        targetVolume: '3.00',
        containerType: 'Synthetic tube A',
      },
      {
        groupKey: 'GROUP-INCONSISTENT',
        targetVolume: '3.00',
        containerType: 'Synthetic tube B',
      },
    ]);
    await expect(
      specimens.prepare(
        order.orderCode,
        { expectedVersion: 1, operationId: randomUUID() },
        admin,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      prisma.specimen.count({ where: { orderId: order.id } }),
    ).resolves.toBe(0);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ version: 1 });
  });

  it('requires a plan and enforces the complete collector barcode lifecycle atomically and idempotently', async () => {
    const withoutPlan = await createOrder(
      [{ groupKey: null }],
      OrderStatus.COLLECTOR_ASSIGNED,
    );
    await prisma.order.update({
      where: { id: withoutPlan.id },
      data: { currentCollectorProfileId: collectorProfileId },
    });
    await expect(
      collectorPortal.startJourney(collector.id, withoutPlan.orderCode, {
        expectedVersion: 1,
        operationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: withoutPlan.id } }),
    ).resolves.toMatchObject({
      status: OrderStatus.COLLECTOR_ASSIGNED,
      version: 1,
    });

    const workflow = await createPreparedAssignedOrder(2);
    expect(workflow.order).toMatchObject({
      status: OrderStatus.COLLECTOR_ASSIGNED,
      version: 3,
      currentCollectorProfileId: collectorProfileId,
    });
    const started = await collectorPortal.startJourney(
      collector.id,
      workflow.order.orderCode,
      { expectedVersion: 3, operationId: randomUUID() },
    );
    expect(started).toMatchObject({
      status: OrderStatus.COLLECTOR_ON_THE_WAY,
      version: 4,
      currentAttempt: { status: 'ON_THE_WAY' },
    });
    expect(JSON.stringify(started)).not.toContain(
      workflow.specimens[0].barcodeValue,
    );

    const identity = {
      identityConfirmation: {
        fullNameConfirmed: true,
        dateOfBirthConfirmed: true,
      },
      consentConfirmed: true,
    };
    const scans = workflow.specimens.map((item, index) => ({
      barcodeValue: item.barcodeValue,
      collectedVolumeMl: index + 2.5,
    }));

    await expect(
      collectorPortal.collectSpecimens(
        otherCollector.id,
        workflow.order.orderCode,
        {
          expectedVersion: 4,
          operationId: randomUUID(),
          ...identity,
          specimens: scans,
        },
      ),
    ).rejects.toMatchObject({ status: 404 });

    const foreign = await createPreparedAssignedOrder(2);
    const invalidRequests = [
      [scans[0]],
      [scans[0], scans[0]],
      [scans[0], { barcodeValue: foreign.specimens[0].barcodeValue }],
      [scans[0], { barcodeValue: `missing_${randomUUID()}` }],
    ];
    for (const invalidSpecimens of invalidRequests) {
      await expect(
        collectorPortal.collectSpecimens(
          collector.id,
          workflow.order.orderCode,
          {
            expectedVersion: 4,
            operationId: randomUUID(),
            ...identity,
            specimens: invalidSpecimens,
          },
        ),
      ).rejects.toMatchObject({ status: 400 });
    }

    const beforeCollection = await prisma.specimen.findMany({
      where: { orderId: workflow.order.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(beforeCollection).toHaveLength(2);
    expect(beforeCollection).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: SpecimenStatus.LABELED, version: 1 }),
      ]),
    );
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: workflow.order.id } }),
    ).resolves.toMatchObject({
      status: OrderStatus.COLLECTOR_ON_THE_WAY,
      version: 4,
    });
    const failedCollectionEvents = await prisma.transaction((tx) =>
      tx.specimenCustodyEvent.count({
        where: {
          specimen: { orderId: workflow.order.id },
          eventType: SpecimenCustodyEventType.SPECIMEN_COLLECTED,
        },
      }),
    );
    expect(failedCollectionEvents).toBe(0);

    const collectOperation = randomUUID();
    const collected = await collectorPortal.collectSpecimens(
      collector.id,
      workflow.order.orderCode,
      {
        expectedVersion: 4,
        operationId: collectOperation,
        ...identity,
        specimens: scans,
      },
    );
    expect(collected).toMatchObject({
      status: OrderStatus.COLLECTED,
      version: 5,
      currentAttempt: { status: 'COLLECTED' },
    });
    const collectedStored = await prisma.specimen.findMany({
      where: { orderId: workflow.order.id },
    });
    expect(collectedStored).toHaveLength(2);
    for (const item of collectedStored)
      expect(item).toMatchObject({
        status: SpecimenStatus.COLLECTED,
        version: 2,
        collectedByCollectorProfileId: collectorProfileId,
      });

    const collectedRetry = await collectorPortal.collectSpecimens(
      collector.id,
      workflow.order.orderCode,
      {
        expectedVersion: 4,
        operationId: collectOperation,
        ...identity,
        specimens: scans,
      },
    );
    expect(collectedRetry).toMatchObject({
      status: OrderStatus.COLLECTED,
      version: 5,
    });
    await expect(
      prisma.specimen.findMany({ where: { orderId: workflow.order.id } }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: SpecimenStatus.COLLECTED,
          version: 2,
        }),
      ]),
    );

    const blockedSpecimen = collectedStored[1];
    await prisma.specimen.update({
      where: { id: blockedSpecimen.id },
      data: { status: SpecimenStatus.LABELED },
    });
    await expect(
      collectorPortal.markInTransit(collector.id, workflow.order.orderCode, {
        expectedVersion: 5,
        operationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      prisma.specimen.findUniqueOrThrow({
        where: { id: collectedStored[0].id },
      }),
    ).resolves.toMatchObject({ status: SpecimenStatus.COLLECTED, version: 2 });
    await prisma.specimen.update({
      where: { id: blockedSpecimen.id },
      data: { status: SpecimenStatus.COLLECTED },
    });

    const transitOperation = randomUUID();
    const transit = await collectorPortal.markInTransit(
      collector.id,
      workflow.order.orderCode,
      { expectedVersion: 5, operationId: transitOperation },
    );
    expect(transit).toMatchObject({
      status: OrderStatus.IN_TRANSIT,
      version: 6,
      currentAttempt: { status: 'IN_TRANSIT' },
    });
    const transitRetry = await collectorPortal.markInTransit(
      collector.id,
      workflow.order.orderCode,
      { expectedVersion: 5, operationId: transitOperation },
    );
    expect(transitRetry).toMatchObject({
      status: OrderStatus.IN_TRANSIT,
      version: 6,
    });

    const finalSpecimens = await prisma.specimen.findMany({
      where: { orderId: workflow.order.id },
      include: { custodyEvents: true },
    });
    for (const item of finalSpecimens) {
      expect(item).toMatchObject({
        status: SpecimenStatus.IN_TRANSIT,
        version: 3,
      });
      expect(
        item.custodyEvents.filter(
          (event) =>
            event.eventType === SpecimenCustodyEventType.SPECIMEN_COLLECTED,
        ),
      ).toHaveLength(1);
      expect(
        item.custodyEvents.filter(
          (event) =>
            event.eventType === SpecimenCustodyEventType.HANDED_TO_TRANSPORT,
        ),
      ).toHaveLength(1);
    }
    const storedWorkflow = await prisma.order.findUniqueOrThrow({
      where: { id: workflow.order.id },
      include: { collectionAttempts: true, statusHistory: true },
    });
    expect(storedWorkflow).toMatchObject({
      status: OrderStatus.IN_TRANSIT,
      version: 6,
    });
    expect(storedWorkflow.collectionAttempts).toHaveLength(1);
    expect(
      storedWorkflow.statusHistory.filter(
        (event) => event.operationId === collectOperation,
      ),
    ).toHaveLength(1);
    expect(
      storedWorkflow.statusHistory.filter(
        (event) => event.operationId === transitOperation,
      ),
    ).toHaveLength(1);
  });

  it('keeps scans read-only and changes the order only after every specimen reaches the lab', async () => {
    const { order, specimens: inTransit } = await createInTransitOrder(2);
    const firstBefore = await prisma.specimen.findUniqueOrThrow({
      where: { id: inTransit[0].id },
    });
    const scanned = await specimens.scan({
      barcodeValue: `  ${firstBefore.barcodeValue}  `,
    });
    expect(scanned).toMatchObject({
      specimenCode: firstBefore.specimenCode,
      status: SpecimenStatus.IN_TRANSIT,
      version: 3,
    });
    expect(scanned).not.toHaveProperty('barcodeValue');
    await expect(
      prisma.specimen.findUniqueOrThrow({ where: { id: firstBefore.id } }),
    ).resolves.toMatchObject({ status: SpecimenStatus.IN_TRANSIT, version: 3 });

    const received = await specimens.receive(
      firstBefore.specimenCode,
      {
        expectedVersion: 3,
        operationId: randomUUID(),
        assessment: {
          labelLegible: true,
          containerIntact: true,
          transportConditionAcceptable: true,
          measuredTemperatureC: null,
        },
      },
      labStaff,
    );
    expect(received).toMatchObject({
      status: SpecimenStatus.RECEIVED,
      version: 4,
    });
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: OrderStatus.IN_TRANSIT });

    const accepted = await specimens.accept(
      firstBefore.specimenCode,
      { expectedVersion: 4, operationId: randomUUID() },
      labStaff,
    );
    expect(accepted).toMatchObject({
      status: SpecimenStatus.ACCEPTED,
      version: 5,
    });
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: OrderStatus.IN_TRANSIT });

    const second = inTransit[1];
    await specimens.receive(
      second.specimenCode,
      {
        expectedVersion: 3,
        operationId: randomUUID(),
        assessment: {
          labelLegible: true,
          containerIntact: true,
          transportConditionAcceptable: true,
        },
      },
      labStaff,
    );
    const arrived = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { statusHistory: true },
    });
    expect(arrived).toMatchObject({ status: OrderStatus.RECEIVED_AT_LAB });
    expect(
      arrived.statusHistory.filter(
        (event) => event.status === OrderStatus.RECEIVED_AT_LAB,
      ),
    ).toHaveLength(1);

    await specimens.accept(
      second.specimenCode,
      { expectedVersion: 4, operationId: randomUUID() },
      labStaff,
    );
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
    ).resolves.toMatchObject({ status: OrderStatus.RECEIVED_AT_LAB });
  });

  it('rejects safely, sets recollection, and keeps internal details out of public lookup', async () => {
    const { order, specimens: inTransit } = await createInTransitOrder(1);
    const specimen = inTransit[0];
    expect(() =>
      specimens.reject(
        specimen.specimenCode,
        {
          expectedVersion: 3,
          operationId: randomUUID(),
          reason: SpecimenRejectionReason.OTHER,
          recollectionRequired: true,
        },
        labStaff,
      ),
    ).toThrow('Lý do OTHER bắt buộc phải có ghi chú');

    const operationId = randomUUID();
    const rejected = await specimens.reject(
      specimen.specimenCode,
      {
        expectedVersion: 3,
        operationId,
        reason: SpecimenRejectionReason.OTHER,
        note: 'Synthetic handling note',
        recollectionRequired: true,
      },
      labStaff,
    );
    expect(rejected).toMatchObject({
      status: SpecimenStatus.REJECTED,
      version: 4,
      rejectionReason: SpecimenRejectionReason.OTHER,
      recollectionRequired: true,
    });
    const retry = await specimens.reject(
      specimen.specimenCode,
      {
        expectedVersion: 3,
        operationId,
        reason: SpecimenRejectionReason.OTHER,
        note: 'Synthetic handling note',
        recollectionRequired: true,
      },
      labStaff,
    );
    expect(retry).toMatchObject({
      status: SpecimenStatus.REJECTED,
      version: 4,
    });

    const storedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(storedOrder).toMatchObject({
      status: OrderStatus.RECEIVED_AT_LAB,
      requiresRecollection: true,
    });
    const publicLookup = await request(server)
      .post('/orders/lookup')
      .send({ orderCode: order.orderCode, contactPhone: '0900001234' })
      .expect(200);
    expect(publicLookup.text).not.toContain(specimen.barcodeValue);
    expect(publicLookup.text).not.toContain('Synthetic handling note');
    expect(publicLookup.text).not.toContain(SpecimenRejectionReason.OTHER);

    const audit = await prisma.adminAuditLog.findFirstOrThrow({
      where: {
        staffUserId: labStaff.id,
        action: 'SPECIMEN_REJECTED',
        entityReference: specimen.specimenCode,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(JSON.stringify(audit.metadata)).not.toContain(
      'Synthetic handling note',
    );
  });
});
