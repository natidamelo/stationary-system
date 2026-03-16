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

@ApiTags('categories')
@ApiBearerAuth()
@Controller('api/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER)
  create(@Body() body: { name: string; description?: string }, @Request() req: any) {
    return this.categories.create(body.name, req.user.tenantId, body.description);
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
    @Body() body: { name?: string; description?: string },
    @Request() req: any
  ) {
    return this.categories.update(id, req.user.tenantId, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.categories.remove(id, req.user.tenantId);
  }
}
