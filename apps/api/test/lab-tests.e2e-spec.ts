import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, LabTestStatus } from '../src/generated/prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import request from 'supertest';

describe('Lab tests API (integration)', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  const id = '82a71194-33ee-4e6a-86f5-967f0eea8789';
  const item = {
    id,
    code: 'CBC',
    name: 'Complete Blood Count',
    description: null,
    specimenType: 'Whole blood',
    containerType: 'EDTA tube',
    minimumVolumeMl: new Prisma.Decimal('2.00'),
    preparationInstruction: null,
    turnaroundTimeHours: 24,
    homeCollectable: true,
    price: new Prisma.Decimal('150000.00'),
    status: LabTestStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const prisma = {
    labTest: {
      findMany: jest
        .fn<(args: Prisma.LabTestFindManyArgs) => Promise<(typeof item)[]>>()
        .mockResolvedValue([item]),
      count: jest
        .fn<(args: Prisma.LabTestCountArgs) => Promise<number>>()
        .mockResolvedValue(1),
      findUnique: jest
        .fn<(args: Prisma.LabTestFindUniqueArgs) => Promise<typeof item>>()
        .mockResolvedValue(item),
    },
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

  it('GET /lab-tests validates query and returns pagination metadata', async () => {
    const response = await request(server)
      .get('/lab-tests?search=blood&homeCollectable=true&page=1&limit=5')
      .expect(200);

    expect(response.text).toContain('"code":"CBC"');
    expect(response.text).toContain('"totalPages":1');
  });

  it('GET /lab-tests rejects invalid pagination', () =>
    request(server).get('/lab-tests?page=0').expect(400));

  it('GET /lab-tests/:id returns a catalog item', async () => {
    const response = await request(server).get(`/lab-tests/${id}`).expect(200);

    expect(response.text).toContain(`"id":"${id}"`);
    expect(response.text).toContain('"price":"150000"');
  });

  it('GET /lab-tests/:id returns 404 for an unknown valid UUID', async () => {
    prisma.labTest.findUnique.mockResolvedValueOnce(null);

    await request(server)
      .get('/lab-tests/1fa2ab3c-4d5e-4f60-8a7b-8c9d0e1f2a3b')
      .expect(404);
  });

  it('GET /lab-tests/:id rejects a non-UUID identifier', () =>
    request(server).get('/lab-tests/not-a-uuid').expect(400));
});
