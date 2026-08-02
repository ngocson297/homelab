import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffAuthResponseDto } from './dto/staff-auth-response.dto';
import { readSessionCookie } from './cookie';
import { STAFF_SESSION_COOKIE } from './staff-auth.constants';
import { StaffAuthGuard } from './staff-auth.guard';
import { StaffAuthService } from './staff-auth.service';
import { StaffCsrfGuard } from './staff-csrf.guard';
import { CurrentStaff } from './current-staff.decorator';
import type { AuthenticatedStaff } from './staff-request';

@ApiTags('staff-auth')
@Controller('auth/staff')
export class StaffAuthController {
  constructor(
    private readonly auth: StaffAuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(StaffCsrfGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create an HttpOnly staff session' })
  @ApiOkResponse({ type: StaffAuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid login request' })
  @ApiUnauthorizedResponse({ description: 'Invalid login credentials' })
  @ApiTooManyRequestsResponse({ description: 'Login rate limit exceeded' })
  async login(
    @Body() dto: StaffLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StaffAuthResponseDto> {
    const result = await this.auth.login(dto);
    response.cookie(
      STAFF_SESSION_COOKIE,
      result.token,
      this.cookieOptions(result.maxAgeMs),
    );
    return result.response;
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(StaffCsrfGuard)
  @ApiOperation({ summary: 'Revoke the current staff session' })
  @ApiOkResponse({ description: 'Session revoked or already absent' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(readSessionCookie(request.headers.cookie));
    response.clearCookie(STAFF_SESSION_COOKIE, this.cookieOptions(0));
  }

  @Get('me')
  @UseGuards(StaffAuthGuard)
  @ApiCookieAuth('homelab_staff_session')
  @ApiOkResponse({ type: StaffAuthResponseDto })
  @ApiUnauthorizedResponse()
  me(@CurrentStaff() staff: AuthenticatedStaff): StaffAuthResponseDto {
    return {
      user: { email: staff.email, fullName: staff.fullName, role: staff.role },
    };
  }

  private cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/',
      maxAge,
    };
  }
}
