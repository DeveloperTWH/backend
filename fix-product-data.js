const mongoose = require('mongoose');
require('./config/Db');

const Product = require('./models/Product');
const ProductVariant = require('./models/ProductVariant');

async function fixProductData() {
  try {
    // Find the product
    const product = await Product.findById('6983122e4935dfda678dde78');
    if (!product) {
      console.log('Product not found');
      return;
    }

    console.log('Current product variants:', product.variants);

    // Create proper ProductVariant documents
    const variant1 = new ProductVariant({
      productId: product._id,
      businessId: product.businessId,
      ownerId: product.ownerId,
      color: 'black',
      label: 'Black Cotton T-Shirt',
      sizes: [
        { size: 'S', sku: 'MCT-BLK-S', stock: 50, price: 29.99, salePrice: 24.99 },
        { size: 'M', sku: 'MCT-BLK-M', stock: 75, price: 29.99, salePrice: 24.99 },
        { size: 'L', sku: 'MCT-BLK-L', stock: 60, price: 29.99, salePrice: 24.99 },
        { size: 'XL', sku: 'MCT-BLK-XL', stock: 40, price: 29.99, salePrice: 24.99 }
      ],
      isPublished: true,
      isDeleted: false,
      weightInKg: 0.2,
      images: [
        'https://example.com/images/tshirt-black-1.jpg',
        'https://example.com/images/tshirt-black-2.jpg'
      ],
      allowBackorder: false
    });

    const variant2 = new ProductVariant({
      productId: product._id,
      businessId: product.businessId,
      ownerId: product.ownerId,
      color: 'white',
      label: 'White Cotton T-Shirt',
      sizes: [
        { size: 'S', sku: 'MCT-WHT-S', stock: 45, price: 29.99, salePrice: 24.99 },
        { size: 'M', sku: 'MCT-WHT-M', stock: 80, price: 29.99, salePrice: 24.99 },
        { size: 'L', sku: 'MCT-WHT-L', stock: 55, price: 29.99, salePrice: 24.99 },
        { size: 'XL', sku: 'MCT-WHT-XL', stock: 35, price: 29.99, salePrice: 24.99 }
      ],
      isPublished: true,
      isDeleted: false,
      weightInKg: 0.2,
      images: [
        'https://example.com/images/tshirt-white-1.jpg',
        'https://example.com/images/tshirt-white-2.jpg'
      ],
      allowBackorder: false
    });

    // Save variants
    await variant1.save();
    await variant2.save();

    console.log('Variants created:', variant1._id, variant2._id);

    // Update product with variant references
    product.variants = [variant1._id, variant2._id];
    await product.save();

    console.log('Product updated with variant references');
    console.log('Fixed product:', await Product.findById(product._id).populate('variants'));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixProductData();