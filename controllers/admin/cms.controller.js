const CMS = require('../../models/CMS');

// Admin functions
exports.getAllCMS = async (req, res) => {
  try {
    const cms = await CMS.find().populate('lastUpdatedBy', 'name email').sort({ slug: 1 });
    res.json({ success: true, data: cms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch CMS content' });
  }
};

exports.getCMSBySlug = async (req, res) => {
  try {
    const cms = await CMS.findOne({ slug: req.params.slug });
    if (!cms) return res.status(404).json({ success: false, message: 'CMS content not found' });
    res.json({ success: true, data: cms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch CMS content' });
  }
};

exports.createOrUpdateCMS = async (req, res) => {
  try {
    const { slug } = req.params;
    const updateData = { ...req.body, lastUpdatedBy: req.user?.id };
    
    const cms = await CMS.findOneAndUpdate(
      { slug },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json({ success: true, message: 'CMS content updated successfully', data: cms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update CMS content' });
  }
};

exports.deleteCMS = async (req, res) => {
  try {
    const cms = await CMS.findOneAndDelete({ slug: req.params.slug });
    if (!cms) return res.status(404).json({ success: false, message: 'CMS content not found' });
    res.json({ success: true, message: 'CMS content deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete CMS content' });
  }
};

exports.toggleCMSStatus = async (req, res) => {
  try {
    const cms = await CMS.findOne({ slug: req.params.slug });
    if (!cms) return res.status(404).json({ success: false, message: 'CMS content not found' });
    
    cms.isActive = !cms.isActive;
    cms.lastUpdatedBy = req.user?.id;
    await cms.save();
    
    res.json({ 
      success: true, 
      message: `CMS content ${cms.isActive ? 'activated' : 'deactivated'}`, 
      data: cms 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle CMS status' });
  }
};

// Public function
exports.getPublicCMSBySlug = async (req, res) => {
  try {
    const cms = await CMS.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    }).select('-lastUpdatedBy -__v');
    
    if (!cms) return res.status(404).json({ success: false, message: 'CMS content not found' });
    res.json({ success: true, data: cms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch CMS content' });
  }
};

exports.updateHowItWorksSection = async (req, res) => {
  try {
    const { section } = req.params;
    const { title, content, icon, isActive } = req.body;
    
    const cms = await CMS.findOneAndUpdate(
      { slug: 'how_it_works' },
      { 
        [`sections.${section}`]: { title, content, icon, isActive },
        lastUpdatedBy: req.user?.id 
      },
      { new: true, upsert: true }
    );
    
    res.json({ success: true, data: cms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update section' });
  }
};

exports.getHowItWorks = async (req, res) => {
  try {
    const cms = await CMS.findOne({ slug: 'how_it_works', isActive: true })
      .select('-lastUpdatedBy -__v');
    
    if (!cms) return res.status(404).json({ success: false, message: 'Content not found' });
    res.json({ success: true, data: cms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch content' });
  }
};