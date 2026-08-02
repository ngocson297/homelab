import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  LabTestResponseDto,
  PaginatedLabTestsResponseDto,
} from './dto/lab-test-response.dto';
import { ListLabTestsQueryDto } from './dto/list-lab-tests-query.dto';
import { LabTestsService } from './lab-tests.service';

@ApiTags('lab-tests')
@Controller('lab-tests')
export class LabTestsController {
  constructor(private readonly labTestsService: LabTestsService) {}

  @Get()
  @ApiOperation({ summary: 'List and search laboratory tests' })
  @ApiOkResponse({ type: PaginatedLabTestsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid search or pagination query' })
  findAll(
    @Query() query: ListLabTestsQueryDto,
  ): Promise<PaginatedLabTestsResponseDto> {
    return this.labTestsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a laboratory test by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: LabTestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid laboratory test UUID' })
  @ApiNotFoundResponse({ description: 'Laboratory test not found' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LabTestResponseDto> {
    return this.labTestsService.findOne(id);
  }
}
