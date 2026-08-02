import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderLookupRateLimitService } from './order-lookup-rate-limit.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderLookupRateLimitService],
})
export class OrdersModule {}
