import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Lab tests API with PostgreSQL', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('searches seeded catalog records through Prisma', async () => {
    const response = await request(app.getHttpServer())
      .get('/lab-tests?search=Complete%20Blood&homeCollectable=true')
      .expect(200);

    expect(response.text).toContain('"code":"CBC"');
    expect(response.text).toContain('"homeCollectable":true');
  });

  it('keeps inactive records visible as part of the public catalog contract', async () => {
    const response = await request(app.getHttpServer())
      .get('/lab-tests?search=VITD')
      .expect(200);

    expect(response.text).toContain('"code":"VITD"');
    expect(response.text).toContain('"status":"INACTIVE"');
  });
});
