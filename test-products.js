// Add this to your publicListing.js controller for testing

exports.testProductsByFilters = async (req, res) => {
  try {
    const { categorySlug, subcategorySlug } = req.query;
    
    const filters = { isDeleted: false, isPublished: true };

    if (categorySlug) {
      const category = await ProductCategory.findOne({ slug: categorySlug });
      if (category) filters.categoryId = category._id;
      else return res.json({ success: true, total: 0, data: [], message: 'Category not found' });
    }

    if (subcategorySlug) {
      const subcategory = await ProductSubcategory.findOne({ slug: subcategorySlug });
      if (subcategory) filters.subcategoryId = subcategory._id;
      else return res.json({ success: true, total: 0, data: [], message: 'Subcategory not found' });
    }

    // Get products without variants to test basic filtering
    const products = await Product.find(filters)
      .select('title description coverImage slug categoryId subcategoryId')
      .lean();

    res.json({
      success: true,
      total: products.length,
      data: products,
      filters: filters
    });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};