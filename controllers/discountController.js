const Discount = require('../models/Discounts');
const mongoose = require('mongoose');

// ============================================
// CREATE DISCOUNT
// ============================================
exports.createDiscount = async (req, res) => {
  try {
    const {
      businessId,
      name,
      couponCode,
      type,
      value,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      validFrom,
      validTill
    } = req.body;

    // Check duplicate coupon
    const existing = await Discount.findOne({ couponCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists"
      });
    }

    const discount = await Discount.create({
      businessId,
      name,
      couponCode: couponCode.toUpperCase(),
      type,
      value,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      validFrom,
      validTill
    });

    res.status(201).json({
      success: true,
      data: discount
    });

  } catch (error) {
    console.error("Create Discount Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create discount"
    });
  }
};


// ============================================
// GET BUSINESS DISCOUNTS
// ============================================
exports.getBusinessDiscounts = async (req, res) => {
  try {
    const { businessId } = req.params;

    const discounts = await Discount.find({ businessId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: discounts.length,
      data: discounts
    });

  } catch (error) {
    console.error("Get Discounts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discounts"
    });
  }
};


// ============================================
// GET DISCOUNT BY ID
// ============================================
exports.getDiscountById = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found"
      });
    }

    res.json({
      success: true,
      data: discount
    });

  } catch (error) {
    console.error("Get Discount Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discount"
    });
  }
};


// ============================================
// UPDATE DISCOUNT
// ============================================
exports.updateDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found"
      });
    }

    res.json({
      success: true,
      data: discount
    });

  } catch (error) {
    console.error("Update Discount Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update discount"
    });
  }
};


// ============================================
// DELETE DISCOUNT
// ============================================
exports.deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Discount not found"
      });
    }

    res.json({
      success: true,
      message: "Discount deleted successfully"
    });

  } catch (error) {
    console.error("Delete Discount Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete discount"
    });
  }
};


// ============================================
// VALIDATE COUPON
// ============================================
exports.validateCoupon = async (req, res) => {
  try {
    const { couponCode, businessId, amount } = req.body;

    const discount = await Discount.findOne({
      couponCode: couponCode.toUpperCase(),
      businessId,
      isActive: true
    });

    if (!discount) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon"
      });
    }

    // Check expiry
    if (discount.validTill && new Date() > discount.validTill) {
      return res.status(400).json({
        success: false,
        message: "Coupon expired"
      });
    }

    // Check usage limit
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return res.status(400).json({
        success: false,
        message: "Coupon usage limit reached"
      });
    }

    // Check minimum amount
    if (amount < discount.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ${discount.minOrderAmount}`
      });
    }

    res.json({
      success: true,
      data: discount
    });

  } catch (error) {
    console.error("Validate Coupon Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate coupon"
    });
  }
};


// ============================================
// APPLY COUPON
// ============================================
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode, businessId, amount } = req.body;

    const discount = await Discount.findOne({
      couponCode: couponCode.toUpperCase(),
      businessId,
      isActive: true
    });

    if (!discount) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon"
      });
    }

    let discountAmount = 0;

    // Calculate discount
    if (discount.type === "percentage") {
      discountAmount = (amount * discount.value) / 100;

      if (discount.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
      }
    } else {
      discountAmount = discount.value;
    }

    const finalAmount = Math.max(0, amount - discountAmount);

    res.json({
      success: true,
      data: {
        originalAmount: amount,
        discountAmount,
        finalAmount,
        couponCode: discount.couponCode
      }
    });

  } catch (error) {
    console.error("Apply Coupon Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply coupon"
    });
  }
};