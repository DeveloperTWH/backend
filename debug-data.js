const mongoose = require('mongoose');
require('./config/Db');

const Product = require('./models/Product');
const ProductCategory = require('./models/ProductCategory');
const ProductSubcategory = require('./models/ProductSubcategory');

async function debugData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/mbh");
    
    console.log('=== CATEGORIES ===');
    const categories = await ProductCategory.find({}).select('name slug _id');
    console.log(categories);
    
    console.log('\n=== SUBCATEGORIES ===');
    const subcategories = await ProductSubcategory.find({}).select('name slug _id categoryId');
    console.log(subcategories);
    
    console.log('\n=== PRODUCTS ===');
    const products = await Product.find({}).select('title categoryId subcategoryId isPublished isDeleted');
    console.log(products);
    
    console.log('\n=== SPECIFIC PRODUCT ===');
    const specificProduct = await Product.findById('6983122e4935dfda678dde78');
    console.log(specificProduct);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugData();