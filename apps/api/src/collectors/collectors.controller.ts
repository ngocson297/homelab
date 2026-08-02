import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { StaffRole } from '../generated/prisma/enums';
import { CurrentStaff } from '../staff-auth/current-staff.decorator';
import { Roles } from '../staff-auth/roles.decorator';
import { RolesGuard } from '../staff-auth/roles.guard';
import { StaffAuthGuard } from '../staff-auth/staff-auth.guard';
import { StaffCsrfGuard } from '../staff-auth/staff-csrf.guard';
import type { AuthenticatedStaff } from '../staff-auth/staff-request';
import { CollectorsService } from './collectors.service';
import {
  AssignCollectorDto,
  CollectorListQueryDto,
  EligibleCollectorsQueryDto,
  UnassignCollectorDto,
  UpdateCollectorStatusDto,
  UpdateServiceAreasDto,
} from './dto/collector.dto';

@ApiTags('admin collectors')
@ApiCookieAuth('homelab_staff_session')
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles(StaffRole.ADMIN)
@Controller('admin/collectors')
export class CollectorsController {
  constructor(private readonly service: CollectorsService) {}
  @Get() @Header('Cache-Control', 'private, no-store, max-age=0') list(
    @Query() query: CollectorListQueryDto,
  ) {
    return this.service.list(query);
  }
  @Get(':employeeCode')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  detail(@Param('employeeCode') code: string) {
    return this.service.detail(code);
  }
  @Patch(':employeeCode/status')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  status(
    @Param('employeeCode') code: string,
    @Body() dto: UpdateCollectorStatusDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.service.updateStatus(code, dto, staff.id);
  }
  @Put(':employeeCode/service-areas')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  areas(
    @Param('employeeCode') code: string,
    @Body() dto: UpdateServiceAreasDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.service.updateServiceAreas(code, dto, staff.id);
  }
}

@ApiTags('admin order assignment')
@ApiCookieAuth('homelab_staff_session')
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles(StaffRole.ADMIN)
@Controller('admin/orders')
export class CollectorAssignmentsController {
  constructor(private readonly service: CollectorsService) {}
  @Get(':orderCode/eligible-collectors')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  eligible(
    @Param('orderCode') code: string,
    @Query() query: EligibleCollectorsQueryDto,
  ) {
    return this.service.eligible(code, query);
  }
  @Patch(':orderCode/assign-collector')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  assign(
    @Param('orderCode') code: string,
    @Body() dto: AssignCollectorDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.service.assign(code, dto, staff.id);
  }
  @Patch(':orderCode/unassign-collector')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  unassign(
    @Param('orderCode') code: string,
    @Body() dto: UnassignCollectorDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.service.unassign(code, dto, staff.id);
  }
}
