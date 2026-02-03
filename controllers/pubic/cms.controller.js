const CMS = require('../../models/CMS');

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
