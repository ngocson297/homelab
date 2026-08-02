import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '../generated/prisma/enums';
export const STAFF_ROLES_KEY = 'staff_roles';
export const Roles = (...roles: StaffRole[]) =>
  SetMetadata(STAFF_ROLES_KEY, roles);
