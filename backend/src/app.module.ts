import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ItemsModule } from './items/items.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { InventoryModule } from './inventory/inventory.module';
import { DistributionModule } from './distribution/distribution.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReceptionModule } from './reception/reception.module';
import { ServicesModule } from './services/services.module';
import { SearchModule } from './search/search.module';
import { ReportsModule } from './reports/reports.module';
import { UploadModule } from './upload/upload.module';
import { SeedModule } from './seed/seed.module';
import { LicenseModule } from './license/license.module';
import { CustomersModule } from './customers/customers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.url') || 'mongodb://localhost:27017/stationery_management',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ItemsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    PurchaseRequestsModule,
    InventoryModule,
    DistributionModule,
    DashboardModule,
    ReceptionModule,
    ServicesModule,
    SearchModule,
    ReportsModule,
    UploadModule,
    SeedModule,
    LicenseModule,
    CustomersModule,
    InvoicesModule,
    NotificationsModule,
    AuditLogModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
