import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateItemDto } from './src/items/dto/create-item.dto';

const payload = {
  sku: '123',
  name: 'test',
  unit: 'unit',
  reorderLevel: 0,
  price: 150,
  costPrice: 100,
  barcode: '123'
};

const dto = plainToInstance(CreateItemDto, payload);
validate(dto).then(errors => {
  console.log('Validation Errors:', JSON.stringify(errors, null, 2));
});
