import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { LookupOrderDto } from './dto/lookup-order.dto';
import { OrderCodeParamDto } from './dto/order-code-param.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import {
  LegacyOrderStatusResponseDto,
  PublicOrderResponseDto,
} from './dto/public-order-response.dto';
import { OrdersService } from './orders.service';
import { OrderLookupRateLimitService } from './order-lookup-rate-limit.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly lookupRateLimit: OrderLookupRateLimitService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a home collection order and appointment' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid request or unavailable laboratory test',
  })
  create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.ordersService.create(dto);
  }

  @Post('lookup')
  @HttpCode(200)
  @ApiOperation({ summary: 'Safely look up an order using code and phone' })
  @ApiOkResponse({ type: PublicOrderResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid lookup request' })
  @ApiNotFoundResponse({
    description: 'No order matches the supplied credentials',
  })
  @ApiTooManyRequestsResponse({ description: 'Lookup rate limit exceeded' })
  lookup(
    @Body() dto: LookupOrderDto,
    @Ip() clientIp: string,
  ): Promise<PublicOrderResponseDto> {
    this.lookupRateLimit.assertAllowed(clientIp || 'unknown-client');
    return this.ordersService.lookup(dto);
  }

  @Get(':orderCode')
  @ApiOperation({
    summary: 'Legacy order status endpoint (no order details)',
    description: 'Public clients must use POST /orders/lookup.',
  })
  @ApiOkResponse({ type: LegacyOrderStatusResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid order code' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  findByOrderCode(
    @Param() params: OrderCodeParamDto,
  ): Promise<LegacyOrderStatusResponseDto> {
    return this.ordersService.findByOrderCode(params.orderCode);
  }
}
