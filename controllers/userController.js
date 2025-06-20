const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sendOtpEmail } = require('../utils/mailer');

exports.registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { name, email, password, role, mobile, gender } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with email or mobile' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const newUser = new User({
            name,
            email,
            passwordHash,
            mobile,
            role,
            gender,
            otp: otpHash,
            otpExpiry,
            isOtpVerified: false,
        });

        await newUser.save();

        console.log(`🔐 OTP for ${email} is: ${otp}`); // Simulate sending OTP
        // await sendOtpEmail(email, otp);

        res.status(201).json({
            success: true,
            message: 'User registered successfully. OTP sent to mobile.',
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// -------------------------------------------------------otp verifictaion and otp resend ----------------------------------------------------

// otp verifictaion

exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !user.otp || !user.otpExpiry) {
            return res.status(400).json({ success: false, message: 'OTP not generated or user not found' });
        }

        if (user.otpExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        const isValid = await bcrypt.compare(otp, user.otp);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Mark as verified
        user.isOtpVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        // Generate JWT Token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'OTP verified and login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                gender: user.gender,
            },
        });
    } catch (err) {
        console.error('OTP verify error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// OTP Resend

exports.resendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isOtpVerified) {
            return res.status(400).json({ success: false, message: 'User already verified' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otpHash;
        user.otpExpiry = otpExpiry;
        await user.save();

        // await sendOtpEmail(user.email, otp);
        console.log(`🔐 OTP for ${email} is: ${otp}`); // Simulate sending OTP

        res.status(200).json({ success: true, message: 'OTP re-sent to your email' });
    } catch (err) {
        console.error('Resend OTP error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};



// -------------------------------------------------------------------------------------------------------------------------------------------



exports.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !user.passwordHash) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (!user.isOtpVerified) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpHash = await bcrypt.hash(otp, 10);
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

            user.otp = otpHash;
            user.otpExpiry = otpExpiry;
            await user.save();

            console.log(`🔐 OTP re-sent for ${email}: ${otp}`);
            // await sendOtpEmail(user.email, otp);

            return res.status(403).json({
                success: false,
                otpPending: true,
                message: 'OTP not verified. A new OTP has been sent.',
                user: {
                    email: user.email,
                    role: user.role,
                },
            });
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                gender: user.gender,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
