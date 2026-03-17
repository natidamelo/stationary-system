import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { TenantDocument } from '../schemas/tenant.schema';
import { UserDocument } from '../schemas/user.schema';
import { LicenseDocument } from '../schemas/license.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { toObjectId } from '../common/utils';

function generateKey(): string {
  const raw = randomBytes(10).toString('hex').slice(0, 20);
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    segments.push(raw.slice(i * 5, (i + 1) * 5).toUpperCase());
  }
  return segments.join('-');
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(TenantDocument.name)
    private tenantModel: Model<TenantDocument>,
    @InjectModel(UserDocument.name)
    private userModel: Model<UserDocument>,
    @InjectModel(LicenseDocument.name)
    private licenseModel: Model<LicenseDocument>,
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

  async findAllWithAdmin(): Promise<any[]> {
    const tenants = await this.tenantModel.find().sort({ createdAt: -1 }).lean();
    const result = await Promise.all(
      tenants.map(async (tenant) => {
        const tid = tenant._id;
        const adminUser = await this.userModel
          .findOne({ tenantId: tid })
          .populate('roleId')
          .lean();
        const licenseCount = await this.licenseModel.countDocuments({ tenantId: tid });
        const activeLicenseCount = await this.licenseModel.countDocuments({ tenantId: tid, status: 'active' });
        return {
          id: tid.toString(),
          name: tenant.name,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt,
          adminName: (adminUser as any)?.fullName || null,
          adminEmail: (adminUser as any)?.email || null,
          licenseCount,
          activeLicenseCount,
        };
      }),
    );
    return result;
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

  async removeWithUsers(id: string) {
    const tid = toObjectId(id);
    if (!tid) throw new BadRequestException('Invalid Tenant ID format');

    const tenant = await this.tenantModel.findById(tid).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Delete all users belonging to this tenant
    await this.userModel.deleteMany({ tenantId: tid });
    // Delete all licenses for this tenant
    await this.licenseModel.deleteMany({ tenantId: tid });
    // Delete the tenant
    await this.tenantModel.findByIdAndDelete(tid);

    return { message: 'Tenant and all associated data deleted successfully' };
  }

  async giveLicense(tenantId: string, data: {
    computerId: string;
    duration?: number;
    durationUnit?: 'day' | 'month' | 'year';
    expiryDate?: string;
  }): Promise<any> {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Invalid Tenant ID format');

    const tenant = await this.tenantModel.findById(tid).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (!data.computerId) throw new BadRequestException('Computer ID is required');

    // Check if active license already exists for this computer + tenant
    const existing = await this.licenseModel.findOne({
      tenantId: tid,
      computerId: data.computerId,
      status: 'active',
    }).lean();
    if (existing) throw new BadRequestException('An active license already exists for this computer. Extend or revoke it first.');

    const startDate = new Date();
    let expiryDate: Date;

    if (data.expiryDate) {
      expiryDate = new Date(data.expiryDate);
      if (isNaN(expiryDate.getTime())) throw new BadRequestException('Invalid expiry date');
    } else if (data.duration && data.durationUnit) {
      expiryDate = new Date(startDate);
      if (data.durationUnit === 'day') expiryDate.setDate(expiryDate.getDate() + data.duration);
      else if (data.durationUnit === 'month') expiryDate.setMonth(expiryDate.getMonth() + data.duration);
      else if (data.durationUnit === 'year') expiryDate.setFullYear(expiryDate.getFullYear() + data.duration);
      else throw new BadRequestException('Invalid duration unit');
    } else {
      // Default: 1 year
      expiryDate = new Date(startDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    let licenseKey = generateKey();
    while (await this.licenseModel.findOne({ licenseKey }).lean()) {
      licenseKey = generateKey();
    }

    // Create license with the TARGET tenant's ID (so their login validation works)
    // customerId is optional here — we set it to null since this is tenant-based licensing
    const created = await this.licenseModel.create({
      tenantId: tid,
      licenseKey,
      customerId: null,
      computerId: data.computerId,
      startDate,
      expiryDate,
      status: 'active',
    });

    return {
      id: (created._id as any).toString(),
      licenseKey,
      tenantId: tenantId,
      tenantName: tenant.name,
      computerId: data.computerId,
      startDate,
      expiryDate,
      status: 'active',
    };
  }

  async getLicensesForTenant(tenantId: string): Promise<any[]> {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Invalid Tenant ID format');

    const licenses = await this.licenseModel.find({ tenantId: tid }).sort({ createdAt: -1 }).lean();
    return licenses.map((l: any) => ({
      id: l._id.toString(),
      licenseKey: l.licenseKey,
      computerId: l.computerId,
      startDate: l.startDate,
      expiryDate: l.expiryDate,
      status: l.status,
    }));
  }
}
