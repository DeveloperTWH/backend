const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.models.FAQ || mongoose.model('FAQ', faqSchema);
