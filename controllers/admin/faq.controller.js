const FAQ = require('../../models/FAQ');

exports.getAllFaqs = async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: faqs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch FAQs' });
  }
};

exports.createFaq = async (req, res) => {
  try {
    const { question, answer } = req.body;
    const faq = await FAQ.create({ question, answer });
    res.status(201).json({ success: true, message: 'FAQ created', data: faq });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create FAQ' });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });

    res.status(200).json({ success: true, message: 'FAQ updated', data: faq });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update FAQ' });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });

    res.status(200).json({ success: true, message: 'FAQ permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete FAQ' });
  }
};
