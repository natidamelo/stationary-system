import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('api/suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private suppliers: SuppliersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.INVENTORY_CLERK)
  create(@Body() dto: CreateSupplierDto, @Request() req: any) {
    return this.suppliers.create(dto, req.user.tenantId);
  }

  @Get()
  list(@Request() req: any) {
    return this.suppliers.findAll(req.user.tenantId);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: any) {
    return this.suppliers.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.INVENTORY_CLERK)
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Request() req: any) {
    return this.suppliers.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.suppliers.remove(id, req.user.tenantId);
  }
}
