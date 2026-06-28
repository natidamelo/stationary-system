import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MessageDocument } from '../schemas/message.schema';
import { UserDocument } from '../schemas/user.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { toObjectId } from '../common/utils';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(MessageDocument.name)
    private messageModel: Model<MessageDocument>,
    @InjectModel(UserDocument.name)
    private userModel: Model<UserDocument>,
  ) {}

  private toMessage(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    
    let sender = null;
    if (o.senderId) {
      sender = {
        id: o.senderId._id?.toString() || o.senderId.toString(),
        fullName: o.senderId.fullName || 'Unknown',
        role: o.senderId.roleId?.name || 'User',
      };
    }

    let recipient = null;
    if (o.recipientId) {
      recipient = {
        id: o.recipientId._id?.toString() || o.recipientId.toString(),
        fullName: o.recipientId.fullName || 'Unknown',
        role: o.recipientId.roleId?.name || 'User',
      };
    }

    return {
      id: (o._id || doc._id)?.toString(),
      senderId: o.senderId?._id?.toString() || o.senderId?.toString(),
      recipientId: o.recipientId?._id?.toString() || o.recipientId?.toString() || null,
      content: o.content,
      createdAt: o.createdAt,
      sender,
      recipient,
    };
  }

  async create(dto: CreateMessageDto, senderId: string, tenantId: string) {
    const tid = toObjectId(tenantId);
    const uid = toObjectId(senderId);
    if (!tid || !uid) throw new BadRequestException('Invalid context');

    const recipientId = dto.recipientId ? toObjectId(dto.recipientId) : null;

    const created = await this.messageModel.create({
      tenantId: tid,
      senderId: uid,
      recipientId,
      content: dto.content,
    });

    const doc = await this.messageModel
      .findById(created._id)
      .populate({
        path: 'senderId',
        populate: { path: 'roleId' },
      })
      .populate({
        path: 'recipientId',
        populate: { path: 'roleId' },
      })
      .exec();

    return this.toMessage(doc);
  }

  async findAll(tenantId: string) {
    const tid = toObjectId(tenantId);
    if (!tid) return [];

    const docs = await this.messageModel
      .find({ tenantId: tid })
      .populate({
        path: 'senderId',
        populate: { path: 'roleId' },
      })
      .populate({
        path: 'recipientId',
        populate: { path: 'roleId' },
      })
      .sort({ createdAt: 1 }) // Chronological order
      .exec();

    return docs.map((d) => this.toMessage(d));
  }

  async remove(id: string, userId: string, tenantId: string) {
    const tid = toObjectId(tenantId);
    const mid = toObjectId(id);
    const uid = toObjectId(userId);
    if (!tid || !mid || !uid) throw new BadRequestException('Invalid ID format');

    // Only allow administrators to delete logs to preserve evidence
    const user = await this.userModel.findById(uid).populate('roleId').exec();
    if (!user || (user.roleId as any)?.name !== 'admin') {
      throw new ForbiddenException('Only administrators can delete logs to preserve evidence');
    }

    const message = await this.messageModel.findOne({ _id: mid, tenantId: tid }).exec();
    if (!message) throw new NotFoundException('Message not found');

    await this.messageModel.deleteOne({ _id: mid, tenantId: tid });
    return { success: true };
  }
}
