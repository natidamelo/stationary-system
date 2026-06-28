const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function fixData() {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/stationery_management';
    await mongoose.connect(url);
    
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    let tenant = await Tenant.findOne({ name: 'Default Tenant' });
    if (!tenant) {
        tenant = await Tenant.create({ name: 'Default Tenant', slug: 'default', isActive: true });
        console.log('Created Default Tenant');
    }
    const tid = tenant._id;
    console.log('Default Tenant ID:', tid);

    // Get all collection names except system collections and tenants
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name).filter(n => !n.startsWith('system.') && n !== 'tenants');
    
    console.log('Migrating collections:', names);

    for (const collName of names) {
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
