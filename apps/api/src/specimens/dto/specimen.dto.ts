import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsDefined,
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

  @ApiProperty({ type: [String], example: ['SPC-20260803-A1B2C3D4E5'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item: unknown) =>
          typeof item === 'string' ? item.trim().toUpperCase() : item,
        )
      : value,
  )
  @IsString({ each: true })
  @MinLength(8, { each: true })
  @MaxLength(40, { each: true })
  specimenCodes!: string[];

  @ApiProperty({ minimum: 1, maximum: 100, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  printCount!: number;
}

export class LabSpecimenListQueryDto {
  @ApiPropertyOptional({ enum: SpecimenStatus })
  @IsOptional()
  @IsEnum(SpecimenStatus)
  status?: SpecimenStatus;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ScanSpecimenDto {
  @ApiProperty({ description: 'Opaque barcode value from a protected label' })
  @Transform(trim)
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  barcodeValue!: string;
}

export class ReceiveAssessmentDto {
  @ApiProperty()
  @IsBoolean()
  labelLegible!: boolean;

  @ApiProperty()
  @IsBoolean()
  containerIntact!: boolean;

  @ApiProperty()
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
  @ApiProperty({ type: ReceiveAssessmentDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ReceiveAssessmentDto)
  assessment!: ReceiveAssessmentDto;
}

export class RejectSpecimenDto extends VersionedOperationDto {
  @ApiProperty({ enum: SpecimenRejectionReason })
  @IsEnum(SpecimenRejectionReason)
  reason!: SpecimenRejectionReason;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'note must not contain HTML' })
  note?: string;

  @ApiProperty()
  @IsBoolean()
  recollectionRequired!: boolean;
}
