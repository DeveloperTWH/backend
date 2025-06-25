const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    role: {
      type: String,
      enum: ['admin', 'customer', 'business_owner'],
      default: 'customer',
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    providerId: {
      type: String,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
