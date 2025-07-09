const express = require('express');
const { getAllCategories } = require('../controllers/categoryController');
const router = express.Router();

// Route to get all categories
router.get('/categories', getAllCategories);

module.exports = router;
