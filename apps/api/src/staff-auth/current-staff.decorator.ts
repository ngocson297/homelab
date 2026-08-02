import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { StaffRequest } from './staff-request';
export const CurrentStaff = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<StaffRequest>().staff,
);
