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
import { PurchaseRequestsService } from './purchase-requests.service';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';
import { RoleEnum } from '../common/enums';
import { RequestStatus } from '../common/enums';

@ApiTags('purchase-requests')
@ApiBearerAuth()
@Controller('api/purchase-requests')
@UseGuards(JwtAuthGuard)
export class PurchaseRequestsController {
  constructor(private requests: PurchaseRequestsService) {}

  @Post()
  create(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: UserPayload) {
    return this.requests.create(dto, user);
  }

  @Get('my')
  myRequests(@CurrentUser() user: UserPayload) {
    return this.requests.findAll(user.tenantId, { requestedBy: user.id });
  }

  @Get()
  list(@CurrentUser() user: UserPayload, @Query('status') status?: RequestStatus) {
    return this.requests.findAll(user.tenantId, { status });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.requests.findOne(id, user.tenantId);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.requests.submit(id, user);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  approve(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.requests.approve(id, user);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.requests.reject(id, user, body.reason || 'Rejected');
  }
}
