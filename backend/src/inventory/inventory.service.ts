import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { StockMovementDocument } from '../schemas/stock-movement.schema';
import { ItemDocument } from '../schemas/item.schema';
import { StockMovementType } from '../common/enums';
import { toObjectId } from '../common/utils';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(StockMovementDocument.name)
    private movementModel: Model<StockMovementDocument>,
    @InjectModel(ItemDocument.name)
    private itemModel: Model<ItemDocument>,
  ) {}

  async getBalance(itemId: string, tenantId: string): Promise<number> {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    const iid = toObjectId(itemId);
    if (!tid || !iid) return 0;

    const docs = await this.movementModel.find({ 
      itemId: iid, 
      $or: [{ tenantId: tid }, { tenantId: cleanTenantId }]
    }).lean();
    
    let balance = 0;
    for (const m of docs) {
      const q = Number(m.quantity) || 0;
      if (m.type === StockMovementType.PURCHASE || m.type === StockMovementType.RETURN || m.type === StockMovementType.ADJUSTMENT || m.type === 'adjustment')
        balance += q;
      else
        balance -= q;
    }
    return balance;
  }

  async getBalancesForItems(itemIds: string[], tenantId: string): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const id of itemIds) out[id] = 0;
    if (!itemIds.length) return out;
    const tid = toObjectId(tenantId);
    if (!tid) return out;
    const ids = itemIds.map((i) => toObjectId(i)).filter((i) => i !== null) as Types.ObjectId[];
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
    try {
      const tenantId = opts.performedBy?.tenantId || '';
      const cleanTenantId = (tenantId || '').trim();
      const tid = toObjectId(cleanTenantId);
      const itemIdObj = toObjectId(itemId);
      if (!tid || !itemIdObj) throw new BadRequestException('Invalid IDs for inventory');

      const item = await this.itemModel.findOne({ 
        _id: itemIdObj, 
        $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
      }).lean();
      if (!item) throw new BadRequestException(`Item not found for this tenant: ${itemId}`);
      
      const current = await this.getBalance(itemId, tenantId);
      const qtyNum = Number(quantity) || 0;
      const isIn = type === StockMovementType.PURCHASE || type === StockMovementType.RETURN;
      const delta = type === StockMovementType.ADJUSTMENT ? qtyNum : isIn ? qtyNum : -qtyNum;
      
      const newBalance = (Number(current) || 0) + delta;
      
      // Hard check for NaN to avoid Mongoose 500
      if (isNaN(newBalance)) {
          throw new BadRequestException(`Invalid stock calculation: result is NaN`);
      }
      
      if (newBalance < 0) throw new BadRequestException(`Insufficient stock for ${item.name}. Current: ${current}, Required: ${Math.abs(delta)}`);
      
      const createOpts = opts.session ? { session: opts.session } : {};
      const [created] = await this.movementModel.create(
        [
          {
            itemId: itemIdObj,
            type,
            quantity: type === StockMovementType.ADJUSTMENT ? qtyNum : Math.abs(qtyNum),
            balanceAfter: newBalance,
            reference: opts.reference,
            referenceId: opts.referenceId,
            notes: opts.notes,
            performedById: toObjectId(opts.performedBy?.id) || undefined,
            tenantId: tid,
          },
        ],
        createOpts,
      );
      
      let query = this.movementModel.findById(created._id).populate('itemId');
      if (opts.session) query = query.session(opts.session);
      const doc = await query.lean();
      return this.toMovement(doc);
    } catch (err: any) {
      console.error('Inventory Error:', err);
      if (err.status) throw err;
      throw new BadRequestException(`Inventory operation failed: ${err.message || String(err)}`);
    }
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
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    if (!tid && !cleanTenantId) return [];
    
    const q: any = { 
       $or: [{ tenantId: tid }, { tenantId: cleanTenantId }]
    };
    
    if (itemId) {
      const iid = toObjectId(itemId);
      if (iid) q.itemId = iid;
    }
    
    const docs = await this.movementModel.find(q)
      .populate('itemId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return docs.map((d: any) => this.toMovement(d));
  }

  async getLowStockItems(tenantId: string) {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    if (!tid && !cleanTenantId) return [];
    
    // Using robust $or query for tenantId
    const items = await this.itemModel.find({ 
      isActive: true, 
      $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
    }).populate('categoryId').lean();
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
