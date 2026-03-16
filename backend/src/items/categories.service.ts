import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CategoryDocument } from '../schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(CategoryDocument.name)
    private model: Model<CategoryDocument>,
  ) {}

  private toCat(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    return { id: (o._id || doc._id)?.toString(), ...o };
  }

  async create(name: string, tenantId: string, description?: string) {
    const created = await this.model.create({ 
      name, 
      description,
      tenantId: new Types.ObjectId(tenantId)
    });
    return this.toCat(await this.model.findOne({ _id: created._id, tenantId: new Types.ObjectId(tenantId) }).lean());
  }

  async findAll(tenantId: string) {
    const docs = await this.model.find({ tenantId: new Types.ObjectId(tenantId) }).sort({ name: 1 }).lean();
    return docs.map((d: any) => this.toCat(d));
  }

  async findOne(id: string, tenantId: string) {
    const doc = await this.model.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }).lean();
    if (!doc) throw new NotFoundException('Category not found');
    return this.toCat(doc);
  }

  async update(id: string, tenantId: string, data: { name?: string; description?: string }) {
    await this.findOne(id, tenantId);
    await this.model.updateOne(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) }, 
      { $set: data }
    );
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.model.deleteOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) });
    return { deleted: true };
  }
}
