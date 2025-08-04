<!-- INFO: add minrity type in product variant also or we will have to fliter minority type after we populate the product -->

<!-- TODO: add img in all category page -->



sizes: [
    {
      name: { type: String, required: true, trim: true },  // e.g., 'size', 'fabric', 'material'
      value: { type: String, required: true, trim: true }, // e.g., 'XL', 'Cotton', 'Aluminum'
      stock: { type: Number, required: true, min: 0 },
      price: { type: mongoose.Schema.Types.Decimal128, required: true, min: 0 },
      salePrice: { type: mongoose.Schema.Types.Decimal128, min: 0 },
      discountEndDate: { type: Date },
      sku: { type: String, required: true, trim: true, unique: true }
    }
  ],