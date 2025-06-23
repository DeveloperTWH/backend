const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes')
const businessRoutes = require('./routes/businessRoutes');
const subscriptionPlanRoutes = require('./routes/subscriptionPlanRoutes')
const productRoutes = require('./routes/productRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const uploadImageRoute = require('./routes/uploadImage')

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',  // your frontend URL
  credentials: true                 // optional, only if using cookies or auth headers
}));

app.use(express.json());




app.use('/api/users', userRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/product', productRoutes);
app.use('/api/service',serviceRoutes );
app.use('/api', uploadImageRoute);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Mosaic Biz Hub API is working' });
});

// require('./jobs/cleanupImages');

module.exports = app;
