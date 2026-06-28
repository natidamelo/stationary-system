import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'messages' })
export class MessageDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument', default: null })
  recipientId: Types.ObjectId; // null = send to all

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(MessageDocument);
