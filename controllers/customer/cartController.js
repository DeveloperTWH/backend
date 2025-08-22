const Cart = require('../../models/Cart');
const CartItem = require('../../models/CartItem');
const Product = require('../../models/Product');
const ProductVariant = require('../../models/ProductVariant');

// Add Item to Cart
const addItemToCart = async (req, res) => {
    const { productId, variantId, quantity, variant } = req.body;
    const userId = req.user._id;

    try {
        const qty = Number(quantity) || 1;
        if (qty < 1) return res.status(400).json({ message: 'Quantity must be at least 1' });

        // Normalize requested size key (store as string for compatibility with getCart)
        const requestedSize = typeof variant === 'string' ? variant : variant?.size;
        if (!requestedSize) {
            return res.status(400).json({ message: 'Selected variant size/color not found' });
        }

        // Product validity
        const product = await Product.findById(productId);
        if (!product || !product.isPublished || product.isDeleted) {
            return res.status(400).json({ message: 'Product is not available (unpublished or deleted)' });
        }

        // Variant validity (+ belongs to product if you want to enforce)
        const variantData = await ProductVariant.findById(variantId);
        if (!variantData || !variantData.isPublished || variantData.isDeleted) {
            return res.status(400).json({ message: 'Product variant is not available (unpublished or deleted)' });
        }
        // Optional: ensure variant belongs to product
        // if (!variantData.productId.equals(product._id)) {
        //   return res.status(400).json({ message: 'Variant does not belong to product' });
        // }

        // Ensure the selected size exists
        const selectedSize = variantData.sizes.find(s => s.size === requestedSize);
        if (!selectedSize) {
            return res.status(400).json({ message: 'Selected variant size/color not found' });
        }

        // Stock / backorder checks on ADD
        if (qty > selectedSize.stock && !variantData.allowBackorder) {
            return res.status(422).json({ message: `Not enough stock. Only ${selectedSize.stock} left.` });
        }

        // Determine business via product (safer)
        const businessId = product.businessId;

        // Find or create user's cart
        let cart = await Cart.findOne({ userId: req.user._id });

        let reset = false;
        if (!cart) {
            cart = new Cart({ userId, businessId, items: [], totalItems: 0 });
            await cart.save();
        }

        // If existing cart is for different business, reset it
        if (cart.businessId && !cart.businessId.equals(businessId)) {
            await CartItem.deleteMany({ _id: { $in: cart.items } });
            cart.items = [];
            cart.totalItems = 0;
            cart.businessId = businessId;
            await cart.save();
            reset = true;
        }

        // Try to find an existing line (same product + variant + size)
        const existingLine = await CartItem.findOne({
            _id: { $in: cart.items },
            productId: product._id,
            variantId: variantData._id,
            variant: requestedSize, // stored as string
        });

        if (existingLine) {
            const newQty = existingLine.quantity + qty;

            if (newQty > selectedSize.stock && !variantData.allowBackorder) {
                return res.status(422).json({ message: `Not enough stock. Only ${selectedSize.stock} left.` });
            }

            existingLine.quantity = newQty;
            await existingLine.save();
        } else {
            // Create new line
            const cartItem = new CartItem({
                userId: req.user._id,
                productId: product._id,
                variantId: variantData._id,
                businessId,
                quantity: qty,
                variant: requestedSize, // store size string
            });
            await cartItem.save();

            cart.items.push(cartItem._id);
            await cart.save();
        }

        // Recompute totalItems as sum of quantities
        const quantities = await CartItem.find({ _id: { $in: cart.items } }).select('quantity');
        const totalQty = quantities.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
        cart.totalItems = totalQty;
        await cart.save();

        return res.status(201).json({
            message: 'Item added to cart',
            reset,
            // Optional: include businessName for frontend toast
            // businessName: product.businessName || undefined,
            cart,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error adding item to cart', error: err.message });
    }
};



// Get Cart
const getCart = async (req, res) => {
    try {
        // Fetch the cart for the user and populate CartItems with productId and variantId
        const cart = await Cart.findOne({ userId: req.user._id })
            .populate({
                path: 'items',
                populate: [
                    { path: 'productId', select: 'title coverImage isPublished isDeleted', match: { isPublished: true, isDeleted: false } },  // Populate product details (name, coverImage) and ensure it's published and not deleted
                    { path: 'variantId', select: 'color label sizes allowBackorder isPublished isDeleted images', match: { isPublished: true, isDeleted: false } },  // Populate variant details and ensure it's published and not deleted
                ],
            });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const invalidItems = []; // To track invalid items removed from the cart

        // Map the cart items to include only the necessary data for the frontend
        const cartItems = cart.items.map(cartItem => {
            const variant = cartItem.variantId;  // Already populated
            const product = cartItem.productId;  // Already populated

            // Check if the product and variant are valid (published and not deleted)
            if (!product || !variant) {
                // If the product or variant is invalid, remove the cart item
                invalidItems.push(cartItem._id);  // Track the invalid item
                return null; // Return null to exclude this item from the response
            }

            // Find the selected size's details
            const selectedSize = variant.sizes.find(size => size.size === cartItem.variant);


            if (!selectedSize) {
                // If size not found in the variant, remove the cart item
                invalidItems.push(cartItem._id);
                return null; // Exclude this item from the response
            }

            // Compute selectedSizePrice with discount validity
            const toNum = (v) =>
                v && typeof v === 'object' && v.$numberDecimal != null ? Number(v.$numberDecimal) : Number(v);

            const discountEnd = selectedSize?.discountEndDate ? new Date(selectedSize.discountEndDate) : null;
            // Use salePrice ONLY if it exists AND discountEndDate exists AND is in the future
            const useSale =
                !!selectedSize?.salePrice &&
                !!discountEnd &&
                discountEnd.getTime() > Date.now();

            const price = toNum(selectedSize.price);
            const salePrice = toNum(selectedSize.salePrice);
            const selectedSizePrice = useSale ? salePrice : price;


            // Return only necessary details (price is calculated on the frontend)
            return {
                title: product.title,
                productId: product._id,
                variantId: variant._id,
                businessId: cartItem.businessId,
                quantity: cartItem.quantity,
                size: selectedSize.size,
                color: variant.color,
                label: variant.label,
                stock: selectedSize.stock,
                sku: selectedSize.sku,
                salePrice,
                discountEndDate: selectedSize.discountEndDate,
                price,
                selectedSizePrice,  // Send salePrice/price for frontend calculation
                imageUrl: variant.images[0],  // Send image URL to display in cart
                allowBackorder: variant.allowBackorder,  // Send allowBackorder flag
            };
        });

        // Remove invalid items from the cart
        if (invalidItems.length > 0) {
            await CartItem.deleteMany({ _id: { $in: invalidItems } });  // Remove invalid items
        }

        return res.status(200).json({
            message: invalidItems.length > 0 ? 'Some items were removed from the cart as they were unpublished or deleted.' : 'Cart retrieved successfully',
            cart: {
                ...cart.toObject(),
                items: cartItems.filter(item => item !== null),  // Filter out the null values (removed items)
            },
        });
    } catch (err) {
        return res.status(500).json({ message: 'Error fetching cart', error: err.message });
    }
};


// Update Cart Item
const updateCartItem = async (req, res) => {
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    try {
        const qty = Number(quantity);
        if (!Number.isFinite(qty) || qty < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        const cartItem = await CartItem.findById(cartItemId);
        if (!cartItem) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        // Ensure the cart item belongs to the current user
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart || !cart.items.some(id => id.equals(cartItem._id))) {
            return res.status(400).json({ message: 'Cart item does not belong to the user' });
        }

        // Product/Variant validity
        const product = await Product.findById(cartItem.productId);
        if (!product || !product.isPublished || product.isDeleted) {
            return res.status(400).json({ message: 'Product is not available (unpublished or deleted)' });
        }

        const variantData = await ProductVariant.findById(cartItem.variantId);
        if (!variantData || !variantData.isPublished || variantData.isDeleted) {
            return res.status(400).json({ message: 'Product variant is not available (unpublished or deleted)' });
        }

        // Size lookup (cartItem.variant is the size string)
        const selectedSize = variantData.sizes.find(s => s.size === cartItem.variant);
        if (!selectedSize) {
            return res.status(400).json({ message: 'Variant size/color not found' });
        }

        // Stock / backorder (variant-level allowBackorder)
        if (qty > selectedSize.stock && !variantData.allowBackorder) {
            return res.status(422).json({ message: `Not enough stock for the selected variant. Only ${selectedSize.stock} left.` });
        }

        // Update quantity
        cartItem.quantity = qty;
        await cartItem.save();

        // Recompute totalItems as sum of quantities
        const quantities = await CartItem.find({ _id: { $in: cart.items } }).select('quantity');
        const totalQty = quantities.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
        cart.totalItems = totalQty;
        await cart.save();

        return res.status(200).json({ message: 'Cart item updated successfully', cart });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error updating cart item', error: err.message });
    }
};



// Remove Item from Cart
const removeItemFromCart = async (req, res) => {
    const { cartItemId } = req.params;
    const userId = req.user._id; // Assuming the user is authenticated and `req.user` contains user data

    try {
        // Find the cart item by ID
        const cartItem = await CartItem.findById(cartItemId);

        if (!cartItem) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        // Ensure the cart item belongs to the current user
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart || !cart.items.includes(cartItemId)) {
            return res.status(400).json({ message: 'Cart item does not belong to the user' });
        }

        // Remove the cart item from the cart's items
        cart.items.pull(cartItemId);
        await cart.save();

        // Delete the CartItem document
        await cartItem.remove();

        // Update the total number of items in the cart
        cart.totalItems = cart.items.length;
        await cart.save();

        return res.status(200).json({ message: 'Item removed from cart', cart });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error removing item from cart', error: err.message });
    }
};




// UPDATE by composite key
const updateCartItemByComposite = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;
        // accept either { size } or { variant: { size } }
        const size = req.body.size || req.body?.variant?.size;
        const qty = Number(quantity);

        if (!productId || !variantId || !size) {
            return res.status(400).json({ message: 'productId, variantId and size are required' });
        }
        if (!Number.isFinite(qty) || qty < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        // Load cart
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        // Find the line item in this cart
        const line = await CartItem.findOne({
            _id: { $in: cart.items },
            productId,
            variantId,
            variant: size, // we store size string in "variant" field
        });
        if (!line) return res.status(404).json({ message: 'Cart item not found' });

        // Validate product + variant
        const product = await Product.findById(line.productId);
        if (!product || !product.isPublished || product.isDeleted) {
            return res.status(400).json({ message: 'Product is not available (unpublished or deleted)' });
        }
        const variantData = await ProductVariant.findById(line.variantId);
        if (!variantData || !variantData.isPublished || variantData.isDeleted) {
            return res.status(400).json({ message: 'Product variant is not available (unpublished or deleted)' });
        }

        // Size + stock/backorder
        const selectedSize = variantData.sizes.find(s => s.size === size);
        if (!selectedSize) return res.status(400).json({ message: 'Variant size/color not found' });
        if (qty > selectedSize.stock && !variantData.allowBackorder) {
            return res.status(422).json({ message: `Not enough stock. Only ${selectedSize.stock} left.` });
        }

        // Update quantity
        line.quantity = qty;
        await line.save();

        // Recompute totalItems = sum of quantities
        const quantities = await CartItem.find({ _id: { $in: cart.items } }).select('quantity');
        cart.totalItems = quantities.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
        await cart.save();

        return res.status(200).json({ message: 'Cart item updated successfully', cart });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error updating cart item', error: err.message });
    }
};


