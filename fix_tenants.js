const mongoose = require('mongoose');

async function fixData() {
    await mongoose.connect('mongodb://localhost:27017/stationery_management');
    
    // 1. Get default tenant
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    let tenant = await Tenant.findOne({ name: 'Default Tenant' });
    if (!tenant) {
        tenant = await Tenant.create({ name: 'Default Tenant', slug: 'default', isActive: true });
        console.log('Created Default Tenant');
    }
    const tid = tenant._id;
    console.log('Default Tenant ID:', tid);

    const collections = ['users', 'items', 'categories', 'suppliers', 'purchase_requests', 'purchase_orders', 'sales', 'notifications', 'attachments', 'licenses', 'audit_logs'];
    
    for (const collName of collections) {
        const Model = mongoose.model(collName, new mongoose.Schema({}, { strict: false }), collName);
        const result = await Model.updateMany(
            { $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }] },
            { $set: { tenantId: tid } }
        );
        console.log(`Updated ${collName}: ${result.modifiedCount} documents`);
    }

    await mongoose.disconnect();
}

fixData().catch(console.error);
