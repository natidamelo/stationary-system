import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoryDocument } from '../schemas/category.schema';
import { toObjectId } from '../common/utils';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(CategoryDocument.name)
    private model: Model<CategoryDocument>,
  ) {}

  private toCat(doc: any) {
    if (!doc) return null;
    try {
      // Handle both Mongoose documents and lean objects
      const data = doc.toObject ? doc.toObject() : doc;
      return {
        id: (data._id || doc._id)?.toString() || null,
        name: data.name || 'Unnamed Category',
        description: data.description || '',
        tenantId: data.tenantId?.toString() || null,
      };
    } catch (err) {
      console.warn('Error mapping category row:', err);
      return null;
    }
  }

  async create(name: string, tenantId: string, description?: string) {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Tenant ID is required');
    const created = await this.model.create({ 
      name, 
      description,
      tenantId: tid
    });
    return this.findOne(created._id.toString(), tenantId);
  }

  async findAll(tenantId: string) {
    try {
      const tid = toObjectId(tenantId);
      if (!tid) return []; // For dealers or uninitialized accounts, return empty
      
      const docs = await this.model.find({ tenantId: tid }).sort({ name: 1 }).lean().exec();
      return docs.map((d: any) => this.toCat(d)).filter(Boolean);
    } catch (error) {
      console.error('CategoriesService.findAll error:', error);
      throw error;
    }
  }

  async findOne(id: string, tenantId: string) {
    const tid = toObjectId(tenantId);
    const cid = toObjectId(id);
    if (!tid || !cid) throw new BadRequestException('Invalid IDs');
    const doc = await this.model.findOne({ _id: cid, tenantId: tid }).lean();
    if (!doc) throw new NotFoundException('Category not found');
    return this.toCat(doc);
  }

  async update(id: string, tenantId: string, data: { name?: string; description?: string }) {
    const tid = toObjectId(tenantId);
    const cid = toObjectId(id);
    if (!tid || !cid) throw new BadRequestException('Invalid IDs');
    await this.findOne(id, tenantId);
    await this.model.updateOne(
      { _id: cid, tenantId: tid }, 
      { $set: data }
    );
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const tid = toObjectId(tenantId);
    const cid = toObjectId(id);
    if (!tid || !cid) throw new BadRequestException('Invalid IDs');
    await this.findOne(id, tenantId);
    await this.model.deleteOne({ _id: cid, tenantId: tid });
    return { deleted: true };
  }
}
