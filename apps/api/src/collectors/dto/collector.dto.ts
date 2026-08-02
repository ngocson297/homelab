import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CollectorOperationalStatus } from '../../generated/prisma/client';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CollectorListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) search?: string;
  @IsOptional()
  @IsEnum(CollectorOperationalStatus)
  operationalStatus?: CollectorOperationalStatus;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) province?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) district?: string;
  @IsOptional() @IsIn(['fullName', 'employeeCode', 'createdAt']) sortBy:
    'fullName' | 'employeeCode' | 'createdAt' = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
export class EligibleCollectorsQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) search?: string;
}
export class UpdateCollectorStatusDto {
  @ApiProperty({ enum: CollectorOperationalStatus })
  @IsEnum(CollectorOperationalStatus)
  operationalStatus!: CollectorOperationalStatus;
}
export class CollectorServiceAreaDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(100) province!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district?: string | null;
}
export class UpdateServiceAreasDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CollectorServiceAreaDto)
  serviceAreas!: CollectorServiceAreaDto[];
}
export class AssignCollectorDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{1,49}$/)
  collectorEmployeeCode!: string;
}
export class UnassignCollectorDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'reason must not contain HTML' })
  reason!: string;
}
