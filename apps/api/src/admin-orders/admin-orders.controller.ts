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
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { StaffRole } from '../generated/prisma/enums';
import { CurrentStaff } from '../staff-auth/current-staff.decorator';
import { Roles } from '../staff-auth/roles.decorator';
import { RolesGuard } from '../staff-auth/roles.guard';
import { StaffAuthGuard } from '../staff-auth/staff-auth.guard';
import { StaffCsrfGuard } from '../staff-auth/staff-csrf.guard';
import type { AuthenticatedStaff } from '../staff-auth/staff-request';
import { AdminOrdersService } from './admin-orders.service';
import {
  AdminOrderListQueryDto,
  CancelOrderDto,
  ExpectedVersionDto,
  RescheduleAppointmentDto,
} from './dto/admin-order.dto';

@ApiTags('admin orders')
@ApiCookieAuth('homelab_staff_session')
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@Controller('admin/orders')
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles(StaffRole.ADMIN)
export class AdminOrdersController {
  constructor(private readonly service: AdminOrdersService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOkResponse({ description: 'Paginated, filtered admin order list' })
  list(@Query() query: AdminOrderListQueryDto) {
    return this.service.list(query);
  }

  @Get('summary')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOkResponse({ description: 'Order counts by status' })
  summary() {
    return this.service.summary();
  }

  @Get(':orderCode')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOkResponse({
    description: 'Operational order detail for an authenticated admin',
  })
  @ApiNotFoundResponse()
  detail(@Param('orderCode') orderCode: string) {
    return this.service.detail(orderCode);
  }

  @Patch(':orderCode/confirm')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @UseGuards(StaffCsrfGuard)
  @ApiOkResponse({ description: 'Confirmed order' })
  @ApiConflictResponse({ description: 'Invalid transition or stale version' })
  confirm(
    @Param('orderCode') orderCode: string,
    @Body() dto: ExpectedVersionDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.service.confirm(orderCode, dto, staff.id);
  }

  @Patch(':orderCode/cancel')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @UseGuards(StaffCsrfGuard)
  @ApiOkResponse({ description: 'Cancelled order' })
  @ApiConflictResponse({ description: 'Invalid transition or stale version' })
  cancel(
    @Param('orderCode') orderCode: string,
    @Body() dto: CancelOrderDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.service.cancel(orderCode, dto, staff.id);
  }

  @Patch(':orderCode/appointment')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @UseGuards(StaffCsrfGuard)
  @ApiOkResponse({ description: 'Rescheduled appointment' })
  @ApiConflictResponse({ description: 'Invalid transition or stale version' })
  reschedule(
    @Param('orderCode') orderCode: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.service.reschedule(orderCode, dto, staff.id);
  }
}
