const mongoose = require('mongoose');

const uri = "mongodb+srv://kinfenati7_db_user:3nCkjUWaBLmIMG0C@cluster0.usuuyhh.mongodb.net/stationery_management?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    
    // Define Category Schema
    const categorySchema = new mongoose.Schema({
        name: String,
        description: String
    }, { collection: 'categories' });
    
    const Category = mongoose.model('Category', categorySchema);
    
    // Define Item Schema
    const itemSchema = new mongoose.Schema({
        name: String,
        sku: String,
        categoryId: mongoose.Schema.Types.ObjectId
    }, { collection: 'items' });
    
    const Item = mongoose.model('Item', itemSchema);

    const categories = await Category.find({});
    console.log("Categories found:", categories.length);
    categories.forEach(c => console.log(`- ${c.name} (${c._id})`));

    const items = await Item.find({});
    console.log("Items found:", items.length);
    items.forEach(i => console.log(`- ${i.name} (Cat: ${i.categoryId})`));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
