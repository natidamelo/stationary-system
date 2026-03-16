import { Controller, Get, Param, Post, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('api/invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoices: InvoicesService) { }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.RECEPTION, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DEALER)
  list(@Request() req: any) {
    return this.invoices.findAll(req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.RECEPTION, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DEALER)
  getOne(@Param('id') id: string, @Request() req: any) {
    return this.invoices.findOne(id, req.user.tenantId);
  }

  @Post('from-sale')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.RECEPTION, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DEALER)
  createFromSale(
    @Body() body: { saleId: string; customerEmail?: string; customerAddress?: string },
    @Request() req: any
  ) {
    return this.invoices.createFromSale(body.saleId, req.user.tenantId, {
      customerEmail: body.customerEmail,
      customerAddress: body.customerAddress,
    });
  }

  @Put(':id/pay')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.RECEPTION, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DEALER)
  markPaid(@Param('id') id: string, @Body() body: { amountPaid?: number }, @Request() req: any) {
    return this.invoices.markPaid(id, req.user.tenantId, body.amountPaid);
  }
}
