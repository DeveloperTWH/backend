const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const userRoutes = require('./routes/userRoutes')
const businessRoutes = require('./routes/businessRoutes');
const subscriptionPlanRoutes = require('./routes/subscriptionPlanRoutes')
const productRoutes = require('./routes/productRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const minorityTypeRoutes = require('./routes/minorityTypeRoutes');
const uploadImageRoute = require('./routes/uploadImage')


// Content Management Route - FAQ / BLOG / TESTIMONIALS
const cmsRoutes = require('./routes/cms/cmsRoutes');


// admin Routes
const adminUserRoutes =require('./routes/admin/userRoutes')
const adminFaqRoutes = require('./routes/admin/faqRoutes');
const testimonialRoutes = require('./routes/admin/testimonialRoutes');
const blogRoutes = require('./routes/admin/Blog/blogRoutes');


// User Routes
const wishlistRoutes = require('./routes/customer/wishlistRoutes');



// Import Payment and Order Routes
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');


const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',  // your frontend URL
  credentials: true                 // optional, only if using cookies or auth headers
}));

app.use(express.json());
app.use(cookieParser());




app.use('/api/users', userRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/product', productRoutes);
app.use('/api/service',serviceRoutes );
app.use('/api/minority-types', minorityTypeRoutes);
app.use('/api', uploadImageRoute);


//CMS Route's
app.use('/cms', cmsRoutes);


// Admin Routes
app.use('/admin/users', adminUserRoutes);
app.use('/admin/faqs', adminFaqRoutes);
app.use('/api/admin/testimonials', testimonialRoutes);
app.use('/admin/api/blogs', blogRoutes);


// User Routes
app.use('/api/wishlist', wishlistRoutes);




app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/webhooks', webhookRoutes);


// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Mosaic Biz Hub API is working' });
});

// require('./jobs/cleanupImages');

module.exports = app;
