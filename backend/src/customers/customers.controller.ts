import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@ApiTags('customers')
@Controller('api/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Roles('admin', 'manager', 'reception', 'dealer')
  @ApiOperation({ summary: 'List all customers' })
  async findAll(@Request() req: any) {
    return this.customersService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @Roles('admin', 'manager', 'reception', 'dealer')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.customersService.findById(id, req.user.tenantId);
  }

  @Post()
  @Roles('admin', 'manager', 'reception', 'dealer')
  @ApiOperation({ summary: 'Create new customer' })
  async create(
    @Body()
    body: {
      name: string;
      email: string;
      contact?: string;
      address?: string;
      notes?: string;
    },
    @Request() req: any
  ) {
    return this.customersService.create(body, req.user.tenantId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'reception', 'dealer')
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      email: string;
      contact: string;
      address: string;
      notes: string;
    }>,
    @Request() req: any
  ) {
    return this.customersService.update(id, body, req.user.tenantId);
  }

  @Delete(':id')
  @Roles('admin', 'manager', 'dealer')
  @ApiOperation({ summary: 'Delete customer' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.customersService.delete(id, req.user.tenantId);
  }
}
