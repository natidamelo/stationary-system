import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SupplierDocument } from '../schemas/supplier.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(SupplierDocument.name)
    private model: Model<SupplierDocument>,
  ) {}

  private toSupp(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    return { id: (o._id || doc._id)?.toString(), ...o };
  }

  async create(dto: CreateSupplierDto, tenantId: string) {
    const created = await this.model.create({ 
      ...dto,
      tenantId: new Types.ObjectId(tenantId)
    });
    return this.findOne(created._id.toString(), tenantId);
  }

  async findAll(tenantId: string) {
    const docs = await this.model.find({ 
      tenantId: new Types.ObjectId(tenantId),
      isActive: { $ne: false } 
    }).sort({ name: 1 }).lean();
    return docs.map((d: any) => this.toSupp(d));
  }

  async findOne(id: string, tenantId: string) {
    const doc = await this.model.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }).lean();
    if (!doc) throw new NotFoundException('Supplier not found');
    return this.toSupp(doc);
  }

  async update(id: string, dto: UpdateSupplierDto, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.model.updateOne(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }, 
      { $set: dto }
    );
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.model.updateOne(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }, 
      { $set: { isActive: false } }
    );
    return this.findOne(id, tenantId);
  }
}
