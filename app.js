const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes')

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',  // your frontend URL
  credentials: true                 // optional, only if using cookies or auth headers
}));

app.use(express.json());

app.use('/api/users', userRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Mosaic Biz Hub API is working' });
});

module.exports = app;
