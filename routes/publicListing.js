const express = require('express');
const router = express.Router();
const { getAllServices, getServiceBySlug } = require('../controllers/publicListing');

router.get('/services/list', getAllServices);

router.get('/services/:slug', getServiceBySlug);

module.exports = router;
