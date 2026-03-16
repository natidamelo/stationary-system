import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';
import { RoleEnum } from '../common/enums';
import { POStatus } from '../common/enums';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@Controller('api/purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private pos: PurchaseOrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.INVENTORY_CLERK)
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: UserPayload) {
    return this.pos.create(dto, user);
  }

  @Get()
  list(@CurrentUser() user: UserPayload, @Query('status') status?: POStatus) {
    return this.pos.findAll(user.tenantId, { status });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.pos.findOne(id, user.tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.INVENTORY_CLERK)
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto, @CurrentUser() user: UserPayload) {
    return this.pos.update(id, user.tenantId, dto);
  }

  @Post(':id/send')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.INVENTORY_CLERK)
  send(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.pos.send(id, user.tenantId);
  }

  @Post(':id/receive')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK)
  receive(
    @Param('id') id: string,
    @Body() body: { lines: { lineId: string; receivedQuantity: number }[] },
    @CurrentUser() user: UserPayload,
  ) {
    return this.pos.receive(id, user.tenantId, body, user);
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.INVENTORY_CLERK)
  close(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.pos.close(id, user.tenantId);
  }
}
