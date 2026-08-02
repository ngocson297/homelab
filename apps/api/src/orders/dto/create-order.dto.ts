import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsISO8601,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
  IsEnum,
  IsDefined,
} from 'class-validator';
import { SubjectSex } from '../../generated/prisma/client';

export class CreateAppointmentDto {
  @ApiProperty({ example: '2026-08-05T08:00:00+07:00' })
  @IsISO8601({ strict: true })
  scheduledDate!: string;

  @ApiProperty({ example: '08:00-10:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/)
  timeSlot!: string;

  @ApiProperty({ example: 'Da Nang' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  province!: string;

  @ApiProperty({ example: 'Hai Chau' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district!: string;

  @ApiProperty({ example: 'Hoa Cuong' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ward!: string;

  @ApiProperty({ example: 'Synthetic test address' })
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  addressLine!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

export class CreateOrderSubjectDto {
  @ApiProperty({ example: 'Nguyen Van Test', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: '1990-01-20', format: 'date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth!: string;

  @ApiProperty({ enum: SubjectSex })
  @IsEnum(SubjectSex)
  sex!: SubjectSex;

  @ApiPropertyOptional({ nullable: true, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationshipToContact?: string | null;
}

export class CreateOrderDto {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  labTestIds!: string[];

  @ApiProperty({ example: 'Synthetic Customer' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName!: string;

  @ApiProperty({ example: '0900000000' })
  @IsPhoneNumber('VN')
  contactPhone!: string;

  @ApiProperty({ type: CreateAppointmentDto })
  @ValidateNested()
  @Type(() => CreateAppointmentDto)
  appointment!: CreateAppointmentDto;

  @ApiProperty({ type: () => CreateOrderSubjectDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateOrderSubjectDto)
  subject!: CreateOrderSubjectDto;
}
