const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI || "mongodb+srv://kinfenati7_db_user:Nat2325%3F@cluster0.ldkwywk.mongodb.net/stationery_management?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    const Item = mongoose.connection.db.collection('items');
    const Category = mongoose.connection.db.collection('categories');

    const totalItems = await Item.countDocuments();
    const totalCategories = await Category.countDocuments();

    console.log(`Total Items in DB: ${totalItems}`);
    console.log(`Total Categories in DB: ${totalCategories}`);

    if (totalCategories > 0) {
        const cats = await Category.find({}).toArray();
        cats.forEach(c => console.log(`Category: "${c.name}" ID: ${c._id}`));
    }

    if (totalItems > 0) {
        const items = await Item.find({}).toArray();
        items.forEach(i => {
            console.log(i.name, i.categoryId);
        });
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
