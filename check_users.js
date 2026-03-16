const mongoose = require('mongoose');

async function checkUsers() {
    await mongoose.connect('mongodb://localhost:27017/stationery_management');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const users = await User.find({}).lean();
    console.log('Users in DB:');
    users.forEach(u => {
        console.log(`- ${u.email}: tenantId=${u.tenantId} (${typeof u.tenantId})`);
    });
    await mongoose.disconnect();
}

checkUsers();
