import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceDocument } from '../schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(ServiceDocument.name)
    private model: Model<ServiceDocument>,
  ) {}

  private toService(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    return {
      id: (o._id || doc._id)?.toString(),
      name: o.name,
      description: o.description,
      costPrice: o.costPrice ?? 0,
      sellingPrice: o.sellingPrice ?? o.price ?? 0, // Support legacy price field
      isActive: o.isActive,
      createdAt: o.createdAt,
      tenantId: o.tenantId?.toString(),
    };
  }

  async create(dto: CreateServiceDto, tenantId: string) {
    const tid = new Types.ObjectId(tenantId);
    const created = await this.model.create({ ...dto, tenantId: tid });
    return this.findOne(created._id.toString(), tenantId);
  }

  async findAll(tenantId: string) {
    try {
      const tid = new Types.ObjectId(tenantId);
      const docs = await this.model.find({ tenantId: tid, isActive: { $ne: false } }).sort({ name: 1 }).lean();
      return docs.map((d: any) => this.toService(d)).filter(Boolean);
    } catch {
      return [];
    }
  }

  async findOne(id: string, tenantId: string) {
    const doc = await this.model.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }).lean();
    if (!doc) throw new NotFoundException('Service not found');
    return this.toService(doc);
  }

  async update(id: string, tenantId: string, dto: UpdateServiceDto) {
    await this.findOne(id, tenantId);
    await this.model.updateOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }, { $set: dto });
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.model.updateOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }, { $set: { isActive: false } });
    return this.findOne(id, tenantId);
  }
}
