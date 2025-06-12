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
        passwordHash: {
            type: String,
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
        profileImage: {
            type: String,
        },
        mobile: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        otp: {
            type: String, // hashed OTP
        },
        otpExpiry: {
            type: Date,
        },
        isOtpVerified: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
