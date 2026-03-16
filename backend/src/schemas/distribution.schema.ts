import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class DistributionLineDoc {
  @Prop({ type: Types.ObjectId, ref: 'ItemDocument', required: true })
  itemId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;
}

const DistributionLineSchema = SchemaFactory.createForClass(DistributionLineDoc);

@Schema({ collection: 'distributions' })
export class DistributionDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  distributionNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'UserDocument' })
  issuedToUserId: Types.ObjectId;

  @Prop()
  department: string;

  @Prop()
  notes: string;

  @Prop({ type: [DistributionLineSchema], default: [] })
  lines: DistributionLineDoc[];

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const DistributionSchema = SchemaFactory.createForClass(DistributionDocument);
