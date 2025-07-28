const mongoose = require("mongoose");
require("dotenv").config();

// ✅ Local & Atlas URIs
const localURI = "mongodb://127.0.0.1:27017/mosaic";
const atlasURI = process.env.MONGODB_URI

// ✅ Define the schema for the collection you want to migrate
const subscriptionPlanSchema = new mongoose.Schema({}, { strict: false }); 
// strict: false → copies all fields as they are

const LocalConnection = mongoose.createConnection(localURI);
const AtlasConnection = mongoose.createConnection(atlasURI);

const LocalSubscriptionPlan = LocalConnection.model("subscriptionplans", subscriptionPlanSchema);
const AtlasSubscriptionPlan = AtlasConnection.model("subscriptionplans", subscriptionPlanSchema);

async function migrate() {
  try {
    await LocalConnection.asPromise();
    await AtlasConnection.asPromise();

    console.log("✅ Connected to Local & Atlas DBs");

    const localData = await LocalSubscriptionPlan.find({});
    if (localData.length === 0) {
      console.log("⚠️ No data found in local DB.");
      process.exit();
    }

    // Clear old data in Atlas before inserting (optional)
    await AtlasSubscriptionPlan.deleteMany({});

    // Insert data into Atlas
    await AtlasSubscriptionPlan.insertMany(localData);
    console.log(`✅ Migrated ${localData.length} documents from local to Atlas!`);

    process.exit();
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
