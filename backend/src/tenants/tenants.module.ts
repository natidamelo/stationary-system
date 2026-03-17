import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { TenantDocument, TenantSchema } from '../schemas/tenant.schema';
import { UserDocument, UserSchema } from '../schemas/user.schema';
import { LicenseDocument, LicenseSchema } from '../schemas/license.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TenantDocument.name, schema: TenantSchema },
      { name: UserDocument.name, schema: UserSchema },
      { name: LicenseDocument.name, schema: LicenseSchema },
    ]),
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
