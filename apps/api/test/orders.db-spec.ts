import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Orders API with PostgreSQL', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let prisma: PrismaService;
  let createdOrderCode: string | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdOrderCode) {
      await prisma.order.delete({ where: { orderCode: createdOrderCode } });
    }
    await app.close();
  });

  it('creates snapshots and exact totals, then retrieves the order', async () => {
    const catalog = await request(server)
      .get('/lab-tests?search=GLU-FAST')
      .expect(200);
    const labTestId = readFirstLabTestId(catalog.text);

    const created = await request(server)
      .post('/orders')
      .send({
        labTestIds: [labTestId],
        contactName: 'Synthetic Integration Customer',
        contactPhone: '0900000000',
        appointment: {
          scheduledDate: '2026-08-05T08:00:00+07:00',
          timeSlot: '08:00-10:00',
          province: 'Da Nang',
          district: 'Hai Chau',
          ward: 'Hoa Cuong',
          addressLine: 'Synthetic integration address',
          note: null,
        },
        subtotal: '1.00',
      })
      .expect(201);

    createdOrderCode = readString(parseObject(created.text), 'orderCode');
    expect(created.text).toContain('"status":"CONFIRMED"');
    expect(created.text).toContain('"subtotal":"90000"');
    expect(created.text).toContain('"collectionFee":"30000"');
    expect(created.text).toContain('"totalAmount":"120000"');
    expect(created.text).toContain(`"labTestId":"${labTestId}"`);
    expect(created.text).toContain('"testCode":"GLU-FAST"');
    expect(created.text).toContain('"testName":"Fasting Blood Glucose"');
    expect(created.text).toContain('"specimenType":"Serum"');
    expect(created.text).toContain('"price":"90000"');

    const fetched = await request(server)
      .get(`/orders/${createdOrderCode}`)
      .expect(200);
    expect(fetched.text).toBe(created.text);
  });

  it.each([
    ['VITD', 'inactive'],
    ['PT-INR', 'not home collectable'],
  ])('does not create an order for %s (%s)', async (code) => {
    const catalog = await request(server)
      .get(`/lab-tests?search=${code}`)
      .expect(200);
    const labTestId = readFirstLabTestId(catalog.text);
    const before = await prisma.order.count();

    await request(server)
      .post('/orders')
      .send({
        labTestIds: [labTestId],
        contactName: 'Synthetic Rejected Customer',
        contactPhone: '0900000000',
        appointment: {
          scheduledDate: '2026-08-05T08:00:00+07:00',
          timeSlot: '08:00-10:00',
          province: 'Da Nang',
          district: 'Hai Chau',
          ward: 'Hoa Cuong',
          addressLine: 'Synthetic rejected address',
        },
      })
      .expect(400);

    await expect(prisma.order.count()).resolves.toBe(before);
  });

  it('rolls back the entire request when one ID is unknown', async () => {
    const catalog = await request(server)
      .get('/lab-tests?search=CBC')
      .expect(200);
    const labTestId = readFirstLabTestId(catalog.text);
    const before = await prisma.order.count();

    await request(server)
      .post('/orders')
      .send({
        labTestIds: [labTestId, '00000000-0000-4000-8000-000000000000'],
        contactName: 'Synthetic Rollback Customer',
        contactPhone: '0900000000',
        appointment: {
          scheduledDate: '2026-08-05T08:00:00+07:00',
          timeSlot: '08:00-10:00',
          province: 'Da Nang',
          district: 'Hai Chau',
          ward: 'Hoa Cuong',
          addressLine: 'Synthetic rollback address',
        },
      })
      .expect(400);

    await expect(prisma.order.count()).resolves.toBe(before);
  });
});

function parseObject(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) {
    throw new Error('Expected a JSON object');
  }
  return value;
}

function readString(object: Record<string, unknown>, key: string): string {
  const value = object[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string`);
  }
  return value;
}

function readFirstLabTestId(text: string): string {
  const data = parseObject(text).data;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Expected at least one lab test');
  }
  const first: unknown = data[0];
  if (!isRecord(first)) {
    throw new Error('Expected a lab test object');
  }
  return readString(first, 'id');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
