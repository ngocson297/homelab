import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('system')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Check API availability' })
  @ApiOkResponse({
    schema: { example: { status: 'ok', service: 'homelab-api' } },
  })
  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'homelab-api' };
  }
}
