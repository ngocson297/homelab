import { Module } from '@nestjs/common';
import { StaffAuthModule } from '../staff-auth/staff-auth.module';
import {
  AdminSpecimensController,
  LabSpecimensController,
} from './specimens.controller';
import { SpecimensService } from './specimens.service';

@Module({
  imports: [StaffAuthModule],
  controllers: [AdminSpecimensController, LabSpecimensController],
  providers: [SpecimensService],
  exports: [SpecimensService],
})
export class SpecimensModule {}
