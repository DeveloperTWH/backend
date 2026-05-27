require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/Db');

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server startup aborted because MongoDB is unavailable.');
    process.exit(1);
  }
};

startServer();
