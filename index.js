require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/Db');

const PORT = process.env.PORT || 5000;

connectDB();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
