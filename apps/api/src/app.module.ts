import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { LabTestsModule } from './lab-tests/lab-tests.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { StaffAuthModule } from './staff-auth/staff-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    LabTestsModule,
    OrdersModule,
    StaffAuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
