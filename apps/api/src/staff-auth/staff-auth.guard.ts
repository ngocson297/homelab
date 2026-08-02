import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { StaffAuthService } from './staff-auth.service';
import { readSessionCookie } from './cookie';
import type { StaffRequest } from './staff-request';

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(private readonly auth: StaffAuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StaffRequest>();
    request.staff = await this.auth.authenticate(
      readSessionCookie(request.headers.cookie),
    );
    return true;
  }
}
