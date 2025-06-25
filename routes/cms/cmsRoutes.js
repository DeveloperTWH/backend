const express = require('express');
const router = express.Router();
const { getAllFaqs } = require('../../controllers/admin/faq.controller'); // Reusing for now

// Public CMS routes
router.get('/faqs', getAllFaqs);
// router.get('/blogs', getAllBlogs);         // coming soon
// router.get('/testimonials', getAllTestimonials); // coming soon

module.exports = router;
