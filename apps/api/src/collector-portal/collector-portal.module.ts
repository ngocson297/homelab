import { Module } from '@nestjs/common';
import { StaffAuthModule } from '../staff-auth/staff-auth.module';
import { CollectorPortalController } from './collector-portal.controller';
import { CollectorPortalService } from './collector-portal.service';
@Module({
  imports: [StaffAuthModule],
  controllers: [CollectorPortalController],
  providers: [CollectorPortalService],
})
export class CollectorPortalModule {}
