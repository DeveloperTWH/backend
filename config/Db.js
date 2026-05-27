const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mbh';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('DB connection error:', err.message);
    if (err?.name === 'MongooseServerSelectionError') {
      console.error(
        'Atlas connectivity hint: the app can resolve your cluster but cannot reach a writable primary node. Check Atlas Network Access, local firewall/VPN, and outbound access to port 27017.'
      );
    }
    throw err;
  }
};

module.exports = connectDB;
