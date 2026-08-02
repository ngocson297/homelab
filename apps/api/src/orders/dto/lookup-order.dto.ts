import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export const ORDER_CODE_PATTERN = /^HL-\d{8}-[A-F0-9]{12}$/;
export const VIETNAM_PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

export class LookupOrderDto {
  @ApiProperty({ example: 'HL-20260802-AB12CD34EF56' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(ORDER_CODE_PATTERN)
  orderCode!: string;

  @ApiProperty({ example: '0900000000' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/[ .()-]/g, '') : value,
  )
  @IsString()
  @Matches(VIETNAM_PHONE_PATTERN)
  contactPhone!: string;
}
