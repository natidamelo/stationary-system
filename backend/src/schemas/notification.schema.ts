import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationType =
  | 'low_stock'
  | 'po_approved'
  | 'po_sent'
  | 'pr_approved'
  | 'pr_rejected'
  | 'invoice_created'
  | 'system';

@Schema({ collection: 'notifications' })
export class NotificationDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, default: 'system' })
  type: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument' })
  userId?: Types.ObjectId; // null = broadcast to all

  @Prop()
  link?: string; // optional frontend route to navigate to

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationDocument);
