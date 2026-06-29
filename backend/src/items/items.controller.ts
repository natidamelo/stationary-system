import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';
import { InventoryService } from '../inventory/inventory.service';

@ApiTags('items')
@ApiBearerAuth()
@Controller('api/items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(
    private items: ItemsService,
    private inventory: InventoryService,
  ) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER, RoleEnum.DEALER)
  create(@Body() dto: CreateItemDto, @Request() req: any) {
    return this.items.create(dto, req.user);
  }

  @Get('next-sku')
  async getNextSku(@Request() req: any) {
    const sku = await this.items.generateNextSku(req.user.tenantId);
    return { sku };
  }

  @Get()
  async list(
    @Request() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('storeId') queryStoreId?: string,
  ) {
    const result = (await this.items.findAll(req.user.tenantId, { categoryId, search })) as any[];
    const cleanResult = result.filter(Boolean);
    
    // Attach stock balances
    const storeId = queryStoreId === 'all' ? undefined : (queryStoreId || req.user.storeId);
    if (cleanResult.length > 0) {
      const itemIds = cleanResult.map(i => i.id);
      const balances = await this.inventory.getBalancesForItems(
        itemIds,
        req.user.tenantId,
        storeId || undefined,
      );
      cleanResult.forEach(i => {
        i.currentStock = balances[i.id] ?? 0;
      });
    } else {
      cleanResult.forEach(i => {
        i.currentStock = 0;
      });
    }

    console.log(`[ItemsController] GET /api/items - found ${cleanResult.length} items with stock balances`);
    return cleanResult;
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string, @Request() req: any) {
    return this.items.findByBarcode(barcode, req.user.tenantId);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: any) {
    return this.items.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER, RoleEnum.DEALER)
  update(@Param('id') id: string, @Body() dto: UpdateItemDto, @Request() req: any) {
    return this.items.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DEALER)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.items.remove(id, req.user.tenantId);
  }

  @Post('bulk-import')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER, RoleEnum.DEALER)
  bulkImport(@Body() body: { csv: string; categoryMap?: Record<string, string> }, @Request() req: any) {
    return this.items.bulkImportFromCsv(body.csv, req.user.tenantId, body.categoryMap);
  }
}
