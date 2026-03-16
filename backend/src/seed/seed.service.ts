import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { RoleDocument } from '../schemas/role.schema';
import { UserDocument } from '../schemas/user.schema';
import { CategoryDocument } from '../schemas/category.schema';
import { ItemDocument } from '../schemas/item.schema';
import { SupplierDocument } from '../schemas/supplier.schema';
import { TenantDocument } from '../schemas/tenant.schema';
import { RoleEnum } from '../common/enums';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(RoleDocument.name)
    private roleModel: Model<RoleDocument>,
    @InjectModel(UserDocument.name)
    private userModel: Model<UserDocument>,
    @InjectModel(CategoryDocument.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(ItemDocument.name)
    private itemModel: Model<ItemDocument>,
    @InjectModel(SupplierDocument.name)
    private supplierModel: Model<SupplierDocument>,
    @InjectModel(TenantDocument.name)
    private tenantModel: Model<TenantDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    const defaultTenant = await this.seedDefaultTenant();
    await this.seedDealerIfNeeded(defaultTenant._id);
    await this.seedAdminIfNeeded(defaultTenant._id);
    await this.seedReceptionIfNeeded(defaultTenant._id);
    // await this.seedExampleDataIfNeeded(defaultTenant._id); // Disabled to keep it clean for new users
    console.log('[Seed] Default users: admin@example.com / Admin@123, dealer@example.com / Dealer@123, reception@example.com / Reception@123');
  }

  private async seedRoles() {
    const names = [RoleEnum.DEALER, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.EMPLOYEE, RoleEnum.INVENTORY_CLERK, RoleEnum.RECEPTION];
    for (const name of names) {
      const exists = await this.roleModel.findOne({ name }).lean();
      if (!exists) {
        await this.roleModel.create({ name, description: `${name} role` });
      }
    }
  }

  private async seedDefaultTenant() {
    let tenant = await this.tenantModel.findOne({ name: 'Default Tenant' }).exec();
    if (!tenant) {
      tenant = await this.tenantModel.create({
        name: 'Default Tenant',
        slug: 'default',
        isActive: true,
      });
    }
    return tenant;
  }

  private async seedDealerIfNeeded(tenantId: Types.ObjectId) {
    const dealerRole = await this.roleModel.findOne({ name: RoleEnum.DEALER }).lean();
    if (!dealerRole) return;
    const hash = await bcrypt.hash('Dealer@123', 10);
    await this.userModel.findOneAndUpdate(
      { email: 'dealer@example.com' },
      {
        $set: {
          email: 'dealer@example.com',
          passwordHash: hash,
          fullName: 'Dealer / Developer',
          roleId: dealerRole._id,
          tenantId: tenantId,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
  }

  private async seedAdminIfNeeded(tenantId: Types.ObjectId) {
    const adminRole = await this.roleModel.findOne({ name: RoleEnum.ADMIN }).lean();
    if (!adminRole) return;
    const hash = await bcrypt.hash('Admin@123', 10);
    await this.userModel.findOneAndUpdate(
      { email: 'admin@example.com' },
      {
        $set: {
          email: 'admin@example.com',
          passwordHash: hash,
          fullName: 'Customer Admin',
          roleId: adminRole._id,
          tenantId: tenantId,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
  }

  private async seedReceptionIfNeeded(tenantId: Types.ObjectId) {
    const receptionRole = await this.roleModel.findOne({ name: RoleEnum.RECEPTION }).lean();
    if (!receptionRole) return;
    const hash = await bcrypt.hash('Reception@123', 10);
    await this.userModel.findOneAndUpdate(
      { email: 'reception@example.com' },
      {
        $set: {
          email: 'reception@example.com',
          passwordHash: hash,
          fullName: 'Reception User',
          roleId: receptionRole._id,
          tenantId: tenantId,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
  }

  private async seedExampleDataIfNeeded(tenantId: Types.ObjectId) {
    const hasItems = await this.itemModel.countDocuments({ tenantId });
    if (hasItems > 0) return;

    const categories = await Promise.all([
      this.categoryModel.create({ tenantId, name: 'Pens & Pencils', description: 'Writing instruments' }),
      this.categoryModel.create({ tenantId, name: 'Paper', description: 'Paper and pads' }),
      this.categoryModel.create({ tenantId, name: 'Office Supplies', description: 'General office items' }),
    ]);

    const [pens, paper, office] = categories;

    await this.itemModel.insertMany([
      { tenantId, sku: 'PEN-BLUE-001', name: 'Blue Ballpoint Pen', categoryId: pens._id, unit: 'piece', reorderLevel: 50, price: 2.5 },
      { tenantId, sku: 'PEN-BLACK-001', name: 'Black Ballpoint Pen', categoryId: pens._id, unit: 'piece', reorderLevel: 50, price: 2.5 },
      { tenantId, sku: 'PENCIL-HB-001', name: 'HB Pencil', categoryId: pens._id, unit: 'piece', reorderLevel: 100, price: 1.2 },
      { tenantId, sku: 'PAPER-A4-001', name: 'A4 Copy Paper (Ream)', categoryId: paper._id, unit: 'ream', reorderLevel: 20, price: 4.5 },
      { tenantId, sku: 'PAPER-NOTE-001', name: 'Sticky Notes (Pack)', categoryId: paper._id, unit: 'pack', reorderLevel: 30, price: 3.0 },
      { tenantId, sku: 'STAPLER-001', name: 'Desktop Stapler', categoryId: office._id, unit: 'piece', reorderLevel: 10, price: 8.0 },
      { tenantId, sku: 'CLIP-001', name: 'Paper Clips (Box)', categoryId: office._id, unit: 'box', reorderLevel: 25, price: 2.0 },
      { tenantId, sku: 'TAPE-001', name: 'Adhesive Tape Roll', categoryId: office._id, unit: 'piece', reorderLevel: 15, price: 1.5 },
    ]);

    await this.supplierModel.insertMany([
      { tenantId, name: 'Office Depot Co.', contactPerson: 'Jane Smith', email: 'orders@officedepot.example.com', phone: '+1 555-0100', address: '123 Business Ave' },
      { tenantId, name: 'Stationery Plus Ltd.', contactPerson: 'John Doe', email: 'sales@stationeryplus.example.com', phone: '+1 555-0200', address: '456 Supply Street' },
    ]);
  }
}
