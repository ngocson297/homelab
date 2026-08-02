import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const swaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    (process.env.SWAGGER_ENABLED !== 'false' &&
      process.env.NODE_ENV !== 'production');
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('HomeLab API')
      .setDescription(
        'API for the HomeLab at-home specimen collection platform',
      )
      .setVersion('0.1.0')
      .addCookieAuth('homelab_staff_session', {
        type: 'apiKey',
        in: 'cookie',
      })
      .build();
    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, config),
    );
  }

  await app.listen(process.env.API_PORT ?? 3001);
}

void bootstrap();
