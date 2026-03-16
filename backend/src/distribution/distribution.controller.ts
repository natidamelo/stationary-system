import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DistributionService } from './distribution.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';
import { RoleEnum } from '../common/enums';

@ApiTags('distribution')
@ApiBearerAuth()
@Controller('api/distribution')
@UseGuards(JwtAuthGuard)
export class DistributionController {
  constructor(private distribution: DistributionService) {}

  @Post('issue')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK, RoleEnum.MANAGER)
  issue(
    @Body()
    body: {
      issuedToUserId?: string;
      department?: string;
      notes?: string;
      lines: { itemId: string; quantity: number }[];
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.distribution.issue(body, user);
  }

  @Get()
  list(@CurrentUser() user: UserPayload) {
    return this.distribution.findAll(user.tenantId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.distribution.findOne(id, user.tenantId);
  }

  @Post('return/:distributionId')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK)
  recordReturn(
    @Param('distributionId') distributionId: string,
    @Body() body: { itemId: string; quantity: number; notes?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.distribution.recordReturn(distributionId, user.tenantId, body, user);
  }

  @Post('damage')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.INVENTORY_CLERK)
  recordDamage(
    @Body() body: { itemId: string; quantity: number; notes?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.distribution.recordDamage(body, user);
  }
}
