const express = require('express');
const router = express.Router();
const { getAllServices } = require('../controllers/publicListing');

router.get('/services/list', getAllServices);

module.exports = router;
