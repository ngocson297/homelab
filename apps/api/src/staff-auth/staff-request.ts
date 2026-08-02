import type { Request } from 'express';
import type { StaffProfileDto } from './dto/staff-auth-response.dto';

export type AuthenticatedStaff = StaffProfileDto & {
  id: string;
  sessionId: string;
};
export type StaffRequest = Request & { staff?: AuthenticatedStaff };
