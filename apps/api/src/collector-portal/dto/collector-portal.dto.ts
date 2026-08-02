import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsDefined,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
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
  @IsInt() @Min(1) expectedVersion!: number;
}
export class IdentityConfirmationDto {
  @IsBoolean() fullNameConfirmed!: boolean;
  @IsBoolean() dateOfBirthConfirmed!: boolean;
}
export class MarkCollectedDto extends ExpectedVersionDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => IdentityConfirmationDto)
  identityConfirmation!: IdentityConfirmationDto;
  @IsBoolean() consentConfirmed!: boolean;
}
export class ReportCollectionFailureDto extends ExpectedVersionDto {
  @IsEnum(CollectionFailureReason) reason!: CollectionFailureReason;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'note must not contain HTML' })
  note?: string;
}
