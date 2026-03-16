import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TenantDocument } from '../schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(TenantDocument.name)
    private tenantModel: Model<TenantDocument>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<TenantDocument> {
    const createdTenant = new this.tenantModel(createTenantDto);
    return createdTenant.save();
  }

  async findAll(): Promise<TenantDocument[]> {
    return this.tenantModel.find().exec();
  }

  async findOne(id: string): Promise<TenantDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid Tenant ID format');
    }
    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(
    id: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<TenantDocument> {
    const updated = await this.tenantModel
      .findByIdAndUpdate(id, updateTenantDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.tenantModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Tenant not found');
    return deleted;
  }
}
