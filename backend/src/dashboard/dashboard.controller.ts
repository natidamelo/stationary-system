import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SalesChartPeriod } from './dashboard.service';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: UserPayload) {
    return this.dashboard.getSummary(user.tenantId);
  }

  @Get('stock-summary')
  stockSummary(@CurrentUser() user: UserPayload) {
    return this.dashboard.getStockSummary(user.tenantId);
  }

  @Get('sales-chart')
  salesChart(@CurrentUser() user: UserPayload, @Query('period') period: SalesChartPeriod = 'week') {
    return this.dashboard.getSalesChart(user.tenantId, period);
  }
}
