const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || "mongodb+srv://kinfenati7_db_user:Nat2325%3F@cluster0.ldkwywk.mongodb.net/stationery_management?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({ name: String }, { collection: 'tenants' }));
    const Item = mongoose.model('Item', new mongoose.Schema({ name: String, sku: String, tenantId: mongoose.Schema.Types.ObjectId }, { collection: 'items' }));

    const tenants = await Tenant.find({});
    console.log("\n--- Tenants ---");
    tenants.forEach(t => console.log(`${t.name} (ID: ${t._id})`));

    const items = await Item.find({});
    console.log("\n--- Items ---");
    console.log("Total items in DB:", items.length);
    items.forEach(i => console.log(`- ${i.name} (SKU: ${i.sku}, Tenant: ${i.tenantId})`));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

run();
