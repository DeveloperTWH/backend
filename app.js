const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes')

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Mosaic Biz Hub API is working' });
});

module.exports = app;
