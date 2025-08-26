require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/Db');

const PORT = process.env.PORT || 3001;

connectDB();
app.listen(PORT, "0.0.0.0" , () => {
  console.log(`Server running on port ${PORT}`);
});
