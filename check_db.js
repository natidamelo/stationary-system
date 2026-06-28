const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function checkRoles() {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://kinfenati7_db_user:Nat2325%3F@cluster0.ldkwywk.mongodb.net/stationery_management?appName=Cluster0";
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected.');

    const roles = await mongoose.connection.db.collection('roles').find({}).toArray();
    console.log('Roles found:', roles);

    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('Total users:', users.length);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkRoles();
