const express = require('express');
const router = express.Router();
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');
const {
  getAllCMS,
  getCMSBySlug,
  createOrUpdateCMS,
  deleteCMS,
  toggleCMSStatus,
  getPublicCMSBySlug,
  updateHowItWorksSection,
  getHowItWorks
} = require('../../controllers/admin/cms.controller');

// Public routes (no auth required)
router.get('/public/:slug', getPublicCMSBySlug);
router.get('/public/how_it_works', getHowItWorks);

// Admin routes (auth required)
router.use('/admin', authenticate, isAdmin);
router.get('/admin', getAllCMS);
router.get('/admin/:slug', getCMSBySlug);
router.post('/admin/:slug', createOrUpdateCMS);
router.put('/admin/:slug', createOrUpdateCMS);
router.delete('/admin/:slug', deleteCMS);
router.patch('/admin/:slug/toggle', toggleCMSStatus);
router.put('/admin/how_it_works/:section', updateHowItWorksSection);

module.exports = router;
