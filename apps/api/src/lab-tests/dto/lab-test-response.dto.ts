import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LabTestStatus } from '../../generated/prisma/enums';

export class LabTestResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'CBC' })
  code!: string;

  @ApiProperty({ example: 'Complete Blood Count' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'Whole blood' })
  specimenType!: string;

  @ApiProperty({ example: 'EDTA tube' })
  containerType!: string;

  @ApiPropertyOptional({ type: String, example: '2.00', nullable: true })
  minimumVolumeMl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  preparationInstruction!: string | null;

  @ApiProperty({ example: 24 })
  turnaroundTimeHours!: number;

  @ApiProperty()
  homeCollectable!: boolean;

  @ApiProperty({ type: String, example: '150000.00' })
  price!: string;

  @ApiProperty({ enum: LabTestStatus })
  status!: LabTestStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class LabTestPaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedLabTestsResponseDto {
  @ApiProperty({ type: [LabTestResponseDto] })
  data!: LabTestResponseDto[];

  @ApiProperty({ type: LabTestPaginationMetaDto })
  meta!: LabTestPaginationMetaDto;
}
