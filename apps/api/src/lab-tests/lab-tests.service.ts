import { Injectable, NotFoundException } from '@nestjs/common';
import type { LabTest, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  LabTestResponseDto,
  PaginatedLabTestsResponseDto,
} from './dto/lab-test-response.dto';
import { ListLabTestsQueryDto } from './dto/list-lab-tests-query.dto';

@Injectable()
export class LabTestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ListLabTestsQueryDto,
  ): Promise<PaginatedLabTestsResponseDto> {
    const search = query.search?.trim();
    const where: Prisma.LabTestWhereInput = {
      ...(query.homeCollectable === undefined
        ? {}
        : { homeCollectable: query.homeCollectable }),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.labTest.findMany({
        where,
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.labTest.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toResponse(item)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<LabTestResponseDto> {
    const labTest = await this.prisma.labTest.findUnique({ where: { id } });

    if (!labTest) {
      throw new NotFoundException(`Lab test ${id} was not found`);
    }

    return this.toResponse(labTest);
  }

  private toResponse(labTest: LabTest): LabTestResponseDto {
    return {
      ...labTest,
      minimumVolumeMl: labTest.minimumVolumeMl?.toString() ?? null,
      price: labTest.price.toString(),
    };
  }
}
