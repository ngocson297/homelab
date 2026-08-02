import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustodyActorType,
  SpecimenCustodyEventType,
  SpecimenRejectionReason,
  SpecimenStatus,
} from '../../generated/prisma/client';

export class SpecimenLinkedTestResponseDto {
  @ApiProperty() testCode!: string;
  @ApiProperty() testName!: string;
}

export class PlannedSpecimenResponseDto {
  @ApiProperty() specimenCode!: string;
  @ApiProperty({ enum: SpecimenStatus }) status!: SpecimenStatus;
  @ApiProperty() specimenType!: string;
  @ApiProperty() containerType!: string;
  @ApiProperty({ type: String, nullable: true }) targetVolumeMl!: string | null;
  @ApiProperty() requiresManualReview!: boolean;
  @ApiProperty({ type: [SpecimenLinkedTestResponseDto] })
  linkedTests!: SpecimenLinkedTestResponseDto[];
}

export class PrepareSpecimensResponseDto {
  @ApiProperty() orderCode!: string;
  @ApiProperty() version!: number;
  @ApiProperty({ type: [PlannedSpecimenResponseDto] })
  specimens!: PlannedSpecimenResponseDto[];
}

export class SpecimenLabelResponseDto {
  @ApiProperty() specimenCode!: string;
  @ApiProperty({
    description: 'Opaque value; contains no order or subject data',
  })
  barcodeValue!: string;
  @ApiProperty({ enum: ['CODE_128'] }) symbology!: 'CODE_128';
  @ApiProperty() specimenType!: string;
  @ApiProperty() containerType!: string;
  @ApiProperty({ type: String, nullable: true }) targetVolumeMl!: string | null;
  @ApiProperty() labelCount!: number;
}

export class SpecimenLabelsResponseDto {
  @ApiProperty() orderCode!: string;
  @ApiProperty({ type: [SpecimenLabelResponseDto] })
  labels!: SpecimenLabelResponseDto[];
}

export class LabelsPrintedResponseDto {
  @ApiProperty() orderCode!: string;
  @ApiProperty() recorded!: number;
  @ApiProperty() idempotent!: boolean;
}

export class LabSummaryResponseDto {
  @ApiProperty() inTransit!: number;
  @ApiProperty() receivedToday!: number;
  @ApiProperty() rejectedToday!: number;
  @ApiProperty() ordersRequiringRecollection!: number;
}

export class LabSpecimenListItemResponseDto {
  @ApiProperty() specimenCode!: string;
  @ApiProperty({ enum: SpecimenStatus }) status!: SpecimenStatus;
  @ApiProperty() version!: number;
  @ApiProperty() specimenType!: string;
  @ApiProperty() containerType!: string;
  @ApiProperty() orderCode!: string;
  @ApiProperty() requiresManualReview!: boolean;
  @ApiProperty() recollectionRequired!: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  receivedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  rejectedAt!: Date | null;
}

class PaginationResponseDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class LabSpecimenListResponseDto {
  @ApiProperty({ type: [LabSpecimenListItemResponseDto] })
  data!: LabSpecimenListItemResponseDto[];
  @ApiProperty({ type: PaginationResponseDto })
  pagination!: PaginationResponseDto;
}

class LabSubjectResponseDto {
  @ApiProperty() displayName!: string;
  @ApiProperty({ format: 'date' }) dateOfBirth!: string;
}

export class SpecimenCustodyResponseDto {
  @ApiProperty({ enum: SpecimenCustodyEventType })
  eventType!: SpecimenCustodyEventType;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: CustodyActorType }) actorType!: CustodyActorType;
  @ApiProperty({ nullable: true }) actorEmployeeCode!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) occurredAt!: Date;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  metadata!: object | null;
}

export class LabSpecimenDetailResponseDto {
  @ApiProperty() specimenCode!: string;
  @ApiProperty({ enum: SpecimenStatus }) status!: SpecimenStatus;
  @ApiProperty() version!: number;
  @ApiProperty() specimenType!: string;
  @ApiProperty() containerType!: string;
  @ApiProperty({ type: String, nullable: true }) targetVolumeMl!: string | null;
  @ApiProperty({ type: String, nullable: true }) collectedVolumeMl!:
    string | null;
  @ApiProperty() orderCode!: string;
  @ApiProperty({ type: LabSubjectResponseDto }) subject!: LabSubjectResponseDto;
  @ApiProperty({ type: [SpecimenLinkedTestResponseDto] })
  linkedTests!: SpecimenLinkedTestResponseDto[];
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  collectedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  inTransitAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  receivedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  acceptedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  rejectedAt!: Date | null;
  @ApiPropertyOptional({ enum: SpecimenRejectionReason, nullable: true })
  rejectionReason?: SpecimenRejectionReason | null;
  @ApiPropertyOptional({ nullable: true }) rejectionNote?: string | null;
  @ApiPropertyOptional() recollectionRequired?: boolean;
  @ApiPropertyOptional({ type: [SpecimenCustodyResponseDto] })
  custodyTimeline?: SpecimenCustodyResponseDto[];
}
