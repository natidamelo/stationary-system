const mongoose = require('mongoose');

const uri = "mongodb+srv://kinfenati7_db_user:3nCkjUWaBLmIMG0C@cluster0.usuuyhh.mongodb.net/stationery_management?appName=Cluster0";

async function run() {
  try {
    console.log("Connecting to:", uri);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected.");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`- ${col.name}: ${count} docs`);
        if (count > 0) {
            const sample = await db.collection(col.name).findOne({});
            console.log(`  Sample:`, JSON.stringify(sample).substring(0, 100));
        }
    }

    process.exit(0);
  } catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
  }
}

run();
