import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'stock_movements' })
export class StockMovementDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ItemDocument', required: true })
  itemId: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  balanceAfter: number;

  @Prop()
  reference: string;

  @Prop()
  referenceId: string;

  @Prop()
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument' })
  performedById: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovementDocument);
