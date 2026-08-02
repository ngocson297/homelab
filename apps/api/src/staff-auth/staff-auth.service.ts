import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { StaffRole, StaffStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StaffAuthResponseDto } from './dto/staff-auth-response.dto';
import { GENERIC_LOGIN_ERROR } from './staff-auth.constants';
import type { AuthenticatedStaff } from './staff-request';

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: StaffLoginDto): Promise<{
    response: StaffAuthResponseDto;
    token: string;
    maxAgeMs: number;
  }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.staffUser.findUnique({ where: { email } });
    const passwordValid = user
      ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
      : await this.consumeMissingUserHash(dto.password);
    if (
      !user ||
      !passwordValid ||
      user.status !== StaffStatus.ACTIVE ||
      user.role !== StaffRole.ADMIN
    ) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const token = randomBytes(32).toString('base64url');
    const maxAgeMs = this.sessionMaxAgeMs();
    await this.prisma.transaction(async (tx) => {
      await tx.staffUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await tx.staffSession.create({
        data: {
          staffUserId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + maxAgeMs),
        },
      });
    });
    return {
      response: { user: profile(user) },
      token,
      maxAgeMs,
    };
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedStaff> {
    if (!token) throw new UnauthorizedException();
    const session = await this.prisma.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { staffUser: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.staffUser.status !== StaffStatus.ACTIVE
    ) {
      throw new UnauthorizedException();
    }
    const staleAt = new Date(Date.now() - 15 * 60_000);
    if (!session.lastUsedAt || session.lastUsedAt < staleAt) {
      await this.prisma.staffSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });
    }
    return {
      id: session.staffUser.id,
      sessionId: session.id,
      ...profile(session.staffUser),
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.staffSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessions(staffUserId: string): Promise<void> {
    await this.prisma.staffSession.updateMany({
      where: { staffUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private sessionMaxAgeMs(): number {
    const parsed = Number(this.config.get('STAFF_SESSION_HOURS') ?? 8);
    const hours = Number.isFinite(parsed)
      ? Math.min(168, Math.max(1, parsed))
      : 8;
    return hours * 60 * 60_000;
  }

  private async consumeMissingUserHash(password: string): Promise<false> {
    await argon2.hash(password, { type: argon2.argon2id });
    return false;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function profile(user: { email: string; fullName: string; role: StaffRole }) {
  return { email: user.email, fullName: user.fullName, role: user.role };
}
