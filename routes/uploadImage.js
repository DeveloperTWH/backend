// routes/uploadImage.js

const express = require('express');
const router = express.Router();
const savePendingImage = require('../utils/savePendingImage'); // Function to save image URL
const { body, validationResult } = require('express-validator');
const authenticateUser = require('../middlewares/authenticate'); // Auth middleware to authenticate user
const isBusinessOwner = require('../middlewares/isBusinessOwner');

// Check if the URL is a valid Cloudinary image URL
const isValidCloudinaryUrl = (url) => {
  const regex = /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/.*$/;
  return regex.test(url);
};

// POST route for uploading image and saving it in PendingImage collection
router.post(
  '/upload-image',
  authenticateUser, // Ensure the user is authenticated
  isBusinessOwner,
  [
    body('fileUrl').custom((value) => {
      if (!isValidCloudinaryUrl(value)) {
        throw new Error('Invalid Cloudinary URL');
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { fileUrl } = req.body; // Get the image URL from the request body
      const userId = req.user._id; // Get the authenticated user's ID

      // Save the image URL and timestamp to PendingImage collection
      await savePendingImage(fileUrl, userId);

      return res.status(200).json({
        message: 'Image uploaded and pending record saved successfully. It will be cleaned up after 10 minutes if not associated with any product.',
      });
    } catch (err) {
      console.error('Error uploading image:', err);
      return res.status(500).json({ error: 'Server error while uploading image.' });
    }
  }
);

module.exports = router;
