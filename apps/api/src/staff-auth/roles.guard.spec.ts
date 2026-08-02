import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '../generated/prisma/enums';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue([StaffRole.ADMIN]),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);
  function context(staff?: { role: StaffRole }) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ staff }) }),
    } as never;
  }
  it('allows ADMIN', () =>
    expect(guard.canActivate(context({ role: StaffRole.ADMIN }))).toBe(true));
  it('returns 401 without staff', () =>
    expect(() => guard.canActivate(context())).toThrow(UnauthorizedException));
  it('returns 403 for another role', () =>
    expect(() =>
      guard.canActivate(context({ role: StaffRole.LAB_STAFF })),
    ).toThrow(ForbiddenException));
});
