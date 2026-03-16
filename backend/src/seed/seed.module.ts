import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleDocument, RoleSchema } from '../schemas/role.schema';
import { UserDocument, UserSchema } from '../schemas/user.schema';
import { CategoryDocument, CategorySchema } from '../schemas/category.schema';
import { ItemDocument, ItemSchema } from '../schemas/item.schema';
import { SupplierDocument, SupplierSchema } from '../schemas/supplier.schema';
import { TenantDocument, TenantSchema } from '../schemas/tenant.schema';
import { SeedService } from './seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoleDocument.name, schema: RoleSchema },
      { name: UserDocument.name, schema: UserSchema },
      { name: CategoryDocument.name, schema: CategorySchema },
      { name: ItemDocument.name, schema: ItemSchema },
      { name: SupplierDocument.name, schema: SupplierSchema },
      { name: TenantDocument.name, schema: TenantSchema },
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
