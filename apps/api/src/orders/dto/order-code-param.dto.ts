import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class OrderCodeParamDto {
  @ApiProperty({ example: 'HL-20260802-A1B2C3D4E5F6' })
  @Matches(/^HL-\d{8}-[A-F0-9]{12}$/)
  orderCode!: string;
}
