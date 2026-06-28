const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function fixTenants() {
    // You might need to provide the actual DB URL here if it's not localhost
    const url = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/stationery_management';
    await mongoose.connect(url);
    
    // Model definitions
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const License = mongoose.model('License', new mongoose.Schema({}, { strict: false }), 'licenses');
    const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false }), 'roles');

    const dealerRole = await Role.findOne({ name: 'dealer' });
    const tenants = await Tenant.find({}).lean();
    
    console.log(`Checking ${tenants.length} tenants...`);

    for (const tenant of tenants) {
        if (tenant.name === 'Default Tenant') {
            console.log(`- Skipping Default Tenant`);
            continue;
        }

        const tid = tenant._id;
        const licenseCount = await License.countDocuments({ tenantId: tid });
        
        console.log(`- Tenant: ${tenant.name}, Licenses: ${licenseCount}, isActive: ${tenant.isActive}`);
        
        if (licenseCount === 0 && tenant.isActive) {
            console.log(`  Updating ${tenant.name} to isActive: false`);
            await Tenant.updateOne({ _id: tid }, { $set: { isActive: false } });
        }
    }

    console.log('Done.');
    await mongoose.disconnect();
}

fixTenants().catch(console.error);
