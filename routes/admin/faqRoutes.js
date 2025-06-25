const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');
const {
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq
} = require('../../controllers/admin/faq.controller');

router.use(authenticate, isAdmin);

router.get('/', getAllFaqs);
router.post('/', createFaq);
router.put('/:id', updateFaq);
router.delete('/:id', deleteFaq);

module.exports = router;