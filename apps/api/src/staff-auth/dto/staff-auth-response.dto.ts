import { ApiProperty } from '@nestjs/swagger';
import { StaffRole } from '../../generated/prisma/enums';

export class StaffProfileDto {
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ enum: StaffRole }) role!: StaffRole;
}

export class StaffAuthResponseDto {
  @ApiProperty({ type: StaffProfileDto }) user!: StaffProfileDto;
}
