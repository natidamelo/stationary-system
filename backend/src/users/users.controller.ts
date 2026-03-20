import { Controller, Get, Post, Put, Body, UseGuards, Patch, Param, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@ApiTags('users')
@ApiBearerAuth()
@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'List all users in the tenant' })
  async list(@CurrentUser() user: UserPayload) {
    return this.users.findAll(user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Create a new user in the tenant' })
  async create(@CurrentUser() user: UserPayload, @Body() dto: CreateUserDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    return this.users.create({
      ...dto,
      passwordHash: hashed,
      tenantId: user.tenantId,
    });
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Update user profile details' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.users.update(id, data);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Update user status (active/inactive)' })
  async updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.users.update(id, { isActive });
  }

  @Patch(':id/password')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Update/Reset user password' })
  async updatePassword(@Param('id') id: string, @Body('password') pass: string) {
    const hashed = await bcrypt.hash(pass, 10);
    return this.users.updatePassword(id, hashed);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.DEALER, RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Delete a user' })
  async remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
