const ServiceCategory = require('../../models/ServiceCategory');
const deleteCloudinaryFile = require('../../utils/deleteCloudinaryFile');


exports.getServiceCategories = async (req, res) => {
  try {
    const categories = await ServiceCategory.find().sort({ createdAt: -1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createServiceCategory = async (req, res) => {
  try {
    const { name, description, img } = req.body;
    const category = new ServiceCategory({ name, description, img });
    await category.save();
    res.status(201).json({ success: true, category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateServiceCategory = async (req, res) => {
  try {
    const { name, description, img } = req.body;
    const category = await ServiceCategory.findByIdAndUpdate(
      req.params.id,
      { name, description, img },
      { new: true }
    );
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteServiceCategory = async (req, res) => {
  try {
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Delete image from S3 if exists
    if (category.img) {
      await deleteCloudinaryFile(category.img);
    }

    await category.deleteOne(); // Use deleteOne instead of findByIdAndDelete to reuse the fetched object

    res.json({ success: true, message: 'Category and image deleted successfully' });
  } catch (err) {
    console.error('Delete Service Category Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
