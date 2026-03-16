import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { StockMovementDocument } from '../schemas/stock-movement.schema';
import { ItemDocument } from '../schemas/item.schema';
import { StockMovementType } from '../common/enums';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(StockMovementDocument.name)
    private movementModel: Model<StockMovementDocument>,
    @InjectModel(ItemDocument.name)
    private itemModel: Model<ItemDocument>,
  ) {}

  async getBalance(itemId: string, tenantId: string): Promise<number> {
    const id = new Types.ObjectId(itemId);
    const tid = new Types.ObjectId(tenantId);
    const docs = await this.movementModel.find({ itemId: id, tenantId: tid }).lean();
    let balance = 0;
    for (const m of docs) {
      if (m.type === StockMovementType.PURCHASE || m.type === StockMovementType.RETURN || m.type === 'adjustment')
        balance += m.quantity;
      else
        balance -= m.quantity;
    }
    return balance;
  }

  async getBalancesForItems(itemIds: string[], tenantId: string): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const id of itemIds) out[id] = 0;
    if (!itemIds.length) return out;
    const tid = new Types.ObjectId(tenantId);
    const ids = itemIds.map((i) => new Types.ObjectId(i));
    const docs = await this.movementModel.find({ itemId: { $in: ids }, tenantId: tid }).lean();
    for (const m of docs) {
      const id = (m.itemId as Types.ObjectId).toString();
      if (!(id in out)) continue;
      if (m.type === StockMovementType.PURCHASE || m.type === StockMovementType.RETURN || m.type === 'adjustment')
        out[id] += m.quantity;
      else
        out[id] -= m.quantity;
    }
    return out;
  }

  async addMovement(
    itemId: string,
    type: StockMovementType,
    quantity: number,
    opts: {
      reference?: string;
      referenceId?: string;
      notes?: string;
      performedBy?: { id: string; tenantId: string };
      session?: ClientSession;
    },
  ) {
    const tenantId = opts.performedBy?.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant ID required for stock movement');
    const tid = new Types.ObjectId(tenantId);
    const item = await this.itemModel.findOne({ _id: new Types.ObjectId(itemId), tenantId: tid }).lean();
    if (!item) throw new NotFoundException('Item not found');
    const current = await this.getBalance(itemId, tenantId);
    const isIn = type === StockMovementType.PURCHASE || type === StockMovementType.RETURN;
    const delta = type === StockMovementType.ADJUSTMENT ? quantity : isIn ? quantity : -quantity;
    const newBalance = current + delta;
    if (newBalance < 0) throw new BadRequestException('Insufficient stock');
    const createOpts = opts.session ? { session: opts.session } : {};
    const [created] = await this.movementModel.create(
      [
        {
          itemId: new Types.ObjectId(itemId),
          type,
          quantity: type === StockMovementType.ADJUSTMENT ? quantity : Math.abs(quantity),
          balanceAfter: newBalance,
          reference: opts.reference,
          referenceId: opts.referenceId,
          notes: opts.notes,
          performedById: opts.performedBy?.id ? new Types.ObjectId(opts.performedBy.id) : undefined,
          tenantId: tid,
        },
      ],
      createOpts,
    );
    let query = this.movementModel.findById(created._id).populate('itemId');
    if (opts.session) query = query.session(opts.session);
    const doc = await query.lean();
    return this.toMovement(doc);
  }

  private toMovement(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    return {
      id: (o._id || doc._id)?.toString(),
      itemId: (o.itemId?._id || o.itemId)?.toString?.(),
      item: o.itemId?.name ? { id: o.itemId._id?.toString(), name: o.itemId.name, sku: o.itemId.sku } : undefined,
      type: o.type,
      quantity: o.quantity,
      balanceAfter: o.balanceAfter,
      reference: o.reference,
      notes: o.notes,
      createdAt: o.createdAt,
      tenantId: o.tenantId?.toString(),
    };
  }

  async getMovements(tenantId: string, itemId?: string, limit = 50) {
    const q: any = { tenantId: new Types.ObjectId(tenantId) };
    if (itemId) q.itemId = new Types.ObjectId(itemId);
    const docs = await this.movementModel.find(q).populate('itemId').sort({ createdAt: -1 }).limit(limit).lean();
    return docs.map((d: any) => this.toMovement(d));
  }

  async getLowStockItems(tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    const items = await this.itemModel.find({ isActive: true, tenantId: tid }).populate('categoryId').lean();
    const balances = await this.getBalancesForItems(items.map((i: any) => i._id.toString()), tenantId);
    return items
      .filter((i: any) => {
        const stock = balances[i._id.toString()];
        const level = Number(i.reorderLevel);
        // Only flag as low stock if reorderLevel > 0 AND current stock is below it
        return level > 0 && stock < level;
      })
      .map((i: any) => ({
        id: i._id.toString(),
        sku: i.sku,
        name: i.name,
        category: i.categoryId ? { name: i.categoryId.name } : undefined,
        unit: i.unit,
        reorderLevel: Number(i.reorderLevel),
        currentStock: balances[i._id.toString()],
      }));
  }
}
