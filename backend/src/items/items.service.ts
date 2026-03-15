import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ItemDocument } from '../schemas/item.schema';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(ItemDocument.name)
    private model: Model<ItemDocument>,
  ) { }

  private toItem(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    
    // Safely handle category population
    let category = undefined;
    if (o.categoryId) {
      if (typeof o.categoryId === 'object' && o.categoryId.name) {
        category = { 
          id: o.categoryId._id?.toString() || o.categoryId.id?.toString(), 
          name: o.categoryId.name 
        };
      } else {
        category = {
          id: o.categoryId.toString(),
          name: null
        };
      }
    }

    return {
      id: (o._id || doc._id)?.toString(),
      sku: o.sku,
      name: o.name,
      categoryId: (o.categoryId?._id || o.categoryId)?.toString?.() || null,
      category,
      unit: o.unit,
      reorderLevel: o.reorderLevel ?? 0,
      price: o.price ?? 0,
      costPrice: o.costPrice ?? 0,
      imageUrl: o.imageUrl,
      barcode: o.barcode || o.sku,
      isActive: o.isActive !== false, // default true
    };
  }

  async create(dto: CreateItemDto) {
    // Generate barcode from SKU if not provided
    const barcode = dto.barcode || dto.sku;
    const created = await this.model.create({
      ...dto,
      barcode,
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
    });
    return this.findOne(created._id.toString());
  }

  async findAll(filters?: { categoryId?: string; search?: string }) {
    const q: any = {};
    
    if (filters?.categoryId && Types.ObjectId.isValid(filters.categoryId)) {
      q.categoryId = new Types.ObjectId(filters.categoryId);
    }
    
    if (filters?.search?.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      q.$or = [
        { name: searchRegex },
        { sku: searchRegex },
      ];
    }
    
    const docs = await this.model.find(q)
      .populate('categoryId')
      .sort({ name: 1 })
      .lean();
      
    return docs.map((d: any) => this.toItem(d)).filter(Boolean);
  }

  async findOne(id: string) {
    const doc = await this.model.findById(id).populate('categoryId').lean();
    if (!doc) throw new NotFoundException('Item not found');
    return this.toItem(doc);
  }

  async findBySku(sku: string) {
    const doc = await this.model.findOne({ sku }).lean();
    return doc ? this.toItem(doc) : null;
  }

  async findByBarcode(barcode: string) {
    // Try to find by barcode first, then fallback to SKU
    let doc = await this.model.findOne({ barcode }).populate('categoryId').lean();
    if (!doc) {
      // Fallback to SKU if barcode not found
      doc = await this.model.findOne({ sku: barcode }).populate('categoryId').lean();
    }
    return doc ? this.toItem(doc) : null;
  }

  async update(id: string, dto: UpdateItemDto) {
    const existing = await this.model.findById(id).lean();
    if (!existing) throw new NotFoundException('Item not found');

    const update: any = { ...dto };
    if (dto.categoryId !== undefined) update.categoryId = dto.categoryId ? new Types.ObjectId(dto.categoryId) : null;

    // Generate barcode from SKU if not provided and doesn't exist
    if (!update.barcode && !existing.barcode) {
      update.barcode = existing.sku;
    }

    await this.model.updateOne({ _id: new Types.ObjectId(id) }, { $set: update });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.model.updateOne({ _id: new Types.ObjectId(id) }, { $set: { isActive: false } });
    return this.findOne(id);
  }

  /** Bulk import from CSV text. CSV must have header row: sku,name,unit,reorderLevel,price,costPrice,barcode */
  async bulkImportFromCsv(csvText: string, categoryMap?: Record<string, string>): Promise<{ imported: number; errors: string[] }> {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const requiredHeaders = ['sku', 'name'];
    for (const rh of requiredHeaders) {
      if (!headers.includes(rh)) throw new BadRequestException(`CSV missing required column: ${rh}`);
    }
    const errors: string[] = [];
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });
      if (!row.sku || !row.name) {
        errors.push(`Row ${i + 1}: missing sku or name, skipped`);
        continue;
      }
      try {
        const existing = await this.model.findOne({ sku: row.sku }).lean();
        const categoryId = row.categoryid && categoryMap?.[row.categoryid]
          ? new Types.ObjectId(categoryMap[row.categoryid])
          : undefined;
        const data: any = {
          sku: row.sku,
          name: row.name,
          unit: row.unit || 'unit',
          reorderLevel: Number(row.reorderlevel) || 0,
          price: Number(row.price) || 0,
          costPrice: Number(row.costprice) || 0,
          barcode: row.barcode || row.sku,
        };
        if (categoryId) data.categoryId = categoryId;
        if (existing) {
          await this.model.updateOne({ _id: existing._id }, { $set: data });
        } else {
          await this.model.create(data);
        }
        imported++;
      } catch (e: any) {
        errors.push(`Row ${i + 1} (${row.sku}): ${e.message}`);
      }
    }
    return { imported, errors };
  }
}
