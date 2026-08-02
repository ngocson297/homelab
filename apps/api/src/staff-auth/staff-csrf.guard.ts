import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class StaffCsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const origin = context.switchToHttp().getRequest<Request>().headers.origin;
    const allowed =
      this.config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';
    if (origin !== allowed)
      throw new ForbiddenException('Request origin is not allowed');
    return true;
  }
}
