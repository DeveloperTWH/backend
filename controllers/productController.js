const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');
const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { validationResult } = require('express-validator');

exports.createProductWithVariants = async (req, res) => {
    try {
        // 1. Basic validation
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const userId = req.user._id;
        const {
            title, description, brand, categoryId, subcategoryId, businessId,
            variantOptions, specifications, coverImage, variants // array of variant objects
        } = req.body;

        // 2. Check if variants are provided and valid
        if (!Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({ error: 'At least one product variant is required.' });
        }

        if (typeof variantOptions !== 'object' || Array.isArray(variantOptions)) {
            return res.status(400).json({ error: 'Invalid variantOptions format.' });
        }

        // 3. Check business ownership and approval
        const business = await Business.findOne({ _id: businessId, owner: userId });
        if (!business) return res.status(403).json({ error: 'You do not own this business.' });

        if (!business.isApproved)
            return res.status(400).json({ error: 'Business is not approved yet.' });

        if (business.listingType !== 'product')
            return res.status(400).json({ error: 'This business is not allowed to list products.' });

        // 4. Subscription & limit check
        const subscription = await Subscription.findOne({
            _id: business.subscriptionId,
            businessId,
            status: 'active',
            paymentStatus: 'COMPLETED',
            endDate: { $gte: new Date() },
        });

        if (!subscription)
            return res.status(403).json({ error: 'Valid subscription not found.' });

        const subscriptionPlan = await SubscriptionPlan.findById(subscription.subscriptionPlanId);
        const productLimit = subscriptionPlan?.maxProducts || 0;

        const productCount = await Product.countDocuments({ businessId });
        if (productCount >= productLimit)
            return res.status(403).json({ error: 'Product listing limit reached for your subscription.' });

        // 5. Create Product
        const product = new Product({
            title,
            description,
            brand,
            categoryId,
            subcategoryId,
            ownerId: userId,
            businessId,
            variantOptions,
            specifications,
            coverImage,
        });

        await product.save();

        // 6. Create Product Variants
        const variantDocs = variants.map((variant) => ({
            ...variant,
            productId: product._id,
            businessId: business._id,
        }));

        let savedVariants;
        try {
            savedVariants = await ProductVariant.insertMany(variantDocs);
        } catch (variantErr) {
            console.error('Variant creation error:', variantErr);
            await Product.findByIdAndDelete(product._id); // cleanup orphaned product
            return res.status(400).json({ error: 'Error creating product variants.', details: variantErr.message });
        }

        return res.status(201).json({
            message: 'Product and variants created successfully.',
            product,
            variants: savedVariants
        });

    } catch (err) {
        console.error('Error in product creation:', err);
        return res.status(500).json({ error: 'Server error while creating product.' });
    }
};
