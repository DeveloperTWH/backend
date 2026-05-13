const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');
const { getAllFaqs } = require('../../controllers/admin/faq.controller');
const { getAllTestimonials } = require('../../controllers/admin/testimonial.controller');
const { getAllBlogs, getBlogBySlug } = require('../../controllers/admin/Blog/blog.Controller');


// Public CMS routes
router.get('/faqs', getAllFaqs);
router.get('/blogs', getAllBlogs);
router.get('/blogs/:slug', getBlogBySlug);
router.get('/testimonials', getAllTestimonials);
router.get('/how_it_works', getHowItWorks);


module.exports = router;
