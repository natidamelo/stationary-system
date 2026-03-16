import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InvoiceDocument } from '../schemas/invoice.schema';
import { SaleDocument } from '../schemas/sale.schema';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(InvoiceDocument.name)
    private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(SaleDocument.name)
    private saleModel: Model<SaleDocument>,
  ) { }

  private async nextInvoiceNumber(tenantId: string): Promise<string> {
    const last = await this.invoiceModel.findOne({ tenantId: new Types.ObjectId(tenantId) }).sort({ issueDate: -1 }).lean();
    const num = last
      ? parseInt(String((last as any).invoiceNumber).replace(/\D/g, ''), 10) + 1
      : 1;
    return `INV-${String(num).padStart(6, '0')}`;
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
    const docs = await this.invoiceModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .populate('saleId', 'saleNumber soldAt totalAmount amountPaid')
      .sort({ issueDate: -1 })
      .lean();
    return docs.map((d: any) => this.toInvoice(d));
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const doc = await this.invoiceModel
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) })
      .populate('saleId', 'saleNumber soldAt totalAmount amountPaid')
      .lean();
    return this.toInvoice(doc);
  }

  async createFromSale(saleId: string, tenantId: string, options?: { customerEmail?: string; customerAddress?: string }): Promise<any> {
    const tid = new Types.ObjectId(tenantId);
    const sale = await this.saleModel
      .findOne({ _id: new Types.ObjectId(saleId), tenantId: tid })
      .populate('lines.itemId', 'name sku')
      .populate('lines.serviceId', 'name')
      .lean();
    if (!sale) throw new BadRequestException('Sale not found');
    const existing = await this.invoiceModel.findOne({ saleId: new Types.ObjectId(saleId), tenantId: tid }).lean();
    if (existing) {
      return this.toInvoice(
        await this.invoiceModel
          .findOne({ _id: existing._id, tenantId: tid })
          .populate('saleId', 'saleNumber soldAt totalAmount amountPaid')
          .lean(),
      );
    }
    const o = sale as any;
    const lines = (o.lines || []).map((l: any) => ({
      description: l.itemId?.name ?? l.serviceId?.name ?? 'Item',
      sku: l.itemId?.sku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      total: l.total ?? l.quantity * l.unitPrice,
    }));
    const totalAmount = Number(o.totalAmount ?? 0);
    const amountPaid = Number(o.amountPaid ?? 0);
    const invoiceNumber = await this.nextInvoiceNumber(tenantId);
    const created = await this.invoiceModel.create({
      invoiceNumber,
      saleId: new Types.ObjectId(saleId),
      issueDate: new Date(),
      customerName: o.customerName,
      customerEmail: options?.customerEmail,
      customerAddress: options?.customerAddress,
      lines,
      totalAmount,
      amountPaid,
      status: amountPaid >= totalAmount ? 'paid' : 'sent',
      notes: o.notes,
      tenantId: tid,
    });
    return this.toInvoice(
      await this.invoiceModel
        .findOne({ _id: created._id, tenantId: tid })
        .populate('saleId', 'saleNumber soldAt totalAmount amountPaid')
        .lean(),
    );
  }

  async markPaid(id: string, tenantId: string, amountPaid?: number): Promise<any> {
    const tid = new Types.ObjectId(tenantId);
    const doc = await this.invoiceModel.findOne({ _id: new Types.ObjectId(id), tenantId: tid });
    if (!doc) throw new BadRequestException('Invoice not found');
    const paid = amountPaid !== undefined ? amountPaid : doc.totalAmount;
    await this.invoiceModel.updateOne(
      { _id: doc._id, tenantId: tid },
      { $set: { amountPaid: paid, status: paid >= doc.totalAmount ? 'paid' : 'partial' } },
    );
    return this.findOne(id, tenantId);
  }
}
