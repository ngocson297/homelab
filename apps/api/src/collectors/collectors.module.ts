import { Module } from '@nestjs/common';
import { AdminOrdersModule } from '../admin-orders/admin-orders.module';
import { StaffAuthModule } from '../staff-auth/staff-auth.module';
import {
  CollectorAssignmentsController,
  CollectorsController,
} from './collectors.controller';
import { CollectorsService } from './collectors.service';
@Module({
  imports: [StaffAuthModule, AdminOrdersModule],
  controllers: [CollectorsController, CollectorAssignmentsController],
  providers: [CollectorsService],
})
export class CollectorsModule {}
