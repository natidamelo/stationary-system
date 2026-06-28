import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserPayload } from '../common/user.types';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a new message or broadcast announcement' })
  create(@Body() dto: CreateMessageDto, @CurrentUser() user: UserPayload) {
    return this.messagesService.create(dto, user.id, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages/announcements' })
  findAll(@CurrentUser() user: UserPayload) {
    return this.messagesService.findAll(user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message log (Admins only)' })
  remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.messagesService.remove(id, user.id, user.tenantId);
  }
}
