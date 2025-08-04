// const Order = require('../models/Order');
// const ProductVariant = require('../models/ProductVariant');
// const { processPayment } = require('../utils/paymentGateway'); // Utility function to process payment
// const { isValidPhoneNumber } = require('libphonenumber-js'); // For validating international phone numbers

// Create Order and Process Payment
// const createOrder = async (req, res) => {
//   const { userId, shippingAddress, orderItems, paymentDetails } = req.body;

//   try {
//     // Step 1: Validate the provided address object
//     if (!shippingAddress || !shippingAddress.name || !shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.country || !shippingAddress.pincode || !shippingAddress.phoneNumber) {
//       return res.status(400).json({ message: 'All address fields are required' });
//     }

//     // Validate phone number using libphonenumber
//     if (!isValidPhoneNumber(shippingAddress.phoneNumber, shippingAddress.country)) {
//       return res.status(400).json({ message: 'Invalid phone number format' });
//     }

//     // Optional: Validate address format (regex validation for pincode)
//     const validPincode = /^[0-9]{5,6}$/;  // Pincode validation (5-6 digits)
//     if (!validPincode.test(shippingAddress.pincode)) {
//       return res.status(400).json({ message: 'Invalid pincode format' });
//     }

//     // Step 2: Validate stock availability for each item in the order
//     for (let item of orderItems) {
//       const productVariant = await ProductVariant.findById(item.productVariantId);
//       if (productVariant.isDeleted) {
//         return res.status(400).json({ message: `Product variant is no longer available.` });
//       }

//       const sizeVariant = productVariant.sizes.find(s => s.size === item.size);
//       if (!sizeVariant || sizeVariant.stock < item.quantity) {
//         return res.status(400).json({ message: `Not enough stock for ${productVariant.productId} ${item.size}` });
//       }
//     }

//     // Step 3: Calculate total amount for the order
//     let totalAmount = 0;
//     for (let item of orderItems) {
//       const productVariant = await ProductVariant.findById(item.productVariantId);
//       const sizeVariant = productVariant.sizes.find(s => s.size === item.size);
//       const price = sizeVariant.salePrice || sizeVariant.price;  // Apply sale price if valid
//       totalAmount += price * item.quantity;
//     }

//     // Step 4: Create the order, embedding the shipping address directly in the order
//     const order = new Order({
//       userId,
//       shippingAddress,  // Directly embed the validated address
//       orderItems,
//       totalAmount,
//       paymentStatus: 'pending',
//       transactionId: paymentDetails.transactionId,
//       orderStatus: 'pending',
//       orderStatusHistory: [{ status: 'pending' }],
//     });

//     await order.save();  // Save the order to the database

//     // Step 5: Process payment
//     const paymentStatus = await processPayment(paymentDetails);
//     if (paymentStatus === 'success') {
//       order.paymentStatus = 'paid';
//       order.orderStatus = 'completed';
//       await order.save();  // Update the order with payment details

//       // Step 6: Update stock after successful payment
//       for (let item of orderItems) {
//         const productVariant = await ProductVariant.findById(item.productVariantId);
//         const sizeVariant = productVariant.sizes.find(s => s.size === item.size);
//         sizeVariant.stock -= item.quantity;
//         await productVariant.save();  // Save the updated product variant with new stock
//       }

//       res.status(201).json({ success: true, order });  // Send the created order as response
//     } else {
//       res.status(400).json({ message: 'Payment Failed' });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Failed to process the order' });
//   }
// };

// module.exports = { createOrder };


