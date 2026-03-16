import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';

@ApiTags('services')
@ApiBearerAuth()
@Controller('api/services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private services: ServicesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: UserPayload) {
    return this.services.create(dto, user.tenantId);
  }

  @Get()
  list(@CurrentUser() user: UserPayload) {
    return this.services.findAll(user.tenantId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.services.findOne(id, user.tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto, @CurrentUser() user: UserPayload) {
    return this.services.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.services.remove(id, user.tenantId);
  }
}
