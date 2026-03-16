import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class PurchaseOrderLineDoc {
  @Prop({ type: Types.ObjectId, ref: 'ItemDocument', required: true })
  itemId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ default: 0 })
  receivedQuantity: number;
}

const PurchaseOrderLineSchema = SchemaFactory.createForClass(PurchaseOrderLineDoc);

@Schema({ collection: 'purchase_orders' })
export class PurchaseOrderDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  poNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'SupplierDocument', required: true })
  supplierId: Types.ObjectId;

  @Prop({ default: 'draft' })
  status: string;

  @Prop()
  orderDate: Date;

  @Prop()
  expectedDate: Date;

  @Prop()
  notes: string;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument' })
  createdById: Types.ObjectId;

  @Prop({ type: [PurchaseOrderLineSchema], default: [] })
  lines: PurchaseOrderLineDoc[];

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrderDocument);
