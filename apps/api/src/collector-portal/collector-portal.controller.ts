import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { StaffRole } from '../generated/prisma/client';
import { CurrentStaff } from '../staff-auth/current-staff.decorator';
import { Roles } from '../staff-auth/roles.decorator';
import { RolesGuard } from '../staff-auth/roles.guard';
import { StaffAuthGuard } from '../staff-auth/staff-auth.guard';
import { StaffCsrfGuard } from '../staff-auth/staff-csrf.guard';
import type { AuthenticatedStaff } from '../staff-auth/staff-request';
import { CollectorPortalService } from './collector-portal.service';
import {
  CollectorOrdersQueryDto,
  CollectSpecimensDto,
  ExpectedVersionDto,
  ReportCollectionFailureDto,
} from './dto/collector-portal.dto';

@ApiTags('collector portal')
@ApiCookieAuth('homelab_staff_session')
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles(StaffRole.COLLECTOR)
@Controller('collector')
export class CollectorPortalController {
  constructor(private readonly service: CollectorPortalService) {}
  @Get('me') @Header('Cache-Control', 'private, no-store, max-age=0') me(
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.service.me(staff.id);
  }
  @Get('orders/summary')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  summary(@CurrentStaff() staff: AuthenticatedStaff) {
    return this.service.summary(staff.id);
  }
  @Get('orders')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  orders(
    @CurrentStaff() staff: AuthenticatedStaff,
    @Query() query: CollectorOrdersQueryDto,
  ) {
    return this.service.orders(staff.id, query);
  }
  @Get('orders/:orderCode')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  detail(
    @CurrentStaff() staff: AuthenticatedStaff,
    @Param('orderCode') code: string,
  ) {
    return this.service.detail(staff.id, code);
  }
  @Patch('orders/:orderCode/start-journey')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  start(
    @CurrentStaff() staff: AuthenticatedStaff,
    @Param('orderCode') code: string,
    @Body() dto: ExpectedVersionDto,
  ) {
    return this.service.startJourney(staff.id, code, dto);
  }
  @Patch('orders/:orderCode/collect-specimens')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  collectSpecimens(
    @CurrentStaff() staff: AuthenticatedStaff,
    @Param('orderCode') code: string,
    @Body() dto: CollectSpecimensDto,
  ) {
    return this.service.collectSpecimens(staff.id, code, dto);
  }
  @Patch('orders/:orderCode/mark-in-transit')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  transit(
    @CurrentStaff() staff: AuthenticatedStaff,
    @Param('orderCode') code: string,
    @Body() dto: ExpectedVersionDto,
  ) {
    return this.service.markInTransit(staff.id, code, dto);
  }
  @Patch('orders/:orderCode/report-failure')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  failure(
    @CurrentStaff() staff: AuthenticatedStaff,
    @Param('orderCode') code: string,
    @Body() dto: ReportCollectionFailureDto,
  ) {
    return this.service.reportFailure(staff.id, code, dto);
  }
}
