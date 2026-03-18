const mongoose = require('mongoose');

async function checkStatus() {
    const url = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/stationery_management';
    await mongoose.connect(url);
    
    const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const License = mongoose.model('License', new mongoose.Schema({}, { strict: false }), 'licenses');
    const Role = mongoose.model('Role', new mongoose.Schema({}, { strict: false }), 'roles');

    const users = await User.find({}).populate('roleId').lean();
    console.log('--- User & Tenant Status ---');
    for (const u of users) {
        const tenant = await Tenant.findById(u.tenantId).lean();
        const licCount = await License.countDocuments({ tenantId: u.tenantId, status: 'active' });
        const role = await Role.findById(u.roleId).lean();
        
        console.log(`User: ${u.email}`);
        console.log(`  Role: ${role?.name}`);
        console.log(`  Tenant: ${tenant?.name} (isActive: ${tenant?.isActive})`);
        console.log(`  Active Licenses: ${licCount}`);
        console.log(`  Blocked? ${u.email !== 'dealer@example.com' && (tenant?.isActive === false || licCount === 0) ? 'YES' : 'NO'}`);
        console.log('---------------------------');
    }

    await mongoose.disconnect();
}

checkStatus().catch(console.error);
