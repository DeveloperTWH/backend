// seedMinorityTypes.js

const mongoose = require('mongoose');
require('dotenv').config(); // If using .env for DB connection
const MinorityType = require('../models/MinorityType'); // adjust path as needed

const seedMinorityTypes = async () => {
  const types = [
    { name: "African Americans", description: "" },
    { name: "Alaska Natives", description: "" },
    { name: "Arab and other Middle Eastern Americans", description: "" },
    { name: "Asian Americans", description: "" },
    { name: "Latinos (including Puerto Ricans)", description: "" },
    { name: "Native Americans", description: "" },
    { name: "Native Hawai’ians", description: "" },
    { name: "Pacific Islanders", description: "" }
  ];

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name');
    console.log('Connected to MongoDB');

    const existing = await MinorityType.find({});
    if (existing.length > 0) {
      console.log('Minority types already exist. Skipping insert.');
    } else {
      await MinorityType.insertMany(types);
      console.log('Minority types inserted successfully');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error seeding minority types:', err);
    process.exit(1);
  }
};

seedMinorityTypes();
