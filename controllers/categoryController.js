const FoodCategory = require('../models/FoodCategory');
const ProductCategory = require('../models/ProductCategory');
const ServiceCategory = require('../models/ServiceCategory');

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



const ProductSubcategory = require("../models/ProductSubcategory");

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





module.exports = { getAllCategories, getProductCategories, getProductSubcategories };
