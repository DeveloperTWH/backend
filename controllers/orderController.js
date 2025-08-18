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

// controllers/orderController.js
const { v4: uuidv4 } = require("uuid");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Order = require("../models/Order");
const ProductVariant = require("../models/ProductVariant");
const Business = require("../models/Business");

exports.initiateOrder = async (req, res) => {
  try {
    const { items, shippingAddress, userNote } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Items are required" });
    }

    if (
      !shippingAddress?.fullName ||
      !shippingAddress?.phone ||
      !shippingAddress?.addressLine1
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Shipping address is incomplete" });
    }

    // Build vendor map (to detect multiple vendors) & validate each item
    const vendorItemMap = {};
    const seen = new Set();

    for (const item of items) {
      const { productId, variantId, size, quantity, price } = item;
      if (!productId || !variantId || !size || !quantity || !price) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid item structure" });
      }

      const key = `${variantId}-${size}`;
      if (seen.has(key)) {
        return res
          .status(400)
          .json({ success: false, message: "Duplicate item in cart" });
      }
      seen.add(key);

      const variant = await ProductVariant.findById(variantId).populate(
        "productId"
      ); // ensures product linkage integrity

      if (
        !variant ||
        !variant.productId ||
        variant.productId._id.toString() !== productId
      ) {
        return res
          .status(404)
          .json({ success: false, message: "Product or variant not found" });
      }

      const sizeObj = variant.sizes.find((s) => s.size === size);
      if (!sizeObj) {
        return res
          .status(400)
          .json({ success: false, message: `Size ${size} not available` });
      }

      if (!variant.allowBackorder && sizeObj.stock < quantity) {
        return res
          .status(400)
          .json({ success: false, message: `Out of stock for size ${size}` });
      }

      // Verify price (handles sale price with end date)
      const now = new Date();
      const validDiscount = !!(
        sizeObj.salePrice &&
        sizeObj.discountEndDate &&
        new Date(sizeObj.discountEndDate) > now
      );
      const actualPrice = validDiscount
        ? Number(sizeObj.salePrice)
        : Number(sizeObj.price);
      if (Number(price) !== actualPrice) {
        return res
          .status(400)
          .json({ success: false, message: `Price mismatch for size ${size}` });
      }

      const vendorId = variant.ownerId.toString();

      // Collect items per vendor
      if (!vendorItemMap[vendorId]) {
        vendorItemMap[vendorId] = {
          businessId: variant.businessId,
          items: [],
        };
      }

      vendorItemMap[vendorId].items.push({
        productId,
        variantId,
        quantity,
        price: actualPrice,
        size,
        sku: sizeObj.sku,
        color: variant.color,
      });
    }

    // Enforce single-vendor checkout (for now)
    const vendorIds = Object.keys(vendorItemMap);
    if (vendorIds.length !== 1) {
      return res.status(400).json({
        success: false,
        message: "Single-vendor checkout only at this time.",
      });
    }

    // Compute totals and create a single order
    const vendorId = vendorIds[0];
    const { businessId, items: vendorItems } = vendorItemMap[vendorId];
    const totalAmount = vendorItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // Load Business to get Connect account
    const business = await Business.findById(businessId);
    if (!business || !business.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        message: "Vendor is not connected to Stripe. Please contact support.",
      });
    }

    const groupOrderId = uuidv4();

    const order = await new Order({
      groupOrderId,
      userId,
      vendorId,
      businessId,
      items: vendorItems,
      totalAmount, // kept in major units (USD); Stripe gets cents below
      currency: "USD",
      status: "created",
      statusHistory: [{ status: "created" }],
      shippingAddress,
      userNote,
      paymentStatus: "pending",
      paymentMethod: "stripe",
    }).save();

    // Platform fee in cents (e.g., 50 => $0.50). Set via env.
    const platformFeeCents = Number.parseInt(
      process.env.PLATFORM_FEE_CENTS || "0"
    );

    // Create a vendor-directed PaymentIntent with Connect transfer
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(totalAmount * 100), // cents
        currency: "usd",
        metadata: {
          groupOrderId,
          orderId: order._id.toString(),
        },
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: business.stripeConnectAccountId,
        },
      },
      {
        // Helps prevent accidental duplicate charges on retries
        idempotencyKey: `pi:${order._id.toString()}`,
      }
    );

    // Save PI id on order
    order.paymentId = paymentIntent.id;
    await order.save();

    return res.status(201).json({
      success: true,
      message: "Order initialized",
      groupOrderId,
      orderId: order._id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Order initiation failed:", err);
    return res.status(500).json({ success: false, message: "Server error" });
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
      .populate("vendorId", "name") // populate vendor name
      .populate("items.productId", "title coverImage")
      .populate("items.variantId", "color sizes images");

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error("Failed to fetch user orders:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const status = req.query.status;
    const businessId = req.query.businessId;

    const filter = { vendorId, paymentStatus: { $in: ["paid", "refunded"] } };
    if (status) filter.status = status;
    if (businessId) filter.businessId = businessId;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name email") // buyer info
      .populate("items.productId", "title coverImage")
      .populate("items.variantId", "color sizes");

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error("Error fetching vendor orders:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.acceptOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId, vendorId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found or unauthorized" });
    }

    if (order.status !== "ordered") {
      return res.status(400).json({
        success: false,
        message: 'Only "ordered" orders can be accepted',
      });
    }

    // 🔁 Decrease stock
    for (const item of order.items) {
      const variant = await ProductVariant.findById(item.variantId);
      if (!variant) continue;

      const sizeObj = variant.sizes.find((s) => s.size === item.size);
      if (sizeObj) {
        sizeObj.stock = Math.max(0, sizeObj.stock - item.quantity); // Prevent negative
      }

      await variant.save();
    }

    order.status = "accepted";
    order.statusHistory.push({ status: "accepted" });
    await order.save();

    res.json({
      success: true,
      message: "Order accepted and stock updated",
      order,
    });
  } catch (err) {
    console.error("Error accepting order:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.rejectOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId, vendorId });
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found or unauthorized" });
    }

    if (order.status !== "ordered") {
      return res.status(400).json({
        success: false,
        message: 'Only "ordered" orders can be rejected',
      });
    }

    order.status = "rejected";
    order.statusHistory.push({ status: "rejected" });

    // Refund if already paid
    if (order.paymentStatus === "paid" && order.paymentId) {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

      const refund = await stripe.refunds.create({
        payment_intent: order.paymentId,
        amount: Math.round(order.totalAmount * 100),
        reason: "requested_by_customer",
      });

      order.paymentStatus = "refunded";
      order.statusHistory.push({ status: "refunded" });

      console.log(
        `💸 Refund initiated for order ${orderId}: $${order.totalAmount}`
      );
    }

    await order.save();
    res.json({
      success: true,
      message: "Order rejected and refunded (if paid)",
      order,
    });
  } catch (err) {
    console.error("Error rejecting order:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.shipOrder = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const orderId = req.params.orderId;
    const { trackingId, trackingUrl, vendorNote } = req.body;

    if (!trackingId || !trackingUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Tracking ID and URL are required" });
    }

    const order = await Order.findOne({ _id: orderId, vendorId });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found or unauthorized" });
    }

    if (order.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Only accepted orders can be shipped",
      });
    }

    order.trackingInfo = { trackingId, trackingUrl };
    if (vendorNote) order.vendorNote = vendorNote;

    order.status = "shipped";
    order.statusHistory.push({ status: "shipped" });

    await order.save();

    res.json({
      success: true,
      message: "Order marked as shipped",
      order,
    });
  } catch (err) {
    console.error("Error in shipOrder:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const {
      status, // e.g. 'ordered'
      paymentStatus, // e.g. 'paid'
      businessId,
      vendorId,
      userId,
      from, // ISO date string
      to, // ISO date string
      q, // optional search: groupOrderId / order _id
    } = req.query;

    const match = {};
    if (status) match.status = status;
    if (paymentStatus) match.paymentStatus = paymentStatus;
    if (businessId) match.businessId = businessId;
    if (vendorId) match.vendorId = vendorId;
    if (userId) match.userId = userId;
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }
    if (q) {
      // search by groupOrderId or order _id string
      match.$or = [
        { groupOrderId: q },
        { _id: q.match(/^[a-f\d]{24}$/i) ? q : undefined }, // only valid ObjectId strings
      ].filter(Boolean);
    }

    const [rows, total, paymentAgg, statusAgg] = await Promise.all([
      Order.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email")
        .populate("vendorId", "name email")
        .populate("businessId", "businessName slug")
        .lean(),
      Order.countDocuments(match),
      Order.aggregate([
        { $match: match },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    // normalize summaries so missing buckets show 0
    const paymentBuckets = ["pending", "paid", "failed", "refunded"];
    const statusBuckets = [
      "created",
      "ordered",
      "accepted",
      "rejected",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
      "refunded",
    ];

    const paymentSummary = Object.fromEntries(
      paymentBuckets.map((k) => [k, 0])
    );
    paymentAgg.forEach((r) => {
      paymentSummary[r._id] = r.count;
    });

    const statusSummary = Object.fromEntries(statusBuckets.map((k) => [k, 0]));
    statusAgg.forEach((r) => {
      statusSummary[r._id] = r.count;
    });

    return res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        payment: paymentSummary,
        status: statusSummary,
      },
    });
  } catch (err) {
    console.error("getAllOrdersAdmin error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
