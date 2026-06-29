import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { LicenseDocument } from '../schemas/license.schema';
import { CustomerDocument } from '../schemas/customer.schema';
import { TenantDocument } from '../schemas/tenant.schema';
import { toObjectId } from '../common/utils';

function formatLicenseKey(raw: string): string {
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    segments.push(raw.slice(i * 5, (i + 1) * 5).toUpperCase());
  }
  return segments.join('-');
}

@Injectable()
export class LicenseService {
  constructor(
    @InjectModel(LicenseDocument.name)
    private licenseModel: Model<LicenseDocument>,
    @InjectModel(CustomerDocument.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(TenantDocument.name)
    private tenantModel: Model<TenantDocument>,
  ) {}

  generateKey(): string {
    const raw = randomBytes(10).toString('hex').slice(0, 20);
    return formatLicenseKey(raw);
  }

  async getLicenseInfo(computerId: string, tenantId: string): Promise<{
    valid: boolean;
    message?: string;
    expiryDate?: Date;
    startDate?: Date;
    customerName?: string;
    licenseKey?: string;
  } | null> {
    const tid = toObjectId(tenantId);
    if (!tid) return { valid: false, message: 'Invalid tenant ID.' };
    
    const tenant = await this.tenantModel.findById(tid).lean();
    if (!tenant || !tenant.isActive) return { valid: false, message: 'Account is not activated. Please contact the provider.' };

    const license = await this.licenseModel
      .findOne({ tenantId: tid, computerId, status: 'active' })
      .populate('customerId')
      .lean();

    if (!license) return { valid: false, message: 'No valid license found for this computer.' };

    const now = new Date();
    const startDate = new Date(license.startDate);
    const expiryDate = new Date(license.expiryDate);

    if (now < startDate) {
      return {
        valid: false,
        message: 'License has not yet started.',
        startDate,
        expiryDate,
        customerName: (license as any).customerId?.name,
        licenseKey: license.licenseKey,
      };
    }
    if (now > expiryDate) {
      return {
        valid: false,
        message: 'License has expired.',
        startDate,
        expiryDate,
        customerName: (license as any).customerId?.name,
        licenseKey: license.licenseKey,
      };
    }

    return {
      valid: true,
      startDate,
      expiryDate,
      customerName: (license as any).customerId?.name,
      licenseKey: license.licenseKey,
    };
  }

  async validateLicense(computerId: string, tenantId: string): Promise<{ valid: boolean; message?: string }> {
    const tid = toObjectId(tenantId);
    if (!tid) return { valid: false, message: 'Invalid tenant context' };

    const tenant = await this.tenantModel.findById(tid).lean();
    if (!tenant) return { valid: false, message: 'Tenant not found.' };
    if (!tenant.isActive) return { valid: false, message: 'Account is not activated. Please contact the provider.' };

    // Find a valid active license for this computer
    const license = await this.licenseModel
      .findOne({ tenantId: tid, computerId, status: 'active' })
      .lean();

    if (!license) {
      // Check if any license exists. If not, inform that a license must be issued.
      const hasAny = await this.licenseModel.countDocuments({ tenantId: tid }).lean();
      if (hasAny === 0) {
        return { valid: false, message: 'This account needs an initial license. Please provide your Computer ID to the dealer.' };
      }
      return { valid: false, message: 'No valid license found for this computer. Please provide your Computer ID to the dealer.' };
    }

    const now = new Date();
    const startDate = new Date(license.startDate);
    const expiryDate = new Date(license.expiryDate);

    if (now < startDate) {
      return { valid: false, message: 'License has not yet started.' };
    }
    if (now > expiryDate) {
      await this.licenseModel.updateOne(
        { _id: license._id },
        { $set: { status: 'expired', updatedAt: new Date() } },
      );
      return { valid: false, message: 'License has expired. Please renew your subscription.' };
    }

    return { valid: true };
  }

  async generateLicense(tenantId: string, data: {
    customerId: string;
    computerId: string;
    startDate?: Date;
    durationYears?: number;
    duration?: number;
    durationUnit?: 'day' | 'month' | 'year';
    expiryDate?: Date | string;
  }): Promise<{ licenseKey: string; licence: any }> {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Invalid tenant');
    const customer = await this.customerModel.findOne({ _id: toObjectId(data.customerId), tenantId: tid }).lean();
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.licenseModel
      .findOne({ tenantId: tid, computerId: data.computerId, status: 'active' })
      .lean();
    if (existing) {
      throw new ConflictException(
        'An active license already exists for this computer. Extend it or suspend it first.',
      );
    }

    const startDate = data.startDate || new Date();
    let expiryDate: Date;
    
    if (data.expiryDate) {
      expiryDate = new Date(data.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        throw new BadRequestException('Invalid expiry date provided');
      }
    } 
    else if (data.duration !== undefined && data.durationUnit && data.duration > 0) {
      expiryDate = new Date(startDate);
      const duration = Number(data.duration);
      if (isNaN(duration) || duration <= 0) {
        throw new BadRequestException('Duration must be a positive number');
      }
      
      if (data.durationUnit === 'day') {
        expiryDate.setDate(expiryDate.getDate() + Math.floor(duration));
      } else if (data.durationUnit === 'month') {
        expiryDate.setMonth(expiryDate.getMonth() + Math.floor(duration));
      } else if (data.durationUnit === 'year') {
        expiryDate.setFullYear(expiryDate.getFullYear() + Math.floor(duration));
      } else {
        throw new BadRequestException('Invalid duration unit. Must be day, month, or year');
      }
    }
    else {
      const durationYears = data.durationYears ?? 1;
      expiryDate = new Date(startDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + Math.floor(durationYears));
    }

    let licenseKey = this.generateKey();
    while (await this.licenseModel.findOne({ licenseKey }).lean()) {
      licenseKey = this.generateKey();
    }

    const created = await this.licenseModel.create({
      tenantId: tid,
      licenseKey,
      customerId: toObjectId(data.customerId),
      computerId: data.computerId,
      startDate,
      expiryDate,
      status: 'active',
    });

    const doc = await this.licenseModel
      .findById(created._id)
      .populate('customerId')
      .lean();

    return {
      licenseKey,
      licence: this.toLicense(doc),
    };
  }

  async updateLicense(tenantId: string, data: {
    id: string;
    customerId: string;
    computerId: string;
    durationYears?: number;
    duration?: number;
    durationUnit?: 'day' | 'month' | 'year';
    expiryDate?: Date | string;
  }): Promise<any> {
    const tid = toObjectId(tenantId);
    const lid = toObjectId(data.id);
    if (!tid || !lid) throw new BadRequestException('Invalid IDs');
    
    const license = await this.licenseModel.findOne({ _id: lid, tenantId: tid }).lean();
    if (!license) throw new NotFoundException('License not found');

    if (data.computerId && data.computerId !== license.computerId) {
      const existing = await this.licenseModel
        .findOne({
          tenantId: tid,
          computerId: data.computerId,
          status: 'active',
          _id: { $ne: lid },
        })
        .lean();
      if (existing) {
        throw new ConflictException(
          'An active license already exists for this computer.',
        );
      }
    }

    const startDate = license.startDate;
    let expiryDate: Date;
    
    if (data.expiryDate) {
      expiryDate = new Date(data.expiryDate);
    } 
    else if (data.duration !== undefined && data.durationUnit && data.duration > 0) {
      expiryDate = new Date(startDate);
      const duration = Number(data.duration);
      if (data.durationUnit === 'day') expiryDate.setDate(expiryDate.getDate() + duration);
      else if (data.durationUnit === 'month') expiryDate.setMonth(expiryDate.getMonth() + duration);
      else if (data.durationUnit === 'year') expiryDate.setFullYear(expiryDate.getFullYear() + duration);
    }
    else if (data.durationYears !== undefined) {
      expiryDate = new Date(startDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + Number(data.durationYears));
    }
    else {
      expiryDate = new Date(license.expiryDate);
    }

    await this.licenseModel.updateOne(
      { _id: lid },
      {
        $set: {
          customerId: toObjectId(data.customerId),
          computerId: data.computerId,
          expiryDate,
          updatedAt: new Date(),
        },
      },
    );
    
    const updated = await this.licenseModel
      .findById(lid)
      .populate('customerId')
      .lean();
    
    return this.toLicense(updated);
  }

  async extendLicense(
    tenantId: string,
    licenseKey: string, 
    extendYears?: number,
    duration?: number,
    durationUnit?: 'day' | 'month' | 'year',
    expiryDate?: Date | string
  ): Promise<any> {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Invalid tenant');
    const license = await this.licenseModel.findOne({ tenantId: tid, licenseKey }).lean();
    if (!license) throw new NotFoundException('License not found');

    let newExpiryDate: Date;
    
    if (expiryDate) {
      newExpiryDate = new Date(expiryDate);
    }
    else if (duration !== undefined && durationUnit) {
      const currentExpiry = new Date(license.expiryDate);
      const now = new Date();
      const baseExpiry = currentExpiry > now ? currentExpiry : now;
      newExpiryDate = new Date(baseExpiry);
      
      if (durationUnit === 'day') newExpiryDate.setDate(newExpiryDate.getDate() + duration);
      else if (durationUnit === 'month') newExpiryDate.setMonth(newExpiryDate.getMonth() + duration);
      else if (durationUnit === 'year') newExpiryDate.setFullYear(newExpiryDate.getFullYear() + duration);
    }
    else {
      const years = extendYears ?? 1;
      const currentExpiry = new Date(license.expiryDate);
      const now = new Date();
      const baseExpiry = currentExpiry > now ? currentExpiry : now;
      newExpiryDate = new Date(baseExpiry);
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + years);
    }

    await this.licenseModel.updateOne(
      { tenantId: tid, licenseKey },
      {
        $set: {
          expiryDate: newExpiryDate,
          status: 'active',
          updatedAt: new Date(),
        },
      },
    );

    return this.findByKey(tenantId, licenseKey);
  }

