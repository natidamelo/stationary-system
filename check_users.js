const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function checkUsers() {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/stationery_management';
    await mongoose.connect(url);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const users = await User.find({}).lean();
    console.log('Users in DB:');
    users.forEach(u => {
        console.log(`- ${u.email}: tenantId=${u.tenantId} (${typeof u.tenantId})`);
    });
    await mongoose.disconnect();
}

checkUsers();
