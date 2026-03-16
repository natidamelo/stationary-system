const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.DATABASE_URL || 'mongodb+srv://kinfenati7_db_user:3nCkjUWaBLmIMG0C@cluster0.usuuyhh.mongodb.net/stationery_management?appName=Cluster0');
  
  const items = await mongoose.connection.collection('items').find({ isActive: true }).toArray();
  const balances = items.map(i => i._id.toString()); // mock
  
  const ItemModel = mongoose.model('Item', new mongoose.Schema({
    sku: String,
    name: String,
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    reorderLevel: Number,
    isActive: Boolean
  }));

  mongoose.model('Category', new mongoose.Schema({
    name: String
  }));

  const populated = await ItemModel.find({ isActive: true }).populate('categoryId').lean();

  console.log(JSON.stringify(populated.map(i => ({
    name: i.name,
    category: i.categoryId ? { name: i.categoryId.name } : undefined
  })), null, 2));

  process.exit(0);
}

check();
