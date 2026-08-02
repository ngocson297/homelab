import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus, OrderStatus } from '../../generated/prisma/enums';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  labTestId!: string;

  @ApiProperty({ example: 'CBC' })
  testCode!: string;

  @ApiProperty({ example: 'Complete Blood Count' })
  testName!: string;

  @ApiProperty({ example: 'Whole blood' })
  specimenType!: string;

  @ApiProperty({ type: String, example: '150000.00' })
  price!: string;
}

export class AppointmentResponseDto {
  @ApiProperty({ format: 'date-time' })
  scheduledDate!: Date;

  @ApiProperty({ example: '08:00-10:00' })
  timeSlot!: string;

  @ApiProperty()
  province!: string;

  @ApiProperty()
  district!: string;

  @ApiProperty()
  ward!: string;

  @ApiProperty()
  addressLine!: string;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;
}

export class OrderResponseDto {
  @ApiProperty({ example: 'HL-20260802-A1B2C3D4E5F6' })
  orderCode!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ type: AppointmentResponseDto })
  appointment!: AppointmentResponseDto;

  @ApiProperty({ type: String, example: '150000.00' })
  subtotal!: string;

  @ApiProperty({ type: String, example: '30000.00' })
  collectionFee!: string;

  @ApiProperty({ type: String, example: '180000.00' })
  totalAmount!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
