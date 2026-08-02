import { Module } from '@nestjs/common';
import { LabTestsController } from './lab-tests.controller';
import { LabTestsService } from './lab-tests.service';

@Module({
  controllers: [LabTestsController],
  providers: [LabTestsService],
})
export class LabTestsModule {}
