import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { StaffRole, StaffStatus } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashToken } from '../src/staff-auth/staff-auth.service';

describe('Staff authentication with PostgreSQL', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let prisma: PrismaService;
  const email = 'synthetic.admin@homelab.local';
  const password = 'Synthetic1234';
  const origin = 'http://localhost:3000';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
    prisma = app.get(PrismaService);
    await prisma.staffUser.deleteMany({ where: { email } });
    await prisma.staffUser.create({
      data: {
        email,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        fullName: 'Synthetic Admin',
        role: StaffRole.ADMIN,
        status: StaffStatus.ACTIVE,
      },
    });
  });
  afterAll(async () => {
    await prisma.staffUser.deleteMany({ where: { email } });
    await app.close();
  });

  it('logs in, persists only a token hash, survives me/admin requests, and logs out', async () => {
    const login = await request(server)
      .post('/auth/staff/login')
      .set('Origin', origin)
      .send({ email: ` ${email.toUpperCase()} `, password })
      .expect(200);
    expect(login.body).toEqual({
      user: { email, fullName: 'Synthetic Admin', role: 'ADMIN' },
    });
    expect(login.text).not.toContain('passwordHash');
    expect(login.text).not.toContain('tokenHash');
    const setCookie = login.headers['set-cookie'] as unknown;
    if (!Array.isArray(setCookie) || typeof setCookie[0] !== 'string')
      throw new Error('Expected session cookie');
    const cookie = setCookie[0].split(';')[0] ?? '';
    expect(setCookie[0]).toContain('HttpOnly');
    expect(setCookie[0]).toContain('SameSite=Strict');
    expect(setCookie[0]).toContain('Path=/');
    expect(setCookie[0]).not.toContain('Secure');
    const rawToken = cookie.split('=')[1] ?? '';
    const stored = await prisma.staffSession.findFirstOrThrow({
      where: { staffUser: { email } },
    });
    expect(stored.tokenHash).toBe(hashToken(rawToken));
    expect(stored.tokenHash).not.toBe(rawToken);
    await request(server)
      .get('/auth/staff/me')
      .set('Cookie', cookie)
      .expect(200);
    await request(server)
      .get('/admin/ping')
      .set('Cookie', cookie)
      .expect(200, { status: 'ok', scope: 'admin' });
    const logout = await request(server)
      .post('/auth/staff/logout')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .expect(204);
    expect(String(logout.headers['set-cookie'])).toContain(
      'homelab_staff_session=;',
    );
    await request(server)
      .get('/auth/staff/me')
      .set('Cookie', cookie)
      .expect(401);
    await request(server)
      .post('/auth/staff/logout')
      .set('Origin', origin)
      .expect(204);
  });

  it('uses the same error for wrong and unknown credentials and blocks inactive users', async () => {
    const bodies = [
      { email, password: 'WrongPassword1' },
      { email: 'missing@homelab.local', password },
    ];
    for (const body of bodies) {
      const response = await request(server)
        .post('/auth/staff/login')
        .set('Origin', origin)
        .send(body)
        .expect(401);
      expect(response.text).toContain('Thông tin đăng nhập không hợp lệ.');
    }
    const activeLogin = await request(server)
      .post('/auth/staff/login')
      .set('Origin', origin)
      .send({ email, password })
      .expect(200);
    const activeSetCookie = activeLogin.headers['set-cookie'] as unknown;
    if (
      !Array.isArray(activeSetCookie) ||
      typeof activeSetCookie[0] !== 'string'
    )
      throw new Error('Expected active session cookie');
    const activeCookie = activeSetCookie[0].split(';')[0] ?? '';
    await prisma.staffUser.update({
      where: { email },
      data: { status: StaffStatus.INACTIVE },
    });
    await request(server)
      .get('/auth/staff/me')
      .set('Cookie', activeCookie)
      .expect(401);
    await request(server)
      .post('/auth/staff/login')
      .set('Origin', origin)
      .send({ email, password })
      .expect(401);
    await prisma.staffUser.update({
      where: { email },
      data: { status: StaffStatus.ACTIVE },
    });
  });

  it('rejects absent sessions and cross-origin state changes', async () => {
    await request(server).get('/auth/staff/me').expect(401);
    await request(server).get('/admin/ping').expect(401);
    await request(server)
      .post('/auth/staff/login')
      .set('Origin', 'http://evil.invalid')
      .send({ email, password })
      .expect(403);
  });

  it('rate limits repeated login attempts', async () => {
    let status = 0;
    for (let attempt = 0; attempt < 6 && status !== 429; attempt += 1) {
      status = (
        await request(server)
          .post('/auth/staff/login')
          .set('Origin', origin)
          .send({ email, password: 'WrongPassword1' })
      ).status;
    }
    expect(status).toBe(429);
  });
});
