const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI || "mongodb+srv://kinfenati7_db_user:Nat2325%3F@cluster0.ldkwywk.mongodb.net/stationery_management?appName=Cluster0";

mongoose.connect(uri)
  .then(() => {
    console.log("Successfully connected to MongoDB Atlas!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB Atlas:", err.message);
    process.exit(1);
  });
