const mongoose = require('mongoose');

const PendingImageSchema = new mongoose.Schema({
  fileUrl: { type: String, required: true }, // Cloudinary image URL
  uploadedAt: { type: Date, required: true }, // Timestamp of when the image was uploaded
});

module.exports = mongoose.model('PendingImage', PendingImageSchema);
