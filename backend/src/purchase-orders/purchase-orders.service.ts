import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PurchaseOrderDocument } from '../schemas/purchase-order.schema';
import { POStatus } from '../common/enums';
import { StockMovementType } from '../common/enums';
import { InventoryService } from '../inventory/inventory.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrderDocument.name)
    private model: Model<PurchaseOrderDocument>,
    private inventory: InventoryService,
  ) {}

  private async nextPoNumber(tenantId: string): Promise<string> {
    const last = await this.model.findOne({ tenantId: new Types.ObjectId(tenantId) }).sort({ createdAt: -1 }).lean();
    const num = last ? parseInt(String(last.poNumber).replace(/\D/g, ''), 10) + 1 : 1;
    return `PO-${String(num).padStart(6, '0')}`;
  }

  private toPO(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    const supplier = (o as any).supplierId;
    const lines = (o.lines || []).map((l: any) => ({
      id: l._id?.toString(),
      itemId: (l.itemId?._id || l.itemId)?.toString?.() || l.itemId?.toString?.(),
      item: l.itemId?.name ? { id: l.itemId._id?.toString(), name: l.itemId.name, sku: l.itemId.sku } : undefined,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      receivedQuantity: l.receivedQuantity ?? 0,
    }));
    return {
      id: (o._id || doc._id)?.toString(),
      poNumber: o.poNumber,
      supplierId: (o.supplierId?._id || o.supplierId)?.toString?.(),
      supplier: supplier ? { id: supplier._id?.toString(), name: supplier.name } : undefined,
      status: o.status,
      orderDate: o.orderDate,
      expectedDate: o.expectedDate,
      notes: o.notes,
      lines,
      createdAt: o.createdAt,
      tenantId: o.tenantId?.toString(),
    };
  }

  async create(dto: CreatePurchaseOrderDto, user?: { id: string; tenantId: string }) {
    const tid = user?.tenantId ? new Types.ObjectId(user.tenantId) : undefined;
    const poNumber = await this.nextPoNumber(user!.tenantId);
    const created = await this.model.create({
      poNumber,
      supplierId: new Types.ObjectId(dto.supplierId),
      status: POStatus.DRAFT,
      orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
      expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
      notes: dto.notes,
      createdById: user?.id ? new Types.ObjectId(user.id) : undefined,
      tenantId: tid,
      lines: (dto.lines || []).map((l) => ({
        itemId: new Types.ObjectId(l.itemId),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        receivedQuantity: 0,
      })),
    });
    return this.findOne(created._id.toString(), user!.tenantId);
  }

  async findAll(tenantId: string, filters?: { status?: POStatus }) {
    const q: any = { tenantId: new Types.ObjectId(tenantId) };
    if (filters?.status) q.status = filters.status;
    const docs = await this.model.find(q).populate('supplierId').populate('lines.itemId').sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => this.toPO(d));
  }

  async findOne(id: string, tenantId: string) {
    const doc = await this.model.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) })
      .populate('supplierId').populate('lines.itemId').lean();
    if (!doc) throw new NotFoundException('Purchase order not found');
    return this.toPO(doc);
  }

  async update(id: string, tenantId: string, dto: UpdatePurchaseOrderDto) {
    const po = await this.findOne(id, tenantId);
    if (!po || po.status !== POStatus.DRAFT) throw new BadRequestException('Only draft POs can be edited');
    const tid = new Types.ObjectId(tenantId);
    const update: any = {};
    if (dto.supplierId) update.supplierId = new Types.ObjectId(dto.supplierId);
    if (dto.orderDate) update.orderDate = new Date(dto.orderDate);
    if (dto.expectedDate) update.expectedDate = new Date(dto.expectedDate);
    if (dto.notes !== undefined) update.notes = dto.notes;
    if (dto.lines) {
      update.lines = dto.lines.map((l) => ({
        itemId: new Types.ObjectId(l.itemId),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        receivedQuantity: 0,
      }));
    }
    await this.model.updateOne({ _id: new Types.ObjectId(id), tenantId: tid }, { $set: update });
    return this.findOne(id, tenantId);
  }

  async send(id: string, tenantId: string) {
    const po = await this.findOne(id, tenantId);
    if (!po || po.status !== POStatus.DRAFT) throw new BadRequestException('Only draft POs can be sent');
    await this.model.updateOne(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }, 
      { $set: { status: POStatus.SENT } }
    );
    return this.findOne(id, tenantId);
  }

  async receive(id: string, tenantId: string, body: { lines: { lineId: string; receivedQuantity: number }[] }, user: { id: string; tenantId: string }) {
    const po = await this.findOne(id, tenantId);
    if (!po || (po.status !== POStatus.SENT && po.status !== POStatus.RECEIVED))
      throw new BadRequestException('PO must be in sent/received state');
    const tid = new Types.ObjectId(tenantId);
    const doc = await this.model.findOne({ _id: new Types.ObjectId(id), tenantId: tid }).lean();
    if (!doc) throw new NotFoundException('Purchase order not found');
    const lines = (doc as any).lines || [];
    for (const { lineId, receivedQuantity } of body.lines) {
      const idx = lines.findIndex((l: any) => l._id?.toString() === lineId);
      if (idx < 0) continue;
      const line = lines[idx];
      const prev = Number(line.receivedQuantity) || 0;
      const add = Math.max(0, receivedQuantity - prev);
      if (add > 0) {
        await this.inventory.addMovement(
          (line.itemId as Types.ObjectId).toString(),
          StockMovementType.PURCHASE,
          add,
          { reference: 'purchase_order', referenceId: id, notes: `PO ${po!.poNumber}`, performedBy: user },
        );
      }
      lines[idx] = { ...line, receivedQuantity };
    }
    await this.model.updateOne({ _id: new Types.ObjectId(id), tenantId: tid }, { $set: { lines, status: POStatus.RECEIVED } });
    return this.findOne(id, tenantId);
  }

  async close(id: string, tenantId: string) {
    const po = await this.findOne(id, tenantId);
    if (!po || po.status === POStatus.CLOSED) throw new BadRequestException('PO already closed');
    await this.model.updateOne(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }, 
      { $set: { status: POStatus.CLOSED } }
    );
    return this.findOne(id, tenantId);
  }
}
