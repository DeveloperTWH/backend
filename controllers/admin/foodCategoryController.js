const FoodCategory = require('../../models/FoodCategory');


exports.createFoodCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existing = await FoodCategory.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await FoodCategory.create({ name, description });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getFoodCategories = async (req, res) => {
  try {
    const categories = await FoodCategory.find().sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.updateFoodCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await FoodCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.name = name || category.name;
    category.description = description || category.description;

    await category.save();

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.deleteFoodCategory = async (req, res) => {
  try {
    const category = await FoodCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
