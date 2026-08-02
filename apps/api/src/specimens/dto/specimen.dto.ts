import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  SpecimenRejectionReason,
  SpecimenStatus,
} from '../../generated/prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class VersionedOperationDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  operationId!: string;
}

export class PrepareSpecimensDto extends VersionedOperationDto {}

export class LabelsPrintedDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  operationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item) =>
          typeof item === 'string' ? item.trim().toUpperCase() : item,
        )
      : value,
  )
  @IsString({ each: true })
  @MinLength(8, { each: true })
  @MaxLength(40, { each: true })
  specimenCodes!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  printCount!: number;
}

export class LabSpecimenListQueryDto {
  @IsOptional()
  @IsEnum(SpecimenStatus)
  status?: SpecimenStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ScanSpecimenDto {
  @Transform(trim)
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  barcodeValue!: string;
}

export class ReceiveAssessmentDto {
  @IsBoolean()
  labelLegible!: boolean;

  @IsBoolean()
  containerIntact!: boolean;

  @IsBoolean()
  transportConditionAcceptable!: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(-100)
  @Max(100)
  measuredTemperatureC?: number | null;
}

export class ReceiveSpecimenDto extends VersionedOperationDto {
  @ValidateNested()
  @Type(() => ReceiveAssessmentDto)
  assessment!: ReceiveAssessmentDto;
}

export class RejectSpecimenDto extends VersionedOperationDto {
  @IsEnum(SpecimenRejectionReason)
  reason!: SpecimenRejectionReason;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'note must not contain HTML' })
  note?: string;

  @IsBoolean()
  recollectionRequired!: boolean;
}
