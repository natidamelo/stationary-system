import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class InvoiceLineDoc {
  @Prop()
  description: string;

  @Prop()
  sku?: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  total: number;
}

const InvoiceLineSchema = SchemaFactory.createForClass(InvoiceLineDoc);

@Schema({ collection: 'invoices' })
export class InvoiceDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'SaleDocument' })
  saleId?: Types.ObjectId;

  @Prop({ required: true, default: () => new Date() })
  issueDate: Date;

  @Prop()
  customerName: string;

  @Prop()
  customerEmail: string;

  @Prop()
  customerAddress: string;

  @Prop({ type: [InvoiceLineSchema], required: true })
  lines: InvoiceLineDoc[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 0 })
  amountPaid: number;

  @Prop({ default: 'draft' })
  status: string;

  @Prop()
  notes: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(InvoiceDocument);
