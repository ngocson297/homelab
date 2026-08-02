import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { StaffRole } from '../generated/prisma/enums';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { StaffAuthGuard } from './staff-auth.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles(StaffRole.ADMIN)
@ApiCookieAuth('homelab_staff_session')
export class AdminController {
  @Get('ping')
  @ApiOkResponse({ schema: { example: { status: 'ok', scope: 'admin' } } })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  ping() {
    return { status: 'ok', scope: 'admin' };
  }
}
