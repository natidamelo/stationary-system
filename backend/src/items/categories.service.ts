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
      const id = (data._id || doc._id || data.id)?.toString();
      
      if (!id) {
        console.warn('CategoriesService: Category doc missing _id', doc);
        return null;
      }

      return {
        id,
        name: data.name || 'Unnamed Category',
        description: data.description || '',
        tenantId: data.tenantId?.toString() || null,
      };
    } catch (err) {
      console.warn('Error mapping category row:', err, 'Doc was:', doc);
      return null;
    }
  }

  async create(name: string, tenantId: string, description?: string) {
    console.log(`[CategoriesService] Creating category: "${name}" for tenant: "${tenantId}"`);
    try {
      const tid = toObjectId(tenantId);
      if (!tid) throw new BadRequestException('Tenant ID is required to create categories');
      
      const created = await this.model.create({ 
        name, 
        description,
        tenantId: tid
      });
      
      console.log(`[CategoriesService] Created category with ID: ${created._id}`);
      return this.toCat(created);
    } catch (error: any) {
      if (error.code === 11000) {
        console.warn(`[CategoriesService] Duplicate name for tenant: "${tenantId}", name: "${name}"`);
        throw new BadRequestException(`Category with name "${name}" already exists`);
      }
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException(messages.join(', '));
      }
      console.error('CategoriesService.create error:', error);
      throw error;
    }
  }

  async findAll(tenantId: string) {
    try {
      const tid = toObjectId(tenantId);
      if (!tid) {
        console.warn(`[CategoriesService] findAll: No valid tenantId provided ("${tenantId}"), returning empty list`);
        return [];
      }
      
      const docs = await this.model.find({ tenantId: tid }).sort({ name: 1 }).lean().exec();
      const mapped = docs.map((d: any) => this.toCat(d)).filter(Boolean);
      console.log(`[CategoriesService] findAll: Found ${docs.length} docs, mapped to ${mapped.length} valid categories for tenant: "${tenantId}"`);
      return mapped;
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
