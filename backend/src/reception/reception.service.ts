import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SaleDocument } from '../schemas/sale.schema';
import { ItemDocument } from '../schemas/item.schema';
import { ServiceDocument } from '../schemas/service.schema';
import { StockMovementType } from '../common/enums';
import { InventoryService } from '../inventory/inventory.service';
import { toObjectId } from '../common/utils';

@Injectable()
export class ReceptionService {
  constructor(
    @InjectModel(SaleDocument.name)
    private saleModel: Model<SaleDocument>,
    @InjectModel(ItemDocument.name)
    private itemModel: Model<ItemDocument>,
    @InjectModel(ServiceDocument.name)
    private serviceModel: Model<ServiceDocument>,
    private inventory: InventoryService,
  ) {}

  private async nextSaleNumber(tenantId: string): Promise<string> {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    if (!tid && !cleanTenantId) return `SAL-${Date.now()}`;
    const last = await this.saleModel.findOne({ 
      $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
    }).sort({ soldAt: -1 }).lean();
    let num = 1;
    if (last && last.saleNumber) {
        const match = last.saleNumber.match(/(\d+)$/);
        if (match) {
            num = parseInt(match[1], 10) + 1;
        }
    }
    // Prepend tenant prefix and append timestamp to guarantee uniqueness
    const prefix = tenantId.toString().slice(-4).toUpperCase();
    const ts = Date.now().toString().slice(-6);
    const finalSaleNumber = `SAL-${prefix}-${String(num).padStart(5, '0')}-${ts}`;
    console.log(`[ReceptionService] Generated sale number: ${finalSaleNumber}`);
    return finalSaleNumber;
  }

  private toSale(doc: any) {
    if (!doc) return null;
    try {
      const o = doc.toObject ? doc.toObject() : doc;
      const lines = Array.isArray(o.lines)
        ? (o.lines as any[]).map((l: any) => ({
            id: l._id?.toString(),
            itemId: (l.itemId?._id || l.itemId)?.toString?.(),
            serviceId: (l.serviceId?._id || l.serviceId)?.toString?.(),
            item: l.itemId?.name ? { name: l.itemId.name, sku: l.itemId.sku } : undefined,
            service: l.serviceId?.name ? { name: l.serviceId.name } : undefined,
            quantity: Number(l.quantity) || 0,
            unitPrice: Number(l.unitPrice) || 0,
            total: Number(l.total) || 0,
          }))
        : [];
      const totalAmount = Number(o.totalAmount ?? 0);
      const amountPaidRaw = o.amountPaid;
      const amountPaid =
        amountPaidRaw !== undefined && amountPaidRaw !== null
          ? Number(amountPaidRaw)
          : totalAmount;
      const balanceDue = Math.max(0, totalAmount - amountPaid);
      return {
        id: (o._id || doc._id)?.toString(),
        saleNumber: o.saleNumber,
        soldAt: o.soldAt,
        soldById: (o.soldById?._id || o.soldById)?.toString?.(),
        soldBy: (o as any).soldById?.fullName,
        lines,
        totalAmount,
        amountPaid,
        balanceDue,
        customerName: o.customerName,
        notes: o.notes,
        paymentMethod: o.paymentMethod || 'cash',
        tenantId: o.tenantId?.toString(),
      };
    } catch {
      return null;
    }
  }

