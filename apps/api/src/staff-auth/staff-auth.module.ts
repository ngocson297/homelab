import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminController } from './admin.controller';
import { RolesGuard } from './roles.guard';
import { StaffAuthController } from './staff-auth.controller';
import { StaffAuthGuard } from './staff-auth.guard';
import { StaffAuthService } from './staff-auth.service';
import { StaffCsrfGuard } from './staff-csrf.guard';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
  controllers: [StaffAuthController, AdminController],
  providers: [StaffAuthService, StaffAuthGuard, RolesGuard, StaffCsrfGuard],
  exports: [StaffAuthService, StaffAuthGuard, RolesGuard],
})
export class StaffAuthModule {}