  async findByKey(tenantId: string, licenseKey: string) {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Invalid tenant');
    const doc = await this.licenseModel
      .findOne({ tenantId: tid, licenseKey })
      .populate('customerId')
      .lean();
    if (!doc) throw new NotFoundException('License not found');
    return this.toLicense(doc);
  }

  async findByCustomer(tenantId: string, customerId: string) {
    const tid = toObjectId(tenantId);
    const cid = toObjectId(customerId);
    if (!tid || !cid) return [];
    const docs = await this.licenseModel
      .find({ tenantId: tid, customerId: cid })
      .populate('customerId')
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d: any) => this.toLicense(d));
  }

  async findAll(tenantId: string) {
    const tid = toObjectId(tenantId);
    if (!tid) return [];
    const docs = await this.licenseModel
      .find({ tenantId: tid })
      .populate('customerId')
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d: any) => this.toLicense(d));
  }

  async findAllAcrossTenants() {
    const docs = await this.licenseModel
      .find({})
      .populate('customerId')
      .populate('tenantId')
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d: any) => {
      const base = this.toLicense(d);
      const tenant = d.tenantId as any;
      return {
        ...base,
        tenantId: tenant?._id?.toString(),
        tenantName: tenant?.name || null,
      };
    });
  }

  async suspend(tenantId: string, licenseKey: string) {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Invalid tenant');
    const license = await this.licenseModel.findOne({ tenantId: tid, licenseKey });
    if (!license) throw new NotFoundException('License not found');
    await this.licenseModel.updateOne(
      { tenantId: tid, licenseKey },
      { $set: { status: 'suspended', updatedAt: new Date() } },
    );
    return this.findByKey(tenantId, licenseKey);
  }

  async reactivate(tenantId: string, licenseKey: string) {
    const tid = toObjectId(tenantId);
    if (!tid) throw new BadRequestException('Invalid tenant');
    const license = await this.licenseModel.findOne({ tenantId: tid, licenseKey });
    if (!license) throw new NotFoundException('License not found');
    const now = new Date();
    if (new Date(license.expiryDate) < now) {
      throw new BadRequestException('Cannot reactivate expired license. Extend it first.');
    }
    await this.licenseModel.updateOne(
      { tenantId: tid, licenseKey },
      { $set: { status: 'active', updatedAt: new Date() } },
    );
    return this.findByKey(tenantId, licenseKey);
  }

  private toLicense(doc: any) {
    if (!doc) return null;
    const c = doc.customerId;
    return {
      id: doc._id?.toString(),
      licenseKey: doc.licenseKey,
      customerId: c?._id?.toString(),
      customerName: c?.name,
      customerEmail: c?.email,
      computerId: doc.computerId,
      startDate: doc.startDate,
      expiryDate: doc.expiryDate,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