  async sell(
    body: {
      lines: { itemId?: string; serviceId?: string; quantity: number; unitPrice: number }[];
      amountPaid?: number;
      customerName?: string;
      notes?: string;
      paymentMethod?: string;
    },
    user: { id: string; tenantId: string },
  ) {
    try {
      if (!body.lines?.length) throw new BadRequestException('At least one line required');
      const cleanTenantId = (user.tenantId || '').trim();
      const tid = toObjectId(cleanTenantId);
      if (!tid && !cleanTenantId) throw new BadRequestException('Invalid tenant ID');
      
      // Validation loop
      for (const l of body.lines) {
        if (l.itemId) {
          const item = await this.itemModel.findOne({ 
            _id: toObjectId(l.itemId), 
            $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
          }).select('name sku price costPrice').lean();
          if (!item) throw new BadRequestException(`Item not found for this tenant: ${l.itemId}`);
          const balance = await this.inventory.getBalance(l.itemId, user.tenantId);
          if (balance < (Number(l.quantity) || 0)) {
            const label = `${item.name} (${item.sku})`;
            throw new BadRequestException(`Insufficient stock for ${label}. Available: ${balance}, requested: ${l.quantity}`);
          }
        } else if (l.serviceId) {
          const service = await this.serviceModel.findOne({ 
            _id: toObjectId(l.serviceId), 
            $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
          }).lean();
          if (!service || !service.isActive) {
            throw new BadRequestException(`Service not found or inactive for this tenant`);
          }
        } else {
          throw new BadRequestException('Each line must have either itemId or serviceId');
        }
      }
      
      const saleNumber = await this.nextSaleNumber(user.tenantId);
      const lines: any[] = [];
      let totalAmount = 0;
      
      for (const l of body.lines) {
        const qty = Number(l.quantity) || 0;
        const uPrice = Number(l.unitPrice) || 0;
        const lineTotal = qty * uPrice;
        let lineAmountCalculation: number;
        let unitCost = 0;
        
        const line: any = {
          quantity: qty,
          unitPrice: uPrice,
          total: lineTotal,
        };

        if (l.itemId) {
          const item = await this.itemModel.findOne({ 
            _id: toObjectId(l.itemId), 
            $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
          }).select('price costPrice').lean();
          lineAmountCalculation = uPrice * qty;
          unitCost = Math.max(0, Number((item as any)?.costPrice ?? 0));
          line.itemId = toObjectId(l.itemId);
          line.unitCost = unitCost;
        } else {
          lineAmountCalculation = lineTotal;
          const service = await this.serviceModel.findOne({ 
            _id: toObjectId(l.serviceId), 
            $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
          }).select('costPrice').lean();
          line.serviceId = toObjectId(l.serviceId);
          line.unitCost = Math.max(0, Number((service as any)?.costPrice ?? 0));
        }
        
        lines.push(line);
        totalAmount += (lineAmountCalculation || 0);
      }

      const amountPaid = body.amountPaid != null
        ? Math.max(0, Math.min(Number(body.amountPaid), totalAmount))
        : totalAmount;

      const created = await this.saleModel.create({
        saleNumber,
        soldAt: new Date(),
        soldById: toObjectId(user.id),
        lines,
        totalAmount: Number(totalAmount) || 0,
        amountPaid: Number(amountPaid) || 0,
        customerName: body.customerName,
        notes: body.notes,
        paymentMethod: body.paymentMethod || 'cash',
        tenantId: tid || cleanTenantId,
      });

      for (const l of body.lines) {
        if (l.itemId) {
          await this.inventory.addMovement(l.itemId, StockMovementType.SALE, Number(l.quantity) || 0, {
            reference: 'sale',
            referenceId: created._id.toString(),
            notes: body.customerName || undefined,
            performedBy: user,
          });
        }
      }

      return this.findOne(created._id.toString(), user.tenantId);
    } catch (err: any) {
      console.error('CRITICAL SALE ERROR:', {
          message: err.message,
          code: err.code,
          name: err.name,
          stack: err.stack,
      });

      // Special handling for Mongoose validation errors
      if (err.name === 'ValidationError') {
          const details = Object.values(err.errors).map((e: any) => e.message).join(', ');
          throw new BadRequestException(`Validation Error: ${details}`);
      }
      
      // Specifically catch MongoDB duplicate key errors (11000)
      if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
        const key = JSON.stringify(err.keyValue || 'unknown field');
        throw new BadRequestException(`Duplicate entry detected in database for ${key}. This sale number might already be used. Please refresh and try again.`);
      }

      // Re-throw Nest exceptions (like BadRequestException)
      if (err.status && err.getResponse) throw err;
      
      // Detailed message for unhandled errors
      const msg = err.message || String(err);
      throw new BadRequestException(`Sell request failed: ${msg} | Error Name: ${err.name}`);
    }
  }

  async getTodaysSales(tenantId: string) {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    if (!tid && !cleanTenantId) return [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const docs = await this.saleModel
      .find({ 
        soldAt: { $gte: start }, 
        $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
      })
      .populate('lines.itemId', 'name sku')
      .populate('lines.serviceId', 'name')
      .populate('soldById', 'fullName')
      .sort({ soldAt: -1 })
      .lean();
    return docs.map((d: any) => this.toSale(d)).filter(Boolean);
  }

  async getUnpaidSales(tenantId: string) {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    if (!tid && !cleanTenantId) return [];
    const docs = await this.saleModel
      .find({ 
        $or: [{ tenantId: tid }, { tenantId: cleanTenantId }],
        $expr: { $lt: [{ $ifNull: ['$amountPaid', '$totalAmount'] }, '$totalAmount'] } 
      })
      .populate('lines.itemId', 'name sku')
      .populate('lines.serviceId', 'name')
      .populate('soldById', 'fullName')
      .sort({ soldAt: -1 })
      .limit(50)
      .lean();
    return docs.map((d: any) => this.toSale(d)).filter(Boolean);
  }

  async findOne(id: string, tenantId: string) {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    const sid = toObjectId(id);
    if (!sid) return null;
    const doc = await this.saleModel
      .findOne({ 
        _id: sid, 
        $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
      })
      .populate('lines.itemId')
      .populate('lines.serviceId')
      .populate('soldById')
      .lean();
    if (!doc) return null;
    return this.toSale(doc);
  }

  async getDashboard(tenantId: string) {
    const [todaysSales, lowStock, unpaidSales] = await Promise.all([
      this.getTodaysSales(tenantId),
      this.inventory.getLowStockItems(tenantId),
      this.getUnpaidSales(tenantId),
    ]);
    const todayRevenue = todaysSales.reduce((sum, s) => sum + (s?.totalAmount ?? 0), 0);
    return {
      todaysSales,
      unpaidSales,
      todayRevenue,
      todayTransactionCount: todaysSales.length,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 5),
    };
  }

  async recordPayment(
    saleId: string,
    tenantId: string,
    body: { amount: number; paymentMethod?: string },
    user: { id: string; tenantId: string },
  ) {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    const sid = toObjectId(saleId);
    if (!sid) throw new BadRequestException('Invalid IDs');
    
    const sale = await this.saleModel.findOne({ 
      _id: sid, 
      $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
    }).lean();
    if (!sale) throw new BadRequestException('Sale not found');
    
    const totalAmount = Number(sale.totalAmount ?? 0);
    const currentPaid = Number((sale as any).amountPaid ?? totalAmount);
    const balanceDue = Math.max(0, totalAmount - currentPaid);
    const payAmount = Math.max(0, Number(body.amount));
    
    if (payAmount > balanceDue) {
      throw new BadRequestException(
        `Payment amount (${payAmount.toFixed(2)}) cannot exceed balance due (${balanceDue.toFixed(2)})`,
      );
    }
    if (payAmount <= 0) throw new BadRequestException('Payment amount must be greater than 0');
    
    const newAmountPaid = currentPaid + payAmount;
    await this.saleModel.updateOne(
      { _id: sid, $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] },
      { $set: { amountPaid: newAmountPaid } },
    );
    return this.findOne(saleId, tenantId);
  }
}
