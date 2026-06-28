import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StoreDocument } from '../schemas/store.schema';
import { UserDocument } from '../schemas/user.schema';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { toObjectId } from '../common/utils';

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(StoreDocument.name)
    private storeModel: Model<StoreDocument>,
    @InjectModel(UserDocument.name)
    private userModel: Model<UserDocument>,
  ) {}

  private toStore(doc: any) {
    if (!doc) return null;
    const o = doc.toObject ? doc.toObject() : doc;
    const id = (o._id || doc._id)?.toString();
    return {
      id,
      _id: id,
      tenantId: o.tenantId?.toString(),
      name: o.name,
      location: o.location,
      isActive: o.isActive,
      createdAt: o.createdAt,
    };
  }

  async create(createStoreDto: CreateStoreDto, tenantId: string): Promise<any> {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Invalid Tenant ID');

    const existing = await this.storeModel.findOne({
      tenantId: tid,
      name: createStoreDto.name,
    }).lean();
    if (existing) {
      throw new BadRequestException('A store with this name already exists for your company');
    }

    const createdStore = new this.storeModel({
      ...createStoreDto,
      tenantId: tid,
    });
    const saved = await createdStore.save();
    return this.toStore(saved);
  }

  async findAll(tenantId: string): Promise<any[]> {
    const tid = toObjectId(tenantId);
    if (!tid) return [];
    const docs = await this.storeModel.find({ tenantId: tid }).sort({ name: 1 }).exec();
    return docs.map((d) => this.toStore(d));
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const tid = toObjectId(tenantId);
    const sid = toObjectId(id);
    if (!tid || !sid) throw new BadRequestException('Invalid ID format');

    const store = await this.storeModel.findOne({ _id: sid, tenantId: tid }).exec();
    if (!store) throw new NotFoundException('Store not found');
    return this.toStore(store);
  }

  async update(id: string, updateStoreDto: UpdateStoreDto, tenantId: string): Promise<any> {
    const tid = toObjectId(tenantId);
    const sid = toObjectId(id);
    if (!tid || !sid) throw new BadRequestException('Invalid ID format');

    const store = await this.storeModel.findOne({ _id: sid, tenantId: tid }).exec();
    if (!store) throw new NotFoundException('Store not found');

    if (updateStoreDto.name !== undefined && updateStoreDto.name !== store.name) {
      const existing = await this.storeModel.findOne({
        tenantId: tid,
        name: updateStoreDto.name,
      }).lean();
      if (existing) {
        throw new BadRequestException('A store with this name already exists for your company');
      }
      store.name = updateStoreDto.name;
    }

    if (updateStoreDto.location !== undefined) store.location = updateStoreDto.location;
    if (updateStoreDto.isActive !== undefined) store.isActive = updateStoreDto.isActive;

    const saved = await store.save();
    return this.toStore(saved);
  }

  async remove(id: string, tenantId: string): Promise<any> {
    const tid = toObjectId(tenantId);
    const sid = toObjectId(id);
    if (!tid || !sid) throw new BadRequestException('Invalid ID format');

    // Check if store exists
    await this.findOne(id, tenantId);

    // Check if any users are assigned to this store
    const userCount = await this.userModel.countDocuments({ storeId: sid });
    if (userCount > 0) {
      throw new BadRequestException('Cannot delete store because users are assigned to it');
    }

    await this.storeModel.deleteOne({ _id: sid, tenantId: tid });
    return { message: 'Store deleted successfully' };
  }

  async switchStore(userId: string, storeId: string, tenantId: string): Promise<any> {
    const tid = toObjectId(tenantId);
    const uid = toObjectId(userId);
    const sid = toObjectId(storeId);
    if (!tid || !uid || !sid) throw new BadRequestException('Invalid ID format');

    // Check if store belongs to this tenant
    const store = await this.storeModel.findOne({ _id: sid, tenantId: tid }).lean();
    if (!store) throw new NotFoundException('Store not found or does not belong to your company');

    await this.userModel.updateOne(
      { _id: uid, tenantId: tid },
      { $set: { storeId: sid } },
    );

    return { success: true, storeId: storeId, storeName: store.name };
  }
}
