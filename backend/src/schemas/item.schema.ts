import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'items' })
export class ItemDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  sku: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'CategoryDocument' })
  categoryId: Types.ObjectId;

  @Prop({ default: 'unit' })
  unit: string;

  @Prop({ default: 0 })
  reorderLevel: number;

  @Prop({ default: 0 })
  price: number;

  /** Cost per unit (for COGS when item is sold) */
  @Prop({ default: 0 })
  costPrice: number;

  @Prop()
  imageUrl: string;

  @Prop({ sparse: true })
  barcode: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ItemSchema = SchemaFactory.createForClass(ItemDocument);
ItemSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ItemSchema.index({ tenantId: 1, barcode: 1 }, { unique: true, sparse: true });