const Order = require('../models/Order');
const ProductVariant = require('../models/ProductVariant');
const { v4: uuidv4 } = require('uuid');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.initiateOrder = async (req, res) => {
  try {
    const { items, shippingAddress, userNote } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items are required' });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.addressLine1) {
      return res.status(400).json({ success: false, message: 'Shipping address is incomplete' });
    }

    const vendorItemMap = {}; // ✅ Changed to store businessId and items
    const seen = new Set();

    for (const item of items) {
      const { productId, variantId, size, quantity, price } = item;

      if (!productId || !variantId || !size || !quantity || !price) {
        return res.status(400).json({ success: false, message: 'Invalid item structure' });
      }

      const key = `${variantId}-${size}`;
      if (seen.has(key)) return res.status(400).json({ success: false, message: 'Duplicate item in cart' });
      seen.add(key);

      const variant = await ProductVariant.findById(variantId).populate('productId');
      if (!variant || !variant.productId || variant.productId._id.toString() !== productId) {
        return res.status(404).json({ success: false, message: 'Product or variant not found' });
      }

      const sizeObj = variant.sizes.find(s => s.size === size);
      if (!sizeObj) return res.status(400).json({ success: false, message: `Size ${size} not available` });

      if (!variant.allowBackorder && sizeObj.stock < quantity) {
        return res.status(400).json({ success: false, message: `Out of stock for size ${size}` });
      }

      const now = new Date();
      const validDiscount = sizeObj.salePrice && sizeObj.discountEndDate && new Date(sizeObj.discountEndDate) > now;
      const actualPrice = validDiscount ? parseFloat(sizeObj.salePrice.toString()) : parseFloat(sizeObj.price.toString());

      if (actualPrice !== price) {
        return res.status(400).json({ success: false, message: `Price mismatch for size ${size}` });
      }

      const vendorId = variant.ownerId.toString();

      // ✅ Store businessId and items per vendor
      if (!vendorItemMap[vendorId]) {
        vendorItemMap[vendorId] = {
          businessId: variant.businessId,
          items: []
        };
      }

      vendorItemMap[vendorId].items.push({
        productId,
        variantId,
        quantity,
        price,
        size,
        sku: sizeObj.sku,
        color: variant.color,
      });
    }

    // ✅ Create Orders in DB
    const groupOrderId = uuidv4();
    const orders = [];
    let grandTotal = 0;

    for (const vendorId of Object.keys(vendorItemMap)) {
      const { businessId, items: vendorItems } = vendorItemMap[vendorId]; // ✅ Destructure businessId and items
      const totalAmount = vendorItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      grandTotal += totalAmount;

      const newOrder = new Order({
        groupOrderId,
        userId,
        vendorId,
        businessId, // ✅ now valid and present
        items: vendorItems,
        totalAmount,
        currency: 'USD',
        status: 'created',
        statusHistory: [{ status: 'created' }],
        shippingAddress,
        userNote,
        paymentStatus: 'pending',
        paymentMethod: 'stripe'
      });

      const saved = await newOrder.save();
      orders.push(saved);
    }

    // ✅ Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(grandTotal * 100),
      currency: 'usd',
      metadata: { groupOrderId }
    });

    // ✅ Update all orders with paymentId
    await Order.updateMany(
      { groupOrderId },
      { $set: { paymentId: paymentIntent.id } }
    );

    return res.status(201).json({
      success: true,
      message: 'Orders initialized',
      groupOrderId,
      clientSecret: paymentIntent.client_secret,
      orders
    });

  } catch (err) {
    console.error('Order initiation failed:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};




exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status; // optional query param

    const filter = { userId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('vendorId', 'name') // populate vendor name
      .populate('items.productId', 'title coverImage')
      .populate('items.variantId', 'color sizes images');

    res.json({
      success: true,
      count: orders.length,
      orders
    });

  } catch (err) {
    console.error('Failed to fetch user orders:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const status = req.query.status;
    const businessId = req.query.businessId;
    

    const filter = { vendorId, paymentStatus: { $in: ['paid', 'refunded'] }, };
    if (status) filter.status = status;
    if (businessId) filter.businessId = businessId;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email') // buyer info
      .populate('items.productId', 'title coverImage')
      .populate('items.variantId', 'color sizes');

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Error fetching vendor orders:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



exports.acceptOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId, vendorId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
    }

    if (order.status !== 'ordered') {
      return res.status(400).json({ success: false, message: 'Only "ordered" orders can be accepted' });
    }

    // 🔁 Decrease stock
    for (const item of order.items) {
      const variant = await ProductVariant.findById(item.variantId);
      if (!variant) continue;

      const sizeObj = variant.sizes.find(s => s.size === item.size);
      if (sizeObj) {
        sizeObj.stock = Math.max(0, sizeObj.stock - item.quantity); // Prevent negative
      }

      await variant.save();
    }

    order.status = 'accepted';
    order.statusHistory.push({ status: 'accepted' });
    await order.save();

    res.json({ success: true, message: 'Order accepted and stock updated', order });

  } catch (err) {
    console.error('Error accepting order:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};




exports.rejectOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId, vendorId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
    }

    if (order.status !== 'ordered') {
      return res.status(400).json({ success: false, message: 'Only "ordered" orders can be rejected' });
    }

    order.status = 'rejected';
    order.statusHistory.push({ status: 'rejected' });

    // Refund if already paid
    if (order.paymentStatus === 'paid' && order.paymentId) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const refund = await stripe.refunds.create({
        payment_intent: order.paymentId,
        amount: Math.round(order.totalAmount * 100),
        reason: 'requested_by_customer'
      });

      order.paymentStatus = 'refunded';
      order.statusHistory.push({ status: 'refunded' });

      console.log(`💸 Refund initiated for order ${orderId}: $${order.totalAmount}`);
    }

    await order.save();
    res.json({ success: true, message: 'Order rejected and refunded (if paid)', order });

  } catch (err) {
    console.error('Error rejecting order:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



exports.shipOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const orderId = req.params.orderId;
    const { trackingId, trackingUrl, vendorNote } = req.body;

    if (!trackingId || !trackingUrl) {
      return res.status(400).json({ success: false, message: 'Tracking ID and URL are required' });
    }

    const order = await Order.findOne({ _id: orderId, vendorId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
    }

    if (order.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Only accepted orders can be shipped' });
    }

    order.trackingInfo = { trackingId, trackingUrl };
    if (vendorNote) order.vendorNote = vendorNote;

    order.status = 'shipped';
    order.statusHistory.push({ status: 'shipped' });

    await order.save();

    res.json({
      success: true,
      message: 'Order marked as shipped',
      order
    });

  } catch (err) {
    console.error('Error in shipOrder:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

