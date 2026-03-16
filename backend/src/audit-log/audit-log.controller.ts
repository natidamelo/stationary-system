import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RoleEnum } from '../common/enums';
import { AuditLogService } from './audit-log.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';

@ApiTags('audit-log')
@ApiBearerAuth()
@Controller('api/audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.DEALER)
export class AuditLogController {
    constructor(private auditService: AuditLogService) { }

    @Get()
    findAll(
        @CurrentUser() user: UserPayload,
        @Query('entity') entity?: string,
        @Query('limit') limit = '100',
        @Query('skip') skip = '0',
    ) {
        return this.auditService.findAll(user.tenantId, {
            entity,
            limit: Number(limit),
            skip: Number(skip),
        });
    }
}
