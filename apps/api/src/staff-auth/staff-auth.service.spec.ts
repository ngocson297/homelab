import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { StaffRole, StaffStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GENERIC_LOGIN_ERROR } from './staff-auth.constants';
import { hashToken, StaffAuthService } from './staff-auth.service';

describe('StaffAuthService', () => {
  const user = {
    id: 'staff-1',
    email: 'admin@homelab.local',
    fullName: 'Synthetic Admin',
    role: StaffRole.ADMIN,
    status: StaffStatus.ACTIVE,
    passwordHash: '',
    lastLoginAt: null,
    passwordChangedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const staffUser = { findUnique: jest.fn() };
  const staffSession = {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const transactionClient = {
    staffUser: { update: jest.fn() },
    staffSession: { create: jest.fn() },
  };
  const prisma = {
    staffUser,
    staffSession,
    transaction: jest.fn(
      async (fn: (tx: typeof transactionClient) => Promise<unknown>) =>
        fn(transactionClient),
    ),
  };
  const service = new StaffAuthService(
    prisma as unknown as PrismaService,
    {
      get: jest.fn((key: string) =>
        key === 'STAFF_SESSION_HOURS' ? '8' : undefined,
      ),
    } as unknown as ConfigService,
  );

  beforeAll(async () => {
    user.passwordHash = await argon2.hash('Synthetic1234', {
      type: argon2.argon2id,
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    staffUser.findUnique.mockResolvedValue(user);
    transactionClient.staffSession.create.mockResolvedValue({});
    transactionClient.staffUser.update.mockResolvedValue({});
    staffSession.update.mockResolvedValue({});
    staffSession.updateMany.mockResolvedValue({ count: 1 });
  });

  it('normalizes email, creates only a token hash, and returns a safe profile', async () => {
    const result = await service.login({
      email: ' ADMIN@HOMELAB.LOCAL ',
      password: 'Synthetic1234',
    });
    expect(staffUser.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@homelab.local' },
    });
    const createCall = JSON.stringify(
      transactionClient.staffSession.create.mock.calls,
    );
    expect(createCall).toContain(hashToken(result.token));
    expect(createCall).not.toContain(result.token);
    expect(result.response).toEqual({
      user: {
        email: user.email,
        fullName: user.fullName,
        role: StaffRole.ADMIN,
      },
    });
    expect(JSON.stringify(result.response)).not.toContain('passwordHash');
  });

  it('allows active lab staff to create a staff session', async () => {
    staffUser.findUnique.mockResolvedValueOnce({
      ...user,
      email: 'lab01@homelab.local',
      fullName: 'Synthetic Lab Staff',
      role: StaffRole.LAB_STAFF,
    });
    const result = await service.login({
      email: 'lab01@homelab.local',
      password: 'Synthetic1234',
    });
    expect(result.response.user).toEqual({
      email: 'lab01@homelab.local',
      fullName: 'Synthetic Lab Staff',
      role: StaffRole.LAB_STAFF,
    });
  });

  it.each([
    ['wrong password', user, 'WrongPassword1'],
    ['unknown email', null, 'Synthetic1234'],
    [
      'inactive user',
      { ...user, status: StaffStatus.INACTIVE },
      'Synthetic1234',
    ],
  ])('uses the generic error for %s', async (_case, found, password) => {
    staffUser.findUnique.mockResolvedValueOnce(found);
    await expect(
      service.login({ email: user.email, password }),
    ).rejects.toMatchObject({ response: { message: GENERIC_LOGIN_ERROR } });
  });

  it.each([
    [
      'expired',
      { expiresAt: new Date(Date.now() - 1), revokedAt: null, staffUser: user },
    ],
    [
      'revoked',
      {
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
        staffUser: user,
      },
    ],
    [
      'inactive',
      {
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        staffUser: { ...user, status: StaffStatus.INACTIVE },
      },
    ],
  ])('rejects an %s session', async (_case, values) => {
    staffSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      tokenHash: hashToken('raw'),
      lastUsedAt: new Date(),
      ...values,
    });
    await expect(service.authenticate('raw')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('authenticates an active session and throttles last-used writes', async () => {
    staffSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      lastUsedAt: new Date(),
      staffUser: user,
    });
    await expect(service.authenticate('raw')).resolves.toEqual(
      expect.objectContaining({ email: user.email, sessionId: 'session-1' }),
    );
    expect(staffSession.update).not.toHaveBeenCalled();
  });

  it('revokes logout and all-user sessions without storing the token', async () => {
    await service.logout('raw-token');
    expect(staffSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: hashToken('raw-token'), revokedAt: null },
      }),
    );
    await service.revokeAllSessions(user.id);
    expect(staffSession.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { staffUserId: user.id, revokedAt: null },
      }),
    );
  });
});
