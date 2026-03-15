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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';

@ApiTags('items')
@ApiBearerAuth()
@Controller('api/items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private items: ItemsService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER)
  create(@Body() dto: CreateItemDto) {
    return this.items.create(dto);
  }

  @Get()
  async list(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.items.findAll({ categoryId, search });
    console.log(`[ItemsController] GET /api/items - found ${result.length} items`);
    return result;
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.items.findByBarcode(barcode);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.items.findOne(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.items.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: string) {
    return this.items.remove(id);
  }

  @Post('bulk-import')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER)
  bulkImport(@Body() body: { csv: string; categoryMap?: Record<string, string> }) {
    return this.items.bulkImportFromCsv(body.csv, body.categoryMap);
  }
}
