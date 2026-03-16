import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';
import { RoleEnum } from '../common/enums';
import { StockMovementType } from '../common/enums';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('api/inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get('balance/:itemId')
  getBalance(@Param('itemId') itemId: string, @CurrentUser() user: UserPayload) {
    return this.inventory.getBalance(itemId, user.tenantId);
  }

  @Get('movements')
  getMovements(
    @CurrentUser() user: UserPayload,
    @Query('itemId') itemId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventory.getMovements(
      user.tenantId,
      itemId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('low-stock')
  getLowStock(@CurrentUser() user: UserPayload) {
    return this.inventory.getLowStockItems(user.tenantId);
  }

  @Post('adjustment')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER)
  adjustment(
    @Body() body: { itemId: string; quantity: number; notes?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.inventory.addMovement(
      body.itemId,
      StockMovementType.ADJUSTMENT,
      body.quantity,
      {
        notes: body.notes,
        reference: 'manual',
        performedBy: user,
      },
    );
  }
}
