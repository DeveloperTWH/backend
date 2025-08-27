// services/productListingDebugService.js
const mongoose = require('mongoose');
const Product = require('../models/Product');

/** null if invalid ObjectId */
const toOid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

/**
 * Build detailed "why removed" rows (for debug=1)
 * Bound the scan & use slim lookups to keep it safe in prod.
 *
 * @param {Object} params
 * @param {string} [params.categoryId]
 * @param {string} [params.subcategoryId]
 * @param {number} [params.scanLimit=2000] // max products to inspect before lookups
 * @param {number} [params.resultLimit=1000] // cap final rows returned
 */
async function fetchRemovalLogs({ categoryId, subcategoryId, scanLimit = 2000, resultLimit = 1000 }) {
  const cat = categoryId ? toOid(categoryId) : null;
  const sub = subcategoryId ? toOid(subcategoryId) : null;

  // If caller passed an invalid ObjectId, return empty to avoid full scans
  if ((categoryId && !cat) || (subcategoryId && !sub)) return [];

  const match = {
    ...(cat ? { categoryId: cat } : {}),
    ...(sub ? { subcategoryId: sub } : {}),
  };

  const pipeline = [
    // Filter by category/subcategory only (we want to see unpublished/deleted reasons)
    { $match: match },

    // Keep debug work bounded & recent
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: Math.max(100, Math.min(Number(scanLimit) || 2000, 5000)) },

    // Pull ALL variants, but only the fields we need for reasoning
    {
      $lookup: {
        from: 'productvariants',
        let: { pid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$productId', '$$pid'] } } },
          { $project: { isPublished: 1, isDeleted: 1, allowBackorder: 1, sizes: 1 } }
        ],
        as: 'allVariants'
      }
    },

    // Per-variant issues
    {
      $addFields: {
        variantIssues: {
          $map: {
            input: '$allVariants',
            as: 'v',
            in: {
              variantId: '$$v._id',
              reasons: {
                $let: {
                  vars: {
                    totalStock: {
                      $sum: {
                        $map: { input: '$$v.sizes', as: 's', in: { $ifNull: ['$$s.stock', 0] } }
                      }
                    }
                  },
                  in: {
                    $concatArrays: [
                      { $cond: [{ $ne: ['$$v.isPublished', true] }, ['variant_unpublished'], []] },
                      { $cond: ['$$v.isDeleted', ['variant_deleted'], []] },
                      {
                        $cond: [
                          { $and: [{ $lte: ['$$totalStock', 0] }, { $ne: ['$$v.allowBackorder', true] }] },
                          ['variant_no_inventory_and_no_backorder'],
                          []
                        ]
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },

    // Count variants with NO issues (eligible)
    {
      $addFields: {
        eligibleVariantCount: {
          $size: {
            $filter: {
              input: '$variantIssues',
              as: 'vi',
              cond: { $eq: [{ $size: '$$vi.reasons' }, 0] }
            }
          }
        }
      }
    },

    // Join Business (slim projection)
    {
      $lookup: {
        from: 'businesses',
        localField: 'businessId',
        foreignField: '_id',
        as: 'biz',
        pipeline: [{ $project: { businessName: 1, isActive: 1, subscriptionId: 1 } }]
      }
    },
    { $unwind: { path: '$biz', preserveNullAndEmptyArrays: true } },

    // Join Subscription (slim projection)
    {
      $lookup: {
        from: 'subscriptions',
        localField: 'biz.subscriptionId',
        foreignField: '_id',
        as: 'sub',
        pipeline: [{ $project: { status: 1, subscriptionPlanId: 1 } }]
      }
    },
    { $unwind: { path: '$sub', preserveNullAndEmptyArrays: true } },

    // Compose reasons (product/business/subscription)
    {
      $addFields: {
        productReasons: {
          $concatArrays: [
            { $cond: [{ $ne: ['$isPublished', true] }, ['product_unpublished'], []] },
            { $cond: ['$isDeleted', ['product_deleted'], []] },
            { $cond: [{ $lte: ['$eligibleVariantCount', 0] }, ['no_eligible_variants'], []] }
          ]
        },
        businessReasons: {
          $cond: [
            { $or: [{ $not: ['$biz'] }, { $ne: ['$biz.isActive', true] }] },
            ['business_inactive_or_missing'],
            []
          ]
        },
        subscriptionReasons: {
          $cond: [
            { $or: [{ $not: ['$sub'] }, { $ne: ['$sub.status', 'active'] }] },
            ['no_active_subscription'],
            []
          ]
        }
      }
    },

    { $addFields: { removalReasons: { $concatArrays: ['$productReasons', '$businessReasons', '$subscriptionReasons'] } } },

    // Keep only rows that actually have a removal reason
    { $match: { removalReasons: { $exists: true, $ne: [] } } },

    // Keep only problematic variants in the output
    {
      $addFields: {
        variantIssues: {
          $filter: {
            input: '$variantIssues',
            as: 'vi',
            cond: { $gt: [{ $size: '$$vi.reasons' }, 0] }
          }
        }
      }
    },

    // Final shape
    {
      $project: {
        _id: 0,
        productId: '$_id',
        productTitle: '$title',
        businessId: 1,
        businessName: '$biz.businessName',
        planId: '$sub.subscriptionPlanId',
        removalReasons: 1,
        variantIssues: 1
      }
    },

    // Cap final output
    { $limit: Math.max(100, Math.min(Number(resultLimit) || 1000, 5000)) }
  ];

  // Version-safe aggregate options
  return Product.aggregate(pipeline, { allowDiskUse: true, maxTimeMS: 4000 });
}

module.exports = { fetchRemovalLogs };
