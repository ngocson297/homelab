import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, LabTestStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LabTestsService } from './lab-tests.service';

const labTest = {
  id: '82a71194-33ee-4e6a-86f5-967f0eea8789',
  code: 'CBC',
  name: 'Complete Blood Count',
  description: 'Synthetic catalog fixture',
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

describe('LabTestsService', () => {
  let service: LabTestsService;
  const prisma = {
    labTest: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabTestsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(LabTestsService);
  });

  it('searches, filters, and paginates lab tests', async () => {
    prisma.labTest.findMany.mockResolvedValue([labTest]);
    prisma.labTest.count.mockResolvedValue(21);

    const result = await service.findAll({
      search: 'blood',
      homeCollectable: true,
      page: 2,
      limit: 10,
    });

    expect(prisma.labTest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: {
          homeCollectable: true,
          OR: [
            { code: { contains: 'blood', mode: 'insensitive' } },
            { name: { contains: 'blood', mode: 'insensitive' } },
          ],
        },
      }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({ price: '150000', minimumVolumeMl: '2' }),
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    });
  });

  it('returns a lab test by ID', async () => {
    prisma.labTest.findUnique.mockResolvedValue(labTest);

    await expect(service.findOne(labTest.id)).resolves.toEqual(
      expect.objectContaining({ id: labTest.id, code: 'CBC' }),
    );
  });

  it('throws when a lab test does not exist', async () => {
    prisma.labTest.findUnique.mockResolvedValue(null);

    await expect(service.findOne(labTest.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
