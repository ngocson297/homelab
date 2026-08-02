import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  AppointmentStatus,
  OrderStatus,
  Prisma,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

const labTestId = '82a71194-33ee-4e6a-86f5-967f0eea8789';
const orderCode = 'HL-20260802-A1B2C3D4E5F6';
const createdAt = new Date('2026-08-02T00:00:00.000Z');
const requestBody = {
  labTestIds: [labTestId],
  contactName: 'Synthetic Customer',
  contactPhone: '0900000000',
  appointment: {
    scheduledDate: '2026-08-05T08:00:00+07:00',
    timeSlot: '08:00-10:00',
    province: 'Da Nang',
    district: 'Hai Chau',
    ward: 'Hoa Cuong',
    addressLine: 'Synthetic test address',
    note: null,
  },
};
const order = {
  id: '24cd16e1-083c-49fe-b833-6b1b047f6019',
  orderCode,
  status: OrderStatus.CONFIRMED,
  contactName: requestBody.contactName,
  contactPhone: requestBody.contactPhone,
  subtotal: new Prisma.Decimal('150000.00'),
  collectionFee: new Prisma.Decimal('30000.00'),
  totalAmount: new Prisma.Decimal('180000.00'),
  createdAt,
  updatedAt: createdAt,
  items: [
    {
      id: '38df7d6e-ff34-499a-ac16-56bd279a46ee',
      orderId: '24cd16e1-083c-49fe-b833-6b1b047f6019',
      labTestId,
      testCodeSnapshot: 'CBC',
      testNameSnapshot: 'Complete Blood Count',
      specimenTypeSnapshot: 'Whole blood',
      priceSnapshot: new Prisma.Decimal('150000.00'),
      createdAt,
    },
  ],
  appointment: {
    id: 'b43f1947-1479-429c-913f-35542d2640e7',
    orderId: '24cd16e1-083c-49fe-b833-6b1b047f6019',
    scheduledDate: new Date(requestBody.appointment.scheduledDate),
    timeSlot: requestBody.appointment.timeSlot,
    province: requestBody.appointment.province,
    district: requestBody.appointment.district,
    ward: requestBody.appointment.ward,
    addressLine: requestBody.appointment.addressLine,
    note: null,
    status: AppointmentStatus.SCHEDULED,
    createdAt,
    updatedAt: createdAt,
  },
};

describe('Orders API (integration)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  const transactionClient = {
    labTest: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: labTestId,
          code: 'CBC',
          name: 'Complete Blood Count',
          specimenType: 'Whole blood',
          price: new Prisma.Decimal('150000.00'),
        },
      ]),
    },
    order: { create: jest.fn().mockResolvedValue(order) },
  };
  const prisma = {
    transaction: jest.fn(
      async (
        operation: (client: typeof transactionClient) => Promise<unknown>,
      ) => operation(transactionClient),
    ),
    order: { findUnique: jest.fn().mockResolvedValue(order) },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /orders creates an order without trusting client prices', async () => {
    const response = await request(server)
      .post('/orders')
      .send({ ...requestBody, subtotal: '1.00', collectionFee: '0.00' })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        orderCode,
        subtotal: '150000',
        collectionFee: '30000',
        totalAmount: '180000',
      }),
    );
    expect(response.body).not.toHaveProperty('contactPhone');
  });

  it('GET /orders/:orderCode returns the public response', async () => {
    const response = await request(server)
      .get(`/orders/${orderCode}`)
      .expect(200);

    expect(response.text).toContain('"testCode":"CBC"');
    expect(response.text).toContain('"testName":"Complete Blood Count"');
    expect(response.text).toContain('"price":"150000"');
    expect(response.text).not.toContain('"orderId"');
  });

  it.each([
    [{ ...requestBody, labTestIds: [] }],
    [{ ...requestBody, labTestIds: [labTestId, labTestId] }],
    [{ ...requestBody, contactPhone: 'not-a-phone' }],
    [
      {
        ...requestBody,
        appointment: { ...requestBody.appointment, timeSlot: 'bad' },
      },
    ],
  ])('rejects an invalid create request', (body) =>
    request(server).post('/orders').send(body).expect(400),
  );

  it('rejects malformed order codes', () =>
    request(server).get('/orders/not-an-order-code').expect(400));

  it('returns 404 for an unknown valid order code', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);

    await request(server).get('/orders/HL-20260802-000000000000').expect(404);
  });
});
