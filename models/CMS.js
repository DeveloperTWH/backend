const mongoose = require('mongoose');

const cmsSchema = new mongoose.Schema({
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['privacy-policy', 'terms-of-service', 'about-us', 'contact-info', 'refund-policy', 'shipping-policy', 'cookie-policy']
  },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  metaTitle: String,
  metaDescription: String,
  isActive: { type: Boolean, default: true },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CMS', cmsSchema);
