// services/productListingService.js
const mongoose = require('mongoose');
const Product = require('../models/Product');

/** Safely coerce to ObjectId (null if invalid) */
const toOid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

/**
 * Fetch products eligible for ranking.
 * - Product: published & not deleted
 * - Variant: published & not deleted & (allowBackorder || totalStock > 0)
 * - Business: active
 * - Subscription: active
 *
 * @param {Object} params
 * @param {string} [params.categoryId]
 * @param {string} [params.subcategoryId]
 * @param {number} [params.fetchLimit=240]  // upper bound on docs we scan (keeps work predictable)
 */
async function fetchEligibleProducts({ categoryId, subcategoryId, fetchLimit = 240 }) {
  const cat = categoryId ? toOid(categoryId) : null;
  const sub = subcategoryId ? toOid(subcategoryId) : null;

  // If caller passed an invalid ObjectId, return empty (avoid full scans).
  if ((categoryId && !cat) || (subcategoryId && !sub)) return [];

  // predictable, sane bounds
  const hardLimit = Math.max(50, Number(fetchLimit) || 240);     // cap on results after pipeline
  const scanLimit = Math.min(Math.max(50, hardLimit), 1000);     // cap BEFORE lookups (protects cluster)

  const match = {
    isPublished: true,
    isDeleted: false,
    ...(cat ? { categoryId: cat } : {}),
    ...(sub ? { subcategoryId: sub } : {}),
  };

  const pipeline = [
    { $match: match },

    // Keep working set “recent” and *bound it before heavy lookups*
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: scanLimit },

    // Variants: published & not deleted, then eligibility by stock/backorder
    {
      $lookup: {
        from: 'productvariants',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$productId', '$$pid'] }, isPublished: true, isDeleted: false } },
          {
            $addFields: {
              totalStock: {
                $sum: { $map: { input: '$sizes', as: 's', in: { $ifNull: ['$$s.stock', 0] } } }
              }
            }
          },
          { $addFields: { eligibleVariant: { $or: ['$allowBackorder', { $gt: ['$totalStock', 0] }] } } },
          { $match: { eligibleVariant: true } },
          { $project: { _id: 1, images: 1, averageRating: 1, totalReviews: 1 } }
        ],
        as: 'eligibleVariants'
      }
    },

    { $addFields: { eligibleVariantCount: { $size: '$eligibleVariants' } } },
    { $match: { eligibleVariantCount: { $gt: 0 } } },

    // Business must be active
    {
      $lookup: {
        from: 'businesses',
        localField: 'businessId',
        foreignField: '_id',
        as: 'biz',
        pipeline: [{ $project: { businessName: 1, isActive: 1, subscriptionId: 1 } }]
      }
    },
    { $unwind: '$biz' },
    { $match: { 'biz.isActive': true } },

    // Subscription must be active
    {
      $lookup: {
        from: 'subscriptions',
        localField: 'biz.subscriptionId',
        foreignField: '_id',
        as: 'sub',
        pipeline: [{ $project: { status: 1, subscriptionPlanId: 1 } }]
      }
    },
    { $unwind: '$sub' },
    { $match: { 'sub.status': 'active' } },

    // Final projection (only what ranking needs)
    {
      $project: {
        _id: 1,
        title: 1,
        slug: 1,
        description: 1,
        coverImage: 1,
        businessId: 1,
        createdAt: 1,
        updatedAt: 1,
        categoryId: 1,
        subcategoryId: 1,
        variantRatingAvg: { $avg: '$eligibleVariants.averageRating' },
        variantRatingCount: { $sum: '$eligibleVariants.totalReviews' },
        businessName: '$biz.businessName',
        planId: '$sub.subscriptionPlanId'
      }
    },

    // Hard cap on what flows to app layer (cheap now, but a nice guard)
    { $limit: hardLimit }
  ];

  // Use options argument for wide compatibility with Mongoose
  return Product.aggregate(pipeline, { allowDiskUse: true, maxTimeMS: 4000 });
}

module.exports = { fetchEligibleProducts };
