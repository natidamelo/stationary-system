import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class PurchaseRequestLineDoc {
  @Prop({ type: Types.ObjectId, ref: 'ItemDocument', required: true })
  itemId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  reason: string;
}

const PurchaseRequestLineSchema = SchemaFactory.createForClass(PurchaseRequestLineDoc);

@Schema({ collection: 'purchase_requests' })
export class PurchaseRequestDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  requestNumber: string;

  @Prop({ default: 'draft' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument', required: true })
  requestedById: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument' })
  approvedById: Types.ObjectId;

  @Prop()
  approvedAt: Date;

  @Prop()
  rejectionReason: string;

  @Prop({ type: [PurchaseRequestLineSchema], default: [] })
  lines: PurchaseRequestLineDoc[];

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PurchaseRequestSchema = SchemaFactory.createForClass(PurchaseRequestDocument);
