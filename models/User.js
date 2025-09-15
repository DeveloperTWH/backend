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
      required: function () { return this.provider === 'local'; },
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
    minorityType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MinorityType',
      required: function () { return this.provider === 'local'; }
    }
  },
  { timestamps: true }
);

/** === Indexes === **/

// Unique email for everyone
userSchema.index({ email: 1 }, { unique: true });

// Unique mobile only when present and non-empty
userSchema.index(
  { mobile: 1 },
  {
    unique: true,
    partialFilterExpression: { mobile: { $type: 'string', $ne: '' } },
  }
);

// One record per social provider account (when providerId exists)
userSchema.index(
  { provider: 1, providerId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerId: { $exists: true, $ne: '' } },
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
