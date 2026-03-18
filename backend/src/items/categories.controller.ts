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
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('api/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER)
  create(@Body() dto: CreateCategoryDto, @Request() req: any) {
    return this.categories.create(dto.name, req.user.tenantId, dto.description);
  }

  @Get()
  list(@Request() req: any) {
    return this.categories.findAll(req.user.tenantId);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: any) {
    return this.categories.findOne(id, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Request() req: any
  ) {
    return this.categories.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.categories.remove(id, req.user.tenantId);
  }
}
