const FoodCategory = require('../models/FoodCategory');
const ProductCategory = require('../models/ProductCategory');
const ServiceCategory = require('../models/ServiceCategory');
const ProductSubcategory = require('../models/ProductSubcategory');


const  getAllCategoriesAdmin = async (req, res) => {
  try {
    // Fetch service and food categories (no subcategories)
    const foodCategories = await FoodCategory.find();
    const serviceCategories = await ServiceCategory.find();

    // Fetch product categories
    const productCategories = await ProductCategory.find();

    // Fetch subcategories and group by categoryId
    const productSubcategories = await ProductSubcategory.find();

    const subcategoryMap = {};
    for (const sub of productSubcategories) {
      const catId = sub.category.toString();
      if (!subcategoryMap[catId]) subcategoryMap[catId] = [];
      subcategoryMap[catId].push({
        _id: sub._id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
      });
    }

    // Add subcategories to each product category
    const productWithSubcategories = productCategories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      img: cat.img,
      subcategories: subcategoryMap[cat._id.toString()] || [],
    }));

    return res.status(200).json({
      success: true,
      data: {
        foodCategories,
        serviceCategories,
        productCategories: productWithSubcategories,
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
};



// Controller to get all categories
const getAllCategories = async (req, res) => {
  try {
    
    const foodCategories = await FoodCategory.find();
    const productCategories = await ProductCategory.find();
    const serviceCategories = await ServiceCategory.find();
    

    return res.status(200).json({
      success: true,
      data: {
        foodCategories,
        productCategories,
        serviceCategories,
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
};
const getProductCategories = async (req, res) => {
  try {
    
    const productCategories = await ProductCategory.find();
    

    return res.status(200).json({
      success: true,
      data: {
        productCategories,
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching product categories',
      error: error.message,
    });
  }
};





const getProductSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required.",
      });
    }

    const subcategories = await ProductSubcategory.find({ category: categoryId }).select(
      "_id name"
    );

    return res.status(200).json({
      success: true,
      data: subcategories,
    });
  } catch (error) {
    console.error("Error fetching product subcategories:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product subcategories.",
    });
  }
};


const listSubcategories = async (req, res) => {
  try {
    const { categorySlug, categoryId, q } = req.query;

    let catId = categoryId;
    if (!catId && categorySlug) {
      const cat = await ProductCategory.findOne(
        { slug: String(categorySlug) },
        { _id: 1 }
      ).lean();
      if (!cat) return res.status(404).json({ error: 'Unknown category slug' });
      catId = String(cat._id);
    }

    const filter = {};
    if (catId) filter.category = catId;
    if (q) filter.name = { $regex: String(q), $options: 'i' };

    const subs = await ProductSubcategory
      .find(filter, { _id: 1, name: 1, slug: 1, category: 1 })
      .sort({ name: 1 })
      .lean();

    return res.json(subs);
  } catch (err) {
    console.error('listSubcategories error:', err);
    return res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
};





module.exports = { getAllCategoriesAdmin, getAllCategories, getProductCategories, getProductSubcategories,listSubcategories };
