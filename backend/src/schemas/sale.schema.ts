import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class SaleLineDoc {
  @Prop({ type: Types.ObjectId, ref: 'ItemDocument' })
  itemId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceDocument' })
  serviceId?: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  /** Unit cost at time of sale (for COGS) */
  @Prop({ default: 0 })
  unitCost: number;

  @Prop({ required: true })
  total: number;
}

const SaleLineSchema = SchemaFactory.createForClass(SaleLineDoc);

@Schema({ collection: 'sales' })
export class SaleDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  saleNumber: string;

  @Prop({ required: true, default: () => new Date() })
  soldAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument', required: true })
  soldById: Types.ObjectId;

  @Prop({ type: [SaleLineSchema], required: true })
  lines: SaleLineDoc[];

  @Prop({ required: true })
  totalAmount: number;

  /** Amount paid so far (can be less than totalAmount for partial/credit sales) */
  @Prop({ default: 0 })
  amountPaid: number;

  @Prop()
  customerName: string;

  @Prop()
  notes: string;

  @Prop({ default: 'cash' })
  paymentMethod: string;
}

export const SaleSchema = SchemaFactory.createForClass(SaleDocument);
