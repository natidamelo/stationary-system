import { Controller, Get, Post, Delete, Header, Query, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('api/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('stock')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  async stockReport(@CurrentUser() user: UserPayload) {
    return this.reports.stockReport(user.tenantId);
  }

  @Get('stock/period')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  stockReportByPeriod(
    @CurrentUser() user: UserPayload,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'daily'
  ) {
    return this.reports.stockReportByPeriod(user.tenantId, period);
  }

  @Get('stock/csv')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=stock-report.csv')
  async stockReportCsv(@CurrentUser() user: UserPayload) {
    const rows = await this.reports.stockReport(user.tenantId);
    const header = 'SKU,Name,Category,Unit,Reorder Level,Current Stock,Price\n';
    const lines = rows.map(
      (r) =>
        `${r.sku},${r.name},${r.category || ''},${r.unit},${r.reorderLevel},${r.currentStock},${r.price}`,
    );
    return header + lines.join('\n');
  }

  @Get('financial')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  financialSummary(
    @CurrentUser() user: UserPayload,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ) {
    return this.reports.financialSummary(user.tenantId, period);
  }

  @Get('sales')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.RECEPTION)
  salesReport(
    @CurrentUser() user: UserPayload,
    @Query('period') period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' = 'daily'
  ) {
    return this.reports.salesReport(user.tenantId, period);
  }

  @Get('business-overview')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  businessOverview(
    @CurrentUser() user: UserPayload,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ) {
    return this.reports.businessOverview(user.tenantId, period);
  }

  @Get('cost-profit')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  costProfitAnalysis(
    @CurrentUser() user: UserPayload,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ) {
    return this.reports.costProfitAnalysis(user.tenantId, period);
  }

  @Get('service-analytics')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  serviceAnalytics(
    @CurrentUser() user: UserPayload,
    @Query('period') period: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ) {
    return this.reports.serviceAnalytics(user.tenantId, period);
  }

  @Get('inventory')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  inventoryReport(@CurrentUser() user: UserPayload) {
    return this.reports.inventoryReport(user.tenantId);
  }

  @Post('operating-expenses')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  createOperatingExpense(
    @CurrentUser() user: UserPayload,
    @Body() body: { date: string; description: string; amount: number; category?: string },
  ) {
    return this.reports.createOperatingExpense(user.tenantId, body);
  }

  @Delete('operating-expenses/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  deleteOperatingExpense(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.reports.deleteOperatingExpense(id, user.tenantId);
  }
}
