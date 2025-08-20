const Cart = require('../../models/Cart');
const CartItem = require('../../models/CartItem');
const Product = require('../../models/Product');
const ProductVariant = require('../../models/ProductVariant');

// Add Item to Cart
const addItemToCart = async (req, res) => {
    const { productId, variantId, quantity, variant } = req.body;  // Expecting size/color as variant
    const userId = req.user._id; // Assuming the user is authenticated and `req.user` contains user data

    try {
        // Fetch the product details and check if it's published and not deleted
        const product = await Product.findById(productId);
        if (!product || !product.isPublished || product.isDeleted) {
            return res.status(400).json({ message: 'Product is not available (unpublished or deleted)' });
        }

        // Fetch the variant details and check if it's published and not deleted
        const variantData = await ProductVariant.findById(variantId);
        if (!variantData || !variantData.isPublished || variantData.isDeleted) {
            return res.status(400).json({ message: 'Product variant is not available (unpublished or deleted)' });
        }

        // Ensure the selected size exists in the variant
        const selectedVariant = variantData.sizes.find(s => s.size === variant); // Finding the selected variant (size/color)
        if (!selectedVariant) {
            return res.status(400).json({ message: 'Selected variant size/color not found' });
        }

        const businessId = variantData.businessId;  // Get the businessId of the variant

        // Find the user's cart for the given business
        let cart = await Cart.findOne({ userId: req.user._id });

        // If no cart exists, create a new one for the user and business
        if (!cart) {
            cart = new Cart({ userId, businessId, items: [], totalItems: 0 });
            await cart.save();
        }

        // If the cart exists but belongs to a different business, reset it
        if (cart.businessId.toString() !== businessId.toString()) {
            // First, delete all the CartItem documents from the old cart
            await CartItem.deleteMany({ _id: { $in: cart.items } });  // Delete CartItems related to the old business

            // Clear existing cart items, reset totalItems, and update businessId
            cart.items = [];
            cart.totalItems = 0;
            cart.businessId = businessId;  // Update to the new businessId
            await cart.save();
        }

        // Create the CartItem for the selected variant
        const cartItem = new CartItem({
            productId: product._id,
            variantId: variantData._id,
            businessId,
            quantity,
            variant,  // Store the selected variant (e.g., size/color)
        });

        await cartItem.save();

        // Add the new cart item to the cart
        cart.items.push(cartItem._id);
        await cart.save();

        // Update the total number of items in the cart
        cart.totalItems = cart.items.length;
        await cart.save();

        return res.status(201).json({ message: 'Item added to cart', cart });
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
                    { path: 'variantId', select: 'color label sizes allowBackorder isPublished isDeleted', match: { isPublished: true, isDeleted: false } },  // Populate variant details and ensure it's published and not deleted
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

            // Return only necessary details (price is calculated on the frontend)
            return {
                productId: product._id,
                variantId: variant._id,
                businessId: cartItem.businessId,
                quantity: cartItem.quantity,
                size: selectedSize.size,
                color: variant.color,
                label: variant.label,
                stock: selectedSize.stock,
                sku: selectedSize.sku,
                selectedSizePrice: selectedSize.salePrice || selectedSize.price,  // Send salePrice/price for frontend calculation
                imageUrl: product.coverImage,  // Send image URL to display in cart
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
    const { quantity } = req.body;  // Updated quantity
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

        // Fetch the product and variant details
        const product = await Product.findById(cartItem.productId);
        if (!product || !product.isPublished || product.isDeleted) {
            return res.status(400).json({ message: 'Product is not available (unpublished or deleted)' });
        }

        const variantData = await ProductVariant.findById(cartItem.variantId);
        if (!variantData || !variantData.isPublished || variantData.isDeleted) {
            return res.status(400).json({ message: 'Product variant is not available (unpublished or deleted)' });
        }

        // Ensure the selected size exists in the variant
        const selectedVariant = variantData.sizes.find(s => s.size === cartItem.variant);
        if (!selectedVariant) {
            return res.status(400).json({ message: 'Variant size/color not found' });
        }

        // Ensure the updated quantity is available in stock or backorder is allowed
        if (quantity > selectedVariant.stock) {
            if (selectedVariant.allowBackorder) {
                // Backorder is allowed, so we can proceed
                console.log(`Backorder allowed. Proceeding with quantity: ${quantity}`);
            } else {
                return res.status(400).json({ message: `Not enough stock for the selected variant. Only ${selectedVariant.stock} left.` });
            }
        }

        // Update the quantity of the cart item
        cartItem.quantity = quantity;
        await cartItem.save();

        // Update the total number of items in the cart
        cart.totalItems = cart.items.length;
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






module.exports = {
    getCart,
    addItemToCart,
    updateCartItem,
    removeItemFromCart
};
