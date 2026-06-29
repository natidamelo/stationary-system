import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ItemDocument, ItemSchema } from '../schemas/item.schema';
import { CategoryDocument, CategorySchema } from '../schemas/category.schema';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ItemDocument.name, schema: ItemSchema },
      { name: CategoryDocument.name, schema: CategorySchema },
    ]),
    InventoryModule,
  ],
  providers: [ItemsService, CategoriesService],
  controllers: [ItemsController, CategoriesController],
  exports: [ItemsService, CategoriesService],
})
export class ItemsModule {}
