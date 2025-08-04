const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
    },
    color: {
      type: String,
      required: true,
    },
    size: {
      type: String, // ✅ Add size info
      required: true,
    },
    sku: {
      type: String, // ✅ Store SKU at the time of purchase
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      // Price at the time of purchase
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    groupOrderId: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true, // 🔥 REQUIRED to filter vendor orders by business
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    totalAmount: {
      type: Number, // stored in smallest currency unit (e.g. paise if INR)
      required: true,
    },
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: [
        "created",   // ✅ updated from 'ordered'
        "ordered",
        "accepted",
        "rejected",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
      ],
      default: "created",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    trackingInfo: {
      trackingId: String,
      trackingUrl: String,
    },
    vendorNote: String,
    userNote: String,
    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentId: {
      type: String, // Stripe PaymentIntent ID
      required: false,
    },
    stripeCustomerId: {
      type: String // Optional: if using Stripe Customer objects
    },
    paymentMethod: {
      type: String,
      enum: ["stripe"],
      default: "stripe",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, vendorId: 1, status: 1 });
orderSchema.index({ groupOrderId: 1 });

module.exports = mongoose.model("Order", orderSchema);
