import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../generated/prisma/enums';

export class PublicOrderContactDto {
  @ApiProperty({ example: '******0000' })
  maskedPhone!: string;
}

export class PublicAppointmentDto {
  @ApiProperty({ format: 'date-time' }) scheduledDate!: Date;
  @ApiProperty() timeSlot!: string;
  @ApiProperty() province!: string;
  @ApiProperty() district!: string;
  @ApiProperty() ward!: string;
}

export class PublicOrderItemDto {
  @ApiProperty() testCode!: string;
  @ApiProperty() testName!: string;
  @ApiProperty() specimenType!: string;
  @ApiProperty({ type: String }) price!: string;
}

export class PublicOrderTimelineDto {
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ format: 'date-time' }) occurredAt!: Date;
}

export class PublicOrderResponseDto {
  @ApiProperty() orderCode!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty() statusLabel!: string;
  @ApiProperty({ type: PublicOrderContactDto }) contact!: PublicOrderContactDto;
  @ApiProperty({ type: PublicAppointmentDto })
  appointment!: PublicAppointmentDto;
  @ApiProperty({ type: [PublicOrderItemDto] }) items!: PublicOrderItemDto[];
  @ApiProperty({ type: String }) subtotal!: string;
  @ApiProperty({ type: String }) collectionFee!: string;
  @ApiProperty({ type: String }) totalAmount!: string;
  @ApiProperty({ type: [PublicOrderTimelineDto] })
  timeline!: PublicOrderTimelineDto[];
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class LegacyOrderStatusResponseDto {
  @ApiProperty() orderCode!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty() statusLabel!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}
