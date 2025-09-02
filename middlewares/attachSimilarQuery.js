// middleware/attachSimilarQuery.js
'use strict';

const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * Attach "similar products" context to res.locals without mutating req.query.
 * - Validates :id
 * - Loads the seed product's taxonomy (subcategory preferred, else category)
 * - Sets excludeProductId, page, pageSize
 * Controller should prefer res.locals.similar over req.query.
 */
module.exports = async function attachSimilarQuery(req, res, next) {
  try {
    const { id } = req.params || {};
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    // Fetch only taxonomy fields (lean & minimal projection)
    const seed = await Product.findById(id, { categoryId: 1, subcategoryId: 1, businessId: 1 }).lean();
    if (!seed) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const strategy = String((req.query && req.query.strategy) || 'subcategory').toLowerCase();

    const sim = {
      excludeProductId: String(id),
      page: String((req.query && req.query.page) || '1'),
      pageSize: String((req.query && req.query.pageSize) || '8'),
      seedBusinessId: seed.businessId ? String(seed.businessId) : null,
      vendorFirst: (req.query && (req.query.vendorFirst === '0' ? false : true)) ?? true
    };

    // Prefer subcategory when available, else fall back to category
    if (strategy === 'subcategory' && seed.subcategoryId) {
      sim.subcategoryId = String(seed.subcategoryId);
    } else if (seed.categoryId) {
      sim.categoryId = String(seed.categoryId);
    }

    // Stash everything on locals; controller will read from here
    res.locals.similar = sim;

    // Optional debug log (enable by setting LISTING_DEBUG=1)
    if (process.env.LISTING_DEBUG === '1') {
      // eslint-disable-next-line no-console
      console.log('[attachSimilarQuery]', { params: req.params, sim });
    }

    return next();
  } catch (err) {
    return next(err);
  }
};
