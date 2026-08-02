import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { OrderStatus } from '../../generated/prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AdminOrderListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsISO8601({ strict: true })
  appointmentDateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  appointmentDateTo?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  createdFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  createdTo?: string;

  @IsOptional()
  @IsIn(['createdAt', 'scheduledDate', 'totalAmount'])
  sortBy: 'createdAt' | 'scheduledDate' | 'totalAmount' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class ExpectedVersionDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class CancelOrderDto extends ExpectedVersionDto {
  @ApiProperty({ minLength: 3, maxLength: 500 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'reason must not contain HTML' })
  reason!: string;
}

export class RescheduleAppointmentDto extends CancelOrderDto {
  @ApiProperty({ example: '2026-08-06T09:00:00+07:00' })
  @IsISO8601({ strict: true })
  scheduledDate!: string;

  @ApiProperty({
    enum: ['07:00-09:00', '09:00-11:00', '13:00-15:00', '15:00-17:00'],
  })
  @IsIn(['07:00-09:00', '09:00-11:00', '13:00-15:00', '15:00-17:00'])
  timeSlot!: string;
}
