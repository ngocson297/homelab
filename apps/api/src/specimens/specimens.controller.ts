import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { StaffRole } from '../generated/prisma/client';
import { CurrentStaff } from '../staff-auth/current-staff.decorator';
import { Roles } from '../staff-auth/roles.decorator';
import { RolesGuard } from '../staff-auth/roles.guard';
import { StaffAuthGuard } from '../staff-auth/staff-auth.guard';
import { StaffCsrfGuard } from '../staff-auth/staff-csrf.guard';
import type { AuthenticatedStaff } from '../staff-auth/staff-request';
import {
  LabSpecimenListQueryDto,
  LabelsPrintedDto,
  PrepareSpecimensDto,
  ReceiveSpecimenDto,
  RejectSpecimenDto,
  ScanSpecimenDto,
  VersionedOperationDto,
} from './dto/specimen.dto';
import { SpecimensService } from './specimens.service';
import {
  LabSpecimenDetailResponseDto,
  LabSpecimenListResponseDto,
  LabSummaryResponseDto,
  LabelsPrintedResponseDto,
  PrepareSpecimensResponseDto,
  SpecimenLabelsResponseDto,
} from './dto/specimen-response.dto';

@ApiTags('specimens - admin')
@ApiCookieAuth('homelab_staff_session')
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles(StaffRole.ADMIN, StaffRole.LAB_STAFF)
@Controller('admin/orders')
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
export class AdminSpecimensController {
  constructor(private readonly specimens: SpecimensService) {}

  @Post(':orderCode/specimens/prepare')
  @HttpCode(200)
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Prepare an atomic specimen plan from snapshots' })
  @ApiOkResponse({ type: PrepareSpecimensResponseDto })
  @ApiConflictResponse({ description: 'Stale version or invalid plan state' })
  @ApiNotFoundResponse()
  prepare(
    @Param('orderCode') orderCode: string,
    @Body() dto: PrepareSpecimensDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.specimens.prepare(orderCode, dto, staff);
  }

  @Get(':orderCode/specimen-labels')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Get protected specimen label print data' })
  @ApiOkResponse({ type: SpecimenLabelsResponseDto })
  @ApiConflictResponse({ description: 'Specimen plan has not been prepared' })
  @ApiNotFoundResponse()
  labels(@Param('orderCode') orderCode: string) {
    return this.specimens.labels(orderCode);
  }

  @Post(':orderCode/specimen-labels/printed')
  @HttpCode(200)
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Append idempotent label print custody events' })
  @ApiOkResponse({ type: LabelsPrintedResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  @ApiNotFoundResponse()
  printed(
    @Param('orderCode') orderCode: string,
    @Body() dto: LabelsPrintedDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.specimens.recordPrinted(orderCode, dto, staff);
  }
}

@ApiTags('specimens - laboratory')
@ApiCookieAuth('homelab_staff_session')
@UseGuards(StaffAuthGuard, RolesGuard)
@Roles(StaffRole.LAB_STAFF)
@Controller('lab/specimens')
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
export class LabSpecimensController {
  constructor(private readonly specimens: SpecimensService) {}

  @Get('summary')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Get aggregate laboratory intake counts' })
  @ApiOkResponse({ type: LabSummaryResponseDto })
  summary() {
    return this.specimens.labSummary();
  }

  @Get()
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'List laboratory specimens with pagination' })
  @ApiOkResponse({ type: LabSpecimenListResponseDto })
  list(@Query() query: LabSpecimenListQueryDto) {
    return this.specimens.labList(query);
  }

  @Post('scan')
  @HttpCode(200)
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Look up a specimen by barcode without mutation' })
  @ApiOkResponse({ type: LabSpecimenDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Generic specimen not found response' })
  scan(@Body() dto: ScanSpecimenDto) {
    return this.specimens.scan(dto);
  }

  @Get(':specimenCode')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Get laboratory specimen and custody detail' })
  @ApiOkResponse({ type: LabSpecimenDetailResponseDto })
  @ApiNotFoundResponse()
  detail(@Param('specimenCode') specimenCode: string) {
    return this.specimens.labDetail(specimenCode);
  }

  @Patch(':specimenCode/receive')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Receive an in-transit specimen' })
  @ApiOkResponse({ type: LabSpecimenDetailResponseDto })
  @ApiConflictResponse({ description: 'Stale version or invalid state' })
  @ApiNotFoundResponse()
  receive(
    @Param('specimenCode') specimenCode: string,
    @Body() dto: ReceiveSpecimenDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.specimens.receive(specimenCode, dto, staff);
  }

  @Patch(':specimenCode/accept')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Accept a received specimen' })
  @ApiOkResponse({ type: LabSpecimenDetailResponseDto })
  @ApiConflictResponse({ description: 'Stale version or invalid state' })
  @ApiNotFoundResponse()
  accept(
    @Param('specimenCode') specimenCode: string,
    @Body() dto: VersionedOperationDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.specimens.accept(specimenCode, dto, staff);
  }

  @Patch(':specimenCode/reject')
  @UseGuards(StaffCsrfGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @ApiOperation({ summary: 'Reject an in-transit or received specimen' })
  @ApiOkResponse({ type: LabSpecimenDetailResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'Stale version or invalid state' })
  @ApiNotFoundResponse()
  reject(
    @Param('specimenCode') specimenCode: string,
    @Body() dto: RejectSpecimenDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.specimens.reject(specimenCode, dto, staff);
  }
}
