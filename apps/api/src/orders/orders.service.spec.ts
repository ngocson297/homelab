import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AppointmentStatus,
  LabTestStatus,
  OrderStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

const firstId = '82a71194-33ee-4e6a-86f5-967f0eea8789';
const secondId = '1fa2ab3c-4d5e-4f60-8a7b-8c9d0e1f2a3b';
const createdAt = new Date('2026-08-02T00:00:00.000Z');
const appointmentDate = new Date('2026-08-05T01:00:00.000Z');

const dto: CreateOrderDto = {
  labTestIds: [firstId, secondId],
  contactName: 'Synthetic Customer',
  contactPhone: '0900000000',
  subject: {
    fullName: 'Synthetic Subject',
    dateOfBirth: '1990-01-20',
    sex: 'UNKNOWN',
    relationshipToContact: null,
  },
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

const availableTests = [
  {
    id: firstId,
    code: 'CBC',
    name: 'Complete Blood Count',
    specimenType: 'Whole blood',
    containerType: 'Synthetic EDTA tube',
    collectionGroupKey: 'SYNTHETIC-WHOLE-BLOOD',
    targetCollectionVolumeMl: new Prisma.Decimal('3.50'),
    specimenPreparationInstruction: 'Synthetic preparation instruction',
    transportInstruction: 'Synthetic transport instruction',
    price: new Prisma.Decimal('150000.00'),
  },
  {
    id: secondId,
    code: 'GLU-FAST',
    name: 'Fasting Blood Glucose',
    specimenType: 'Serum',
    containerType: 'Synthetic serum tube',
    collectionGroupKey: null,
    targetCollectionVolumeMl: null,
    specimenPreparationInstruction: null,
    transportInstruction: null,
    price: new Prisma.Decimal('90000.00'),
  },
];

const storedOrder = {
  id: '24cd16e1-083c-49fe-b833-6b1b047f6019',
  orderCode: 'HL-20260802-A1B2C3D4E5F6',
  status: OrderStatus.CONFIRMED,
  contactName: dto.contactName,
  contactPhone: dto.contactPhone,
  subtotal: new Prisma.Decimal('240000.00'),
  collectionFee: new Prisma.Decimal('30000.00'),
  totalAmount: new Prisma.Decimal('270000.00'),
  createdAt,
  updatedAt: createdAt,
  statusHistory: [
    {
      id: '92a71194-33ee-4e6a-86f5-967f0eea8799',
      orderId: '24cd16e1-083c-49fe-b833-6b1b047f6019',
      status: OrderStatus.CONFIRMED,
      title: 'Order confirmed',
      description: null,
      occurredAt: createdAt,
      createdAt,
    },
  ],
  items: availableTests.map((test, index) => ({
    id: index === 0 ? firstId : secondId,
    orderId: '24cd16e1-083c-49fe-b833-6b1b047f6019',
    labTestId: test.id,
    testCodeSnapshot: test.code,
    testNameSnapshot: test.name,
    specimenTypeSnapshot: test.specimenType,
    priceSnapshot: test.price,
    createdAt,
  })),
  appointment: {
    id: 'b43f1947-1479-429c-913f-35542d2640e7',
    orderId: '24cd16e1-083c-49fe-b833-6b1b047f6019',
    scheduledDate: appointmentDate,
    timeSlot: dto.appointment.timeSlot,
    province: dto.appointment.province,
    district: dto.appointment.district,
    ward: dto.appointment.ward,
    addressLine: dto.appointment.addressLine,
    note: null,
    status: AppointmentStatus.SCHEDULED,
    createdAt,
    updatedAt: createdAt,
  },
};

describe('OrdersService', () => {
  let service: OrdersService;
  const findMany =
    jest.fn<
      (args: Prisma.LabTestFindManyArgs) => Promise<typeof availableTests>
    >();
  const createOrder =
    jest.fn<(args: Prisma.OrderCreateArgs) => Promise<typeof storedOrder>>();
  let capturedCreateArgs: Prisma.OrderCreateArgs | undefined;
  const transactionClient = {
    labTest: { findMany },
    order: { create: createOrder },
  };
  const prisma = {
    transaction: jest.fn(),
    order: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    capturedCreateArgs = undefined;
    prisma.transaction.mockImplementation(
      async (
        operation: (client: typeof transactionClient) => Promise<unknown>,
      ) => operation(transactionClient),
    );
    findMany.mockResolvedValue(availableTests);
    createOrder.mockImplementation((args: Prisma.OrderCreateArgs) => {
      capturedCreateArgs = args;
      return Promise.resolve(storedOrder);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OrdersService);
  });

  it('recalculates prices and stores catalog snapshots in one transaction', async () => {
    const result = await service.create(dto);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        id: { in: dto.labTestIds },
        status: LabTestStatus.ACTIVE,
        homeCollectable: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        specimenType: true,
        containerType: true,
        collectionGroupKey: true,
        targetCollectionVolumeMl: true,
        specimenPreparationInstruction: true,
        transportInstruction: true,
        price: true,
      },
    });
    const createArgs = capturedCreateArgs;
    if (!createArgs) throw new Error('Expected order create arguments');
    expect(createArgs.data).toEqual(
      expect.objectContaining({
        subtotal: new Prisma.Decimal('240000.00'),
        collectionFee: new Prisma.Decimal('30000.00'),
        totalAmount: new Prisma.Decimal('270000.00'),
      }),
    );
    expect(createArgs.data.items).toEqual({
      create: [
        expect.objectContaining({
          testCodeSnapshot: 'CBC',
          testNameSnapshot: 'Complete Blood Count',
          specimenTypeSnapshot: 'Whole blood',
          containerTypeSnapshot: 'Synthetic EDTA tube',
          collectionGroupKeySnapshot: 'SYNTHETIC-WHOLE-BLOOD',
          targetCollectionVolumeMlSnapshot: new Prisma.Decimal('3.50'),
          preparationInstructionSnapshot: 'Synthetic preparation instruction',
          transportInstructionSnapshot: 'Synthetic transport instruction',
          priceSnapshot: new Prisma.Decimal('150000.00'),
        }),
        expect.objectContaining({
          testCodeSnapshot: 'GLU-FAST',
          priceSnapshot: new Prisma.Decimal('90000.00'),
        }),
      ],
    });
    expect(createArgs.data.status).toBe(OrderStatus.PENDING_CONFIRMATION);
    expect(createArgs.data.statusHistory).toEqual({
      create: {
        status: OrderStatus.PENDING_CONFIRMATION,
        title: 'Đã tiếp nhận yêu cầu',
        description: 'HomeLab đã nhận được yêu cầu đặt lịch của bạn.',
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        subtotal: '240000',
        collectionFee: '30000',
        totalAmount: '270000',
      }),
    );
  });

  it('rejects duplicate lab test IDs before opening a transaction', async () => {
    await expect(
      service.create({ ...dto, labTestIds: [firstId, firstId] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['an inactive test'],
    ['a test without home collection'],
    ['an unknown ID'],
  ])('rejects the whole request containing %s', async () => {
    findMany.mockResolvedValueOnce([availableTests[0]]);

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('propagates transaction failures without retrying a partial write', async () => {
    createOrder.mockRejectedValueOnce(
      new Error('Synthetic transaction failure'),
    );

    await expect(service.create(dto)).rejects.toThrow(
      'Synthetic transaction failure',
    );
    expect(prisma.transaction).toHaveBeenCalledTimes(1);
  });

  it('returns an order by public order code', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(storedOrder);

    await expect(
      service.findByOrderCode(storedOrder.orderCode),
    ).resolves.toEqual(
      expect.objectContaining({ orderCode: storedOrder.orderCode }),
    );
  });

  it('returns 404 for an unknown order code', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.findByOrderCode('HL-20260802-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('looks up by normalized credentials and excludes sensitive details', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(storedOrder);
    const result = await service.lookup({
      orderCode: ` ${storedOrder.orderCode.toLowerCase()} `,
      contactPhone: '+84 900-000-000',
    });
    expect(result.contact.maskedPhone).toBe('******0000');
    expect(result.timeline).toHaveLength(1);
    expect(result.appointment).not.toHaveProperty('addressLine');
    expect(result.items[0]).not.toHaveProperty('labTestId');
  });

  it('uses one generic error for an incorrect phone', async () => {
    prisma.order.findUnique.mockResolvedValueOnce(storedOrder);
    await expect(
      service.lookup({
        orderCode: storedOrder.orderCode,
        contactPhone: '0911111111',
      }),
    ).rejects.toMatchObject({
      response: {
        message: 'Không tìm thấy đơn phù hợp với thông tin đã cung cấp.',
      },
    });
  });
});
