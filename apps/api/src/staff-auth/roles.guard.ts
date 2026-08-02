import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { STAFF_ROLES_KEY } from './roles.decorator';
import type { StaffRole } from '../generated/prisma/enums';
import type { StaffRequest } from './staff-request';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles =
      this.reflector.getAllAndOverride<StaffRole[]>(STAFF_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const staff = context.switchToHttp().getRequest<StaffRequest>().staff;
    if (!staff) throw new UnauthorizedException();
    if (roles.length && !roles.includes(staff.role))
      throw new ForbiddenException();
    return true;
  }
}
