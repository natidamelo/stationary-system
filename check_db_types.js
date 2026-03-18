const mongoose = require('mongoose');

async function checkTypes() {
    const url = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/stationery_management';
    await mongoose.connect(url);
    
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    const t = await Tenant.findOne({ name: 'Default Tenant' }).lean();
    if (t) {
        console.log(`Default Tenant isActive value: ${t.isActive} (Type: ${typeof t.isActive})`);
    }
    const t2 = await Tenant.findOne({ name: 'kilo' }).lean();
    if (t2) {
        console.log(`Kilo Tenant isActive value: ${t2.isActive} (Type: ${typeof t2.isActive})`);
    }
    await mongoose.disconnect();
}

checkTypes().catch(console.error);
