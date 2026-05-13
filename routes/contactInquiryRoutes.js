const express = require('express');
const router = express.Router();

const { createContactInquiry } = require('../controllers/contactInquiry.controller');

router.post('/', createContactInquiry);

module.exports = router;