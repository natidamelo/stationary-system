import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LicenseService } from './license.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';

@ApiTags('license')
@Controller('api/license')
export class LicenseController {
  constructor(private licenseService: LicenseService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate license for a computer (used during login)' })
  async validate(@Body() body: { computerId: string; tenantId?: string }) {
    // If tenantId is not provided, we might need to handle it or error
    return this.licenseService.validateLicense(body.computerId, body.tenantId || '');
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get license status for current computer (authenticated)' })
  async status(@CurrentUser() user: UserPayload, @Query('computerId') computerId: string) {
    return this.licenseService.getLicenseInfo(computerId || '', user.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all licenses (admin)' })
  async findAll(@CurrentUser() user: UserPayload) {
    return this.licenseService.findAll(user.tenantId);
  }

  @Get('by-key/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get license by key (admin)' })
  async findByKey(@Param('key') key: string, @CurrentUser() user: UserPayload) {
    return this.licenseService.findByKey(user.tenantId, key);
  }

  @Get('by-customer/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get licenses for a customer (admin)' })
  async findByCustomer(@Param('customerId') customerId: string, @CurrentUser() user: UserPayload) {
    return this.licenseService.findByCustomer(user.tenantId, customerId);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate new license for customer (admin)' })
  async generate(
    @CurrentUser() user: UserPayload,
    @Body()
    body: {
      customerId: string;
      computerId: string;
      startDate?: string;
      durationYears?: number;
      duration?: number;
      durationUnit?: 'day' | 'month' | 'year';
      expiryDate?: string;
    },
  ) {
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined;
    return this.licenseService.generateLicense(user.tenantId, {
      customerId: body.customerId,
      computerId: body.computerId,
      startDate,
      durationYears: body.durationYears,
      duration: body.duration,
      durationUnit: body.durationUnit,
      expiryDate,
    });
  }

  @Post('extend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extend license expiry (renewal)' })
  async extend(
    @CurrentUser() user: UserPayload,
    @Body() body: { 
      licenseKey: string; 
      extendYears?: number;
      duration?: number;
      durationUnit?: 'day' | 'month' | 'year';
      expiryDate?: string;
    },
  ) {
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined;
    return this.licenseService.extendLicense(
      user.tenantId,
      body.licenseKey,
      body.extendYears,
      body.duration,
      body.durationUnit,
      expiryDate,
    );
  }

  @Post('update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update existing license (dealer)' })
  async update(
    @CurrentUser() user: UserPayload,
    @Body()
    body: {
      id: string;
      customerId: string;
      computerId: string;
      durationYears?: number;
      duration?: number;
      durationUnit?: 'day' | 'month' | 'year';
      expiryDate?: string;
    },
  ) {
    const expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined;
    return this.licenseService.updateLicense(user.tenantId, {
      ...body,
      expiryDate,
    });
  }

  @Post('suspend/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend license (admin)' })
  async suspend(@Param('key') key: string, @CurrentUser() user: UserPayload) {
    return this.licenseService.suspend(user.tenantId, key);
  }

  @Post('reactivate/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('dealer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate suspended license (admin)' })
  async reactivate(@Param('key') key: string, @CurrentUser() user: UserPayload) {
    return this.licenseService.reactivate(user.tenantId, key);
  }
}
