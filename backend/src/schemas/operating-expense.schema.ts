import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'operating_expenses' })
export class OperatingExpenseDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop()
  category: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const OperatingExpenseSchema = SchemaFactory.createForClass(OperatingExpenseDocument);
