import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceDocument, InvoiceSchema } from '../schemas/invoice.schema';
import { SaleDocument, SaleSchema } from '../schemas/sale.schema';
import { ItemDocument, ItemSchema } from '../schemas/item.schema';
import { ServiceDocument, ServiceSchema } from '../schemas/service.schema';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InvoiceDocument.name, schema: InvoiceSchema },
      { name: SaleDocument.name, schema: SaleSchema },
      { name: ItemDocument.name, schema: ItemSchema },
      { name: ServiceDocument.name, schema: ServiceSchema },
    ]),
  ],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
