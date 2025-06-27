const express = require('express');
const router = express.Router();
const { getAllFaqs } = require('../../controllers/admin/faq.controller'); // Reusing for now
const { getAllTestimonials } = require('../../controllers/admin/testimonial.controller');
const { getAllBlogs, getBlogBySlug } = require('../../controllers/admin/Blog/blog.Controller');



// Public CMS routes
router.get('/faqs', getAllFaqs);

router.get('/blogs', getAllBlogs);
router.get('/blogs/:slug', getBlogBySlug);

router.get('/testimonials', getAllTestimonials);

module.exports = router;
