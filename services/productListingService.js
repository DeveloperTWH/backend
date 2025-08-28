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
 * Adds `firstEligible` to each item:
 *   {
 *     variantId, label, color, images, videos,
 *     averageRating, totalReviews, allowBackorder, totalStock,
 *     size, price, salePrice|null, discountEndDate|null,
 *     onSale: boolean, effectivePrice
 *   }
 *
 * @param {Object} params
 * @param {string} [params.categoryId]
 * @param {string} [params.subcategoryId]
 * @param {number} [params.fetchLimit=240]
 */
async function fetchEligibleProducts({ categoryId, subcategoryId, excludeProductId, fetchLimit = 240 }) {
  const cat = categoryId ? toOid(categoryId) : null;
  const sub = subcategoryId ? toOid(subcategoryId) : null;
  const exclude = excludeProductId ? toOid(excludeProductId) : null;

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
    ...(exclude ? { _id: { $ne: exclude } } : {}),
  };

  const now = new Date(); // used in discountEndDate comparison

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

          // Sum stock across sizes (sizes[].stock assumed numeric; null → 0)
          {
            $addFields: {
              totalStock: {
                $sum: { $map: { input: '$sizes', as: 's', in: { $ifNull: ['$$s.stock', 0] } } }
              }
            }
          },

          // A variant is eligible if allowBackorder OR has any stock
          { $addFields: { eligibleVariant: { $or: ['$allowBackorder', { $gt: ['$totalStock', 0] }] } } },
          { $match: { eligibleVariant: true } },

          // Compute eligible sizes: stock > 0 OR variant allows backorder
          {
            $addFields: {
              eligibleSizes: {
                $filter: {
                  input: '$sizes',
                  as: 's',
                  cond: { $or: [{ $gt: ['$$s.stock', 0] }, '$allowBackorder'] }
                }
              }
            }
          },

          // Take the first eligible size on this variant (natural order)
          { $addFields: { firstEligibleSize: { $arrayElemAt: ['$eligibleSizes', 0] } } },

          // Keep minimal fields needed upstream + for firstEligible
          {
            $project: {
              _id: 1,
              label: 1,
              color: 1,
              images: 1,
              videos: 1,
              averageRating: 1,
              totalReviews: 1,
              allowBackorder: 1,
              totalStock: 1,
              firstEligibleSize: 1
              // size subdoc fields expected:
              //   size, price(Decimal128|Number), salePrice(Decimal128|Number), discountEndDate(Date|ISO), stock
            }
          }
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

    // Final projection (only what ranking & UI need)
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

        // Variant rating rollups (pool-level)
        variantRatingAvg: { $avg: '$eligibleVariants.averageRating' },
        variantRatingCount: { $sum: '$eligibleVariants.totalReviews' },

        businessName: '$biz.businessName',
        planId: '$sub.subscriptionPlanId',

        // First eligible variant/size across variants, with proper sale logic
        firstEligible: {
          $let: {
            vars: {
              candidates: {
                $filter: {
                  input: '$eligibleVariants',
                  as: 'ev',
                  cond: { $ne: ['$$ev.firstEligibleSize', null] }
                }
              }
            },
            in: {
              $let: {
                vars: {
                  fev: { $arrayElemAt: ['$$candidates', 0] }
                },
                in: {
                  $cond: [
                    { $eq: ['$$fev', null] },
                    null,
                    {
                      $let: {
                        vars: {
                          rawDiscEnd: '$$fev.firstEligibleSize.discountEndDate',
                          rawSale: '$$fev.firstEligibleSize.salePrice',
                          rawPrice: '$$fev.firstEligibleSize.price'
                        },
                        in: {
                          $let: {
                            vars: {
                              discEnd: {
                                $cond: [
                                  {
                                    $and: [
                                      { $ifNull: ['$$rawDiscEnd', false] },
                                      { $ne: ['$$rawDiscEnd', ''] }
                                    ]
                                  },
                                  { $toDate: '$$rawDiscEnd' },
                                  null
                                ]
                              },
                              basePriceNum: { $toDouble: { $ifNull: ['$$rawPrice', 0] } },
                              salePriceNumTemp: {
                                $cond: [
                                  { $ne: ['$$rawSale', null] },
                                  { $toDouble: '$$rawSale' },
                                  null
                                ]
                              }
                            },
                            in: {
                              $let: {
                                vars: {
                                  saleValid: {
                                    $and: [
                                      { $ifNull: ['$$salePriceNumTemp', false] },
                                      { $gt: ['$$discEnd', now] }
                                    ]
                                  }
                                },
                                in: {
                                  variantId: '$$fev._id',
                                  label: '$$fev.label',
                                  color: '$$fev.color',
                                  images: '$$fev.images',
                                  videos: '$$fev.videos',
                                  averageRating: '$$fev.averageRating',
                                  totalReviews: '$$fev.totalReviews',
                                  allowBackorder: '$$fev.allowBackorder',
                                  totalStock: '$$fev.totalStock',
                                  size: '$$fev.firstEligibleSize.size',

                                  // Always return both base & sale fields + end date
                                  price: '$$basePriceNum',
                                  salePrice: { $cond: ['$$saleValid', '$$salePriceNumTemp', null] },
                                  discountEndDate: '$$discEnd',

                                  // Convenience
                                  onSale: '$$saleValid',
                                  effectivePrice: {
                                    $cond: ['$$saleValid', '$$salePriceNumTemp', '$$basePriceNum']
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },

    // Hard cap on what flows to app layer (cheap now, but a nice guard)
    { $limit: hardLimit }
  ];

  // Use options argument for wide compatibility with Mongoose
  return Product.aggregate(pipeline, { allowDiskUse: true, maxTimeMS: 4000 });
}

module.exports = { fetchEligibleProducts };
