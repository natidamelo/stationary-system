const mongoose = require('mongoose');

const uri = "mongodb+srv://kinfenati7_db_user:3nCkjUWaBLmIMG0C@cluster0.usuuyhh.mongodb.net/stationery_management?appName=Cluster0";

mongoose.connect(uri)
  .then(() => {
    console.log("Successfully connected to MongoDB Atlas!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB Atlas:", err.message);
    process.exit(1);
  });
