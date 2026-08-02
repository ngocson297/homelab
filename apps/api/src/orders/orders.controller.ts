import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderCodeParamDto } from './dto/order-code-param.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a home collection order and appointment' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid request or unavailable laboratory test',
  })
  create(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.ordersService.create(dto);
  }

  @Get(':orderCode')
  @ApiOperation({ summary: 'Get an order by its public order code' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid order code' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  findByOrderCode(
    @Param() params: OrderCodeParamDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findByOrderCode(params.orderCode);
  }
}
