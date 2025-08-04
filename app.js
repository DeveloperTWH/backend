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
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const publicListingRoutes = require('./routes/publicListing');
const privateListingRoutes = require('./routes/privateListing');


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

const allowedOrigins = [
  'http://localhost:3000',
  'https://app.minorityownedbusiness.info'
];
app.set('trust proxy', 1);
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));




// Subscrption
app.use(cookieParser());
const stripeRoutes = require('./routes/stripeRoutes');


app.use('/api/stripe', stripeRoutes);
app.use(express.json());



app.use('/api', publicListingRoutes);
app.use('/api/private', privateListingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/product', productRoutes);
app.use('/api/service',serviceRoutes );
app.use('/api/minority-types', minorityTypeRoutes);
app.use('/api', uploadImageRoute);
app.use('/api', subscriptionRoutes);
app.use('/api', categoryRoutes);


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


// subscription 



// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Mosaic Biz Hub API is working' });
});

// require('./jobs/cleanupImages');

module.exports = app;
