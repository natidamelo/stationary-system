import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'audit_logs' })
export class AuditLogDocument extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TenantDocument' })
  tenantId: Types.ObjectId;

    @Prop({ required: true })
    action: string; // e.g. "CREATE_ITEM", "APPROVE_PR", "DELETE_SUPPLIER"

    @Prop({ required: true })
    entity: string; // e.g. "Item", "PurchaseRequest"

    @Prop()
    entityId?: string;

    @Prop({ type: Object })
    changes?: Record<string, any>; // before/after values

    @Prop({ type: Types.ObjectId, ref: 'UserDocument' })
    performedById?: Types.ObjectId;

    @Prop()
    performedByName?: string;

    @Prop({ default: Date.now })
    createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLogDocument);
