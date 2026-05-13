const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authenticate");
const requireVerifiedVendor = require("../middlewares/requireVerifiedVendor");
const authenticate = require('../middlewares/authenticate');
const isAdmin = require('../middlewares/isAdmin');

const {
  saveDraft,
  getDraft,
  submitForReview,
  createVerificationPayment,
  getPaymentStatus,
  handleVendorPaymentWebhook,
  markPaymentAsPaid,
  getStatusByApplicationId,
  getApplicationId,
  getOnboardingData,
  updateBusinessProfile,
  patchBusinessProfile,
} = require("../controllers/vendorOnboarding.controller");

const {
  getStage1UploadUrl,
} = require("../controllers/vendorOnboardingUpload.controller");

const {
  getPendingApplications,
  getApplicationDetails,
  verifyAndAllocatePoints,
  finalizeVerification,
} = require("../controllers/admin/vendorOnboardVerifyStage1");

// ===== VENDOR ROUTES (Require Vendor Role) =====
router.post("/draft", authMiddleware, requireVerifiedVendor, saveDraft);
router.get("/draft", authMiddleware, requireVerifiedVendor, getDraft);
router.post('/stage1/mark-paid', authMiddleware, requireVerifiedVendor, markPaymentAsPaid);
router.post("/submit", authMiddleware, requireVerifiedVendor, submitForReview);
router.get("/onboarding-data", authMiddleware, requireVerifiedVendor, getOnboardingData);

router.put("/business-profile", authMiddleware, requireVerifiedVendor, updateBusinessProfile);
router.patch("/business-profile", authMiddleware, requireVerifiedVendor, patchBusinessProfile);

// In routes/vendorOnboarding.routes.js, add:
router.get('/status/:applicationId', getStatusByApplicationId);

router.get('/applicationId',authMiddleware,getApplicationId);

router.get("/stage1/upload-url", authMiddleware, requireVerifiedVendor, getStage1UploadUrl);
router.post("/stage1/create-payment", authMiddleware, requireVerifiedVendor, createVerificationPayment);
router.get("/stage1/payment-status", authMiddleware, requireVerifiedVendor, getPaymentStatus);

// ===== WEBHOOK ROUTE (No Auth) =====
router.post("/webhook/payment", express.raw({ type: 'application/json' }), handleVendorPaymentWebhook);

// ===== ADMIN ROUTES (Require Admin Role) =====
router.get('/pending', authenticate, isAdmin, getPendingApplications);
router.get('/:applicationId', authenticate, isAdmin, getApplicationDetails);
router.post('/:applicationId/verify', authenticate, isAdmin, verifyAndAllocatePoints);
router.post('/:applicationId/finalize', authenticate, isAdmin, finalizeVerification);

module.exports = router;
