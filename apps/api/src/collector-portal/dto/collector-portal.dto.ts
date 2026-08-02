import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  CollectionFailureReason,
  OrderStatus,
} from '../../generated/prisma/client';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CollectorOrdersQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'asc';
}
export class ExpectedVersionDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  expectedVersion!: number;
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  operationId!: string;
}
export class IdentityConfirmationDto {
  @ApiProperty()
  @IsBoolean()
  fullNameConfirmed!: boolean;
  @ApiProperty()
  @IsBoolean()
  dateOfBirthConfirmed!: boolean;
}
export class MarkCollectedDto extends ExpectedVersionDto {
  @ApiProperty({ type: IdentityConfirmationDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => IdentityConfirmationDto)
  identityConfirmation!: IdentityConfirmationDto;
  @ApiProperty()
  @IsBoolean()
  consentConfirmed!: boolean;
}

export class CollectedSpecimenDto {
  @ApiProperty({
    description: 'Opaque barcode from the protected specimen label',
  })
  @Transform(trim)
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  barcodeValue!: string;

  @ApiPropertyOptional({ minimum: 0.01, maximum: 9999 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999)
  collectedVolumeMl?: number;
}

export class CollectSpecimensDto extends MarkCollectedDto {
  @ApiProperty({ type: [CollectedSpecimenDto] })
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CollectedSpecimenDto)
  specimens!: CollectedSpecimenDto[];
}
export class ReportCollectionFailureDto extends ExpectedVersionDto {
  @ApiProperty({ enum: CollectionFailureReason })
  @IsEnum(CollectionFailureReason)
  reason!: CollectionFailureReason;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'note must not contain HTML' })
  note?: string;
}
