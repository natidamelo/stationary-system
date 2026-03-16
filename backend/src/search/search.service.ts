import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ItemDocument } from '../schemas/item.schema';
import { SupplierDocument } from '../schemas/supplier.schema';
import { PurchaseOrderDocument } from '../schemas/purchase-order.schema';
import { PurchaseRequestDocument } from '../schemas/purchase-request.schema';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(ItemDocument.name)
    private itemModel: Model<ItemDocument>,
    @InjectModel(SupplierDocument.name)
    private supplierModel: Model<SupplierDocument>,
    @InjectModel(PurchaseOrderDocument.name)
    private poModel: Model<PurchaseOrderDocument>,
    @InjectModel(PurchaseRequestDocument.name)
    private prModel: Model<PurchaseRequestDocument>,
  ) {}

  async globalSearch(tenantId: string, q: string) {
    if (!q?.trim() || q.trim().length < 2) {
      return { items: [], suppliers: [], purchaseOrders: [], purchaseRequests: [] };
    }
    const tid = new Types.ObjectId(tenantId);
    const term = new RegExp(q.trim(), 'i');
    const [items, suppliers, purchaseOrders, purchaseRequests] = await Promise.all([
      this.itemModel.find({ tenantId: tid, $or: [{ name: term }, { sku: term }] }).populate('categoryId').limit(20).lean(),
      this.supplierModel.find({ tenantId: tid, $or: [{ name: term }, { contactPerson: term }] }).limit(20).lean(),
      this.poModel.find({ tenantId: tid, poNumber: term }).populate('supplierId').limit(20).lean(),
      this.prModel.find({ tenantId: tid, requestNumber: term }).limit(20).lean(),
    ]);
    return {
      items: items.map((d: any) => ({ id: d._id.toString(), ...d, categoryId: d.categoryId?._id?.toString(), category: d.categoryId })),
      suppliers: suppliers.map((d: any) => ({ id: d._id.toString(), ...d })),
      purchaseOrders: purchaseOrders.map((d: any) => ({ id: d._id.toString(), ...d, supplierId: d.supplierId?._id?.toString(), supplier: d.supplierId })),
      purchaseRequests: purchaseRequests.map((d: any) => ({ id: d._id.toString(), ...d })),
    };
  }
}
