import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantDocument } from '../schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { toObjectId } from '../common/utils';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(TenantDocument.name)
    private tenantModel: Model<TenantDocument>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<TenantDocument> {
    const existing = await this.tenantModel.findOne({ name: createTenantDto.name }).lean();
    if (existing) throw new BadRequestException('Company/Shop name already registered');
    const createdTenant = new this.tenantModel(createTenantDto);
    return createdTenant.save();
  }

  async findAll(): Promise<TenantDocument[]> {
    return this.tenantModel.find().exec();
  }

  async findOne(id: string): Promise<TenantDocument> {
    const tid = toObjectId(id);
    if (!tid) {
      throw new BadRequestException('Invalid Tenant ID format');
    }
    const tenant = await this.tenantModel.findById(tid).exec();
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(
    id: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<TenantDocument> {
    const tid = toObjectId(id);
    if (!tid) throw new BadRequestException('Invalid Tenant ID format');

    const updated = await this.tenantModel
      .findByIdAndUpdate(tid, updateTenantDto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }

  async remove(id: string) {
    const tid = toObjectId(id);
    if (!tid) throw new BadRequestException('Invalid Tenant ID format');

    const deleted = await this.tenantModel.findByIdAndDelete(tid).exec();
    if (!deleted) throw new NotFoundException('Tenant not found');
    return deleted;
  }
}
