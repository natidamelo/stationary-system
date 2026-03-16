import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomerDocument } from '../schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(CustomerDocument.name)
    private customerModel: Model<CustomerDocument>,
  ) {}

  async create(data: {
    name: string;
    email: string;
    contact?: string;
    address?: string;
    notes?: string;
  }, tenantId: string) {
    const existing = await this.customerModel.findOne({ 
      email: data.email.toLowerCase(),
      tenantId: new Types.ObjectId(tenantId)
    }).lean();
    if (existing) {
      throw new BadRequestException('A customer with this email already exists.');
    }
    const created = await this.customerModel.create({
      name: data.name,
      email: data.email.toLowerCase(),
      contact: data.contact,
      address: data.address,
      notes: data.notes,
      tenantId: new Types.ObjectId(tenantId),
    });
    return this.findById(created._id.toString(), tenantId);
  }

  async findAll(tenantId: string) {
    const docs = await this.customerModel.find({ tenantId: new Types.ObjectId(tenantId) }).sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => this.toCustomer(d));
  }

  async findById(id: string, tenantId: string) {
    const doc = await this.customerModel.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }).lean();
    if (!doc) throw new NotFoundException('Customer not found');
    return this.toCustomer(doc);
  }

  async update(id: string, data: Partial<{
    name: string;
    email: string;
    contact: string;
    address: string;
    notes: string;
  }>, tenantId: string) {
    const doc = await this.customerModel.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }).lean();
    if (!doc) throw new NotFoundException('Customer not found');
    if (data.email && data.email !== doc.email) {
      const existing = await this.customerModel.findOne({ 
        email: data.email.toLowerCase(),
        tenantId: new Types.ObjectId(tenantId)
      }).lean();
      if (existing) throw new BadRequestException('A customer with this email already exists.');
    }
    await this.customerModel.updateOne(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { $set: { ...data, email: data.email?.toLowerCase(), updatedAt: new Date() } },
    );
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string) {
    const doc = await this.customerModel.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }).lean();
    if (!doc) throw new NotFoundException('Customer not found');
    await this.customerModel.deleteOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) });
    return { success: true };
  }

  private toCustomer(doc: any) {
    return {
      id: doc._id?.toString(),
      name: doc.name,
      email: doc.email,
      contact: doc.contact,
      address: doc.address,
      notes: doc.notes,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