// REMOVE by composite key
const removeItemByComposite = async (req, res) => {
    try {
        const { productId, variantId } = req.body;
        const size = req.body.size || req.body?.variant?.size;

        if (!productId || !variantId || !size) {
            return res.status(400).json({ message: 'productId, variantId and size are required' });
        }

        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const line = await CartItem.findOne({
            _id: { $in: cart.items },
            productId,
            variantId,
            variant: size,
        });
        if (!line) return res.status(404).json({ message: 'Cart item not found' });

        // Remove from cart + delete line
        cart.items.pull(line._id);
        await cart.save();
        await line.deleteOne();

        // Recompute totalItems
        const quantities = await CartItem.find({ _id: { $in: cart.items } }).select('quantity');
        cart.totalItems = quantities.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
        await cart.save();

        return res.status(200).json({ message: 'Item removed from cart', cart });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error removing item from cart', error: err.message });
    }
};





// Utility: collect IDs from query (?ids=a,b,c) or body {ids:[]}

function parseIds(req) {
    const ids = [];
    if (req.query.ids) ids.push(...String(req.query.ids).split(","));
    if (Array.isArray(req.body?.ids)) ids.push(...req.body.ids);
    return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function parseFilters(req) {
    // Accepts duplicates; we'll group by variantId
    const arr = Array.isArray(req.body?.filters) ? req.body.filters : [];
    const map = new Map(); // variantId -> Set(sizes)
    for (const f of arr) {
        if (!f?.variantId || !f?.size) continue;
        const vid = String(f.variantId);
        const size = String(f.size).toUpperCase();
        if (!map.has(vid)) map.set(vid, new Set());
        map.get(vid).add(size);
    }
    return map; // Map<string, Set<string>>
}

async function getVariantsMini(req, res, next) {
    try {
        const ids = parseIds(req);
        if (!ids.length) return res.json([]);

        const wantedByVariant = parseFilters(req); // Map<variantId, Set<sizes>>

        // IMPORTANT: no .lean() so toJSON() flattens Decimal128
        const docs = await ProductVariant.find({
            _id: { $in: ids },
            isDeleted: false,
            isPublished: true,
        })
            .select("_id productId label color allowBackorder images sizes")
            .exec();

        const variants = docs.map((d) => d.toJSON());

        const out = variants.map((v) => {
            const wanted = wantedByVariant.get(String(v._id)); // Set or undefined
            const sizes = Array.isArray(v.sizes) ? v.sizes : [];
            const filtered = wanted && wanted.size
                ? sizes.filter((s) => wanted.has(String(s.size).toUpperCase()))
                : sizes; // if no filter supplied, return all (backward compatible)
            return {
                _id: v._id,
                productId: v.productId,
                label: v.label,
                color: v.color,
                allowBackorder: v.allowBackorder,
                images: v.images,
                sizes: filtered,
            };
        });

        res.json(out);
    } catch (err) {
        next(err);
    }
}

/**
 * GET/POST /api/public/products/mini
 */
const getProductsMini = async (req, res, next) => {
    try {
        const ids = parseIds(req);
        if (!ids.length) return res.json([]);

        const products = await Product.find({
            _id: { $in: ids },
            isDeleted: false,
            isPublished: true,
        })
            .select("_id title coverImage businessId slug")
            .lean();

        res.json(products);
    } catch (err) {
        next(err);
    }
}

/**
 * GET/POST /api/public/variants/mini
 * Expects: ids[]=variantId, optional sizes filter: { variantId: "xxx", size: "SM" }
 */
// const getVariantsMini = async (req, res, next) => {
//     try {
//         const ids = parseIds(req);
//         if (!ids.length) return res.json([]);

//         const filters = parseFilters(req); // optional size filters per variant

//         // IMPORTANT: no .lean() so toJSON transform converts Decimal128
//         const docs = await ProductVariant.find({
//             _id: { $in: ids },
//             isDeleted: false,
//             isPublished: true,
//         })
//             .select("_id productId label color allowBackorder images sizes")
//             .exec();

//         // toJSON() applies your Decimal128 -> number conversion
//         const variants = docs.map((d) => d.toJSON());

//         const out = variants.map((v) => {
//             const f = filters.find((x) => String(x.variantId) === String(v._id));
//             const wantedSize = f?.size ? String(f.size).toUpperCase() : null;

//             return {
//                 _id: v._id,
//                 productId: v.productId,
//                 label: v.label,
//                 color: v.color,
//                 allowBackorder: v.allowBackorder,
//                 images: v.images,
//                 sizes: wantedSize
//                     ? (v.sizes || []).filter((s) => s.size === wantedSize)
//                     : v.sizes || [],
//             };
//         });

//         res.json(out);
//     } catch (err) {
//         next(err);
//     }
// }




module.exports = {
    getCart,
    addItemToCart,
    updateCartItem,
    removeItemFromCart,
    updateCartItemByComposite,
    removeItemByComposite,
    getProductsMini,
    getVariantsMini
};
