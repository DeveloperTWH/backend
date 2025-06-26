const express = require('express');
const router = express.Router();
const { getAllFaqs } = require('../../controllers/admin/faq.controller'); // Reusing for now
const { getAllTestimonials } = require('../../controllers/admin/testimonial.controller');



// Public CMS routes
router.get('/faqs', getAllFaqs);
// router.get('/blogs', getAllBlogs);         // coming soon
router.get('/testimonials', getAllTestimonials);

module.exports = router;
