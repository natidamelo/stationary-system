import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InvoiceDocument } from '../schemas/invoice.schema';
import { SaleDocument } from '../schemas/sale.schema';
import { toObjectId } from '../common/utils';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(InvoiceDocument.name)
    private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(SaleDocument.name)
    private saleModel: Model<SaleDocument>,
  ) { }

  private async nextInvoiceNumber(tenantId: string): Promise<string> {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    if (!tid && !cleanTenantId) return `INV-${Date.now()}`;
    
    const last = await this.invoiceModel
      .findOne({ $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] })
      .sort({ createdAt: -1 })
      .lean();
      
    let num = 1;
    if (last && last.invoiceNumber) {
        // Find the last numeric sequence in the string
        const match = last.invoiceNumber.match(/(\d+)(?!.*\d)/);
        if (match) {
            num = parseInt(match[1], 10) + 1;
        } else {
            // Fallback: count invoices
            num = (await this.invoiceModel.countDocuments({ 
              $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
            })) + 1;
        }
    }

    // Simple format: INV-00001 (sequential)
    return `INV-${String(num).padStart(5, '0')}`;
  }

  private toInvoice(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    return {
      id: (o._id || doc._id)?.toString(),
      invoiceNumber: o.invoiceNumber,
      saleId: (o.saleId?._id || o.saleId)?.toString?.(),
      saleNumber: (o.saleId as any)?.saleNumber,
      issueDate: o.issueDate,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerAddress: o.customerAddress,
      lines: o.lines || [],
      totalAmount: Number(o.totalAmount ?? 0),
      amountPaid: Number(o.amountPaid ?? 0),
      balanceDue: Math.max(0, Number(o.totalAmount ?? 0) - Number(o.amountPaid ?? 0)),
      status: o.status || 'draft',
      notes: o.notes,
      createdAt: o.createdAt,
      tenantId: o.tenantId?.toString(),
    };
  }

  async findAll(tenantId: string): Promise<any[]> {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    if (!tid && !cleanTenantId) return [];
    const docs = await this.invoiceModel
      .find({ $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] })
      .populate('saleId', 'saleNumber soldAt totalAmount amountPaid')
      .sort({ issueDate: -1 })
      .lean();
    return docs.map((d: any) => this.toInvoice(d));
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    const iid = toObjectId(id);
    if (!iid) return null;
    const doc = await this.invoiceModel
      .findOne({ _id: iid, $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] })
      .populate('saleId', 'saleNumber soldAt totalAmount amountPaid')
      .lean();
    return this.toInvoice(doc);
  }

  async createFromSale(saleId: string, tenantId: string, options?: { customerEmail?: string; customerAddress?: string }): Promise<any> {
    try {
      const cleanTenantId = (tenantId || '').trim();
      const tid = toObjectId(cleanTenantId);
      const sid = toObjectId(saleId);
      if (!tid && !cleanTenantId) throw new BadRequestException('Invalid tenant ID');
      if (!sid) throw new BadRequestException('Invalid Sale ID');

      const sale = await this.saleModel
        .findOne({ _id: sid, $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] })
        .populate('lines.itemId')
        .populate('lines.serviceId')
        .lean();
        
      if (!sale) throw new BadRequestException(`Sale not found with ID: ${saleId}`);
      
      const existing = await this.invoiceModel.findOne({ 
        saleId: sid, 
        $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
      }).lean();
      if (existing) {
        return this.findOne(existing._id.toString(), tenantId);
      }

      const o = sale as any;
      const lines = (o.lines || []).map((l: any) => ({
        description: l.itemId?.name ?? l.serviceId?.name ?? 'Generic Item',
        sku: l.itemId?.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.total ?? (l.quantity * l.unitPrice),
      }));

      const totalAmount = Number(o.totalAmount ?? 0);
      const amountPaid = Number(o.amountPaid ?? 0);
      const invoiceNumber = await this.nextInvoiceNumber(tenantId);

      const created = await this.invoiceModel.create({
        invoiceNumber,
        saleId: sid,
        issueDate: new Date(),
        customerName: o.customerName || 'Walk-in Customer',
        customerEmail: options?.customerEmail,
        customerAddress: options?.customerAddress,
        lines,
        totalAmount,
        amountPaid,
        status: amountPaid >= totalAmount ? 'paid' : 'sent',
        notes: o.notes,
        tenantId: tid || cleanTenantId,
      });

      return this.findOne(created._id.toString(), tenantId);
    } catch (err: any) {
      console.error('Invoice Creation Error:', err);
      if (err.status) throw err;
      throw new BadRequestException(`Failed to generate invoice: ${err.message || String(err)}`);
    }
  }

  async markPaid(id: string, tenantId: string, amountPaid?: number): Promise<any> {
    const cleanTenantId = (tenantId || '').trim();
    const tid = toObjectId(cleanTenantId);
    const iid = toObjectId(id);
    if (!iid) throw new BadRequestException('Invalid Invoice ID');

    const doc = await this.invoiceModel.findOne({ 
      _id: iid, 
      $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] 
    });
    if (!doc) throw new BadRequestException('Invoice not found');
    const paid = amountPaid !== undefined ? amountPaid : doc.totalAmount;
    await this.invoiceModel.updateOne(
      { _id: iid, $or: [{ tenantId: tid }, { tenantId: cleanTenantId }] },
      { $set: { amountPaid: paid, status: paid >= doc.totalAmount ? 'paid' : 'partial' } },
    );
    return this.findOne(id, tenantId);
  }
}
