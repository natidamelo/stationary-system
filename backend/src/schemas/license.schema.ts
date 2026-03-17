import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LicenseStatus = 'active' | 'expired' | 'suspended';

@Schema({ collection: 'licenses' })
export class LicenseDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  licenseKey: string;

  @Prop({ type: Types.ObjectId, ref: 'CustomerDocument', required: false, default: null })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  computerId: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  expiryDate: Date;

  @Prop({ default: 'active' })
  status: LicenseStatus;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LicenseSchema = SchemaFactory.createForClass(LicenseDocument);
LicenseSchema.index({ computerId: 1, status: 1 });
LicenseSchema.index({ licenseKey: 1 });
LicenseSchema.index({ customerId: 1 });
