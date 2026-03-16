import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'attachments' })
export class AttachmentDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  path: string;

  @Prop()
  entityType: string;

  @Prop()
  entityId: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const AttachmentSchema = SchemaFactory.createForClass(AttachmentDocument);
