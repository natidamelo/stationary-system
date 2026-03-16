import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'roles' })
export class RoleDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;
}

export const RoleSchema = SchemaFactory.createForClass(RoleDocument);
