const mongoose = require("mongoose");

async function DBConnect(url) {
  try {
    const dbName = process.env.MONGO_DB_NAME || 'ACT-Restaurant';
    await mongoose.connect(url, { dbName });
    console.log(`✅ MongoDB is Connected (db: ${dbName})`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
  }
}

module.exports = DBConnect;
