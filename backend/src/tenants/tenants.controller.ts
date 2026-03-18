import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@ApiTags('tenants')
@Controller('api/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}
  
  @Get('ping')
  @ApiOperation({ summary: 'Public health check for tenants controller' })
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all registered tenants with admin user info (dealer only)' })
  findAll() {
    return this.tenantsService.findAllWithAdmin();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer')
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    console.log(`Updating tenant ${id}:`, updateTenantDto);
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a tenant and all its users (dealer only)' })
  remove(@Param('id') id: string) {
    return this.tenantsService.removeWithUsers(id);
  }

  @Post(':id/give-license')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Give a license to a registered tenant (dealer only)' })
  giveLicense(
    @Param('id') tenantId: string,
    @Body() body: {
      computerId: string;
      duration?: number;
      durationUnit?: 'day' | 'month' | 'year';
      expiryDate?: string;
    },
  ) {
    return this.tenantsService.giveLicense(tenantId, body);
  }

  @Get(':id/licenses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all licenses for a tenant (dealer only)' })
  getLicenses(@Param('id') tenantId: string) {
    return this.tenantsService.getLicensesForTenant(tenantId);
  }
}
