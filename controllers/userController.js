const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { sendOtpEmail, sendWelcomeEmail, sendPasswordResetOtpEmail } = require('../utils/mailer');

const isProd = process.env.NODE_ENV === 'production';

function getCookieOptions(maxAge, { httpOnly = true } = {}) {
    return {
        httpOnly,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        domain: isProd ? '.mosaicbizhub.com' : undefined,
        path: '/',
        maxAge,
    };
}

function clearCookieWithSharedOptions(res, name, { httpOnly = true } = {}) {
    res.clearCookie(name, {
        httpOnly,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        domain: isProd ? '.mosaicbizhub.com' : undefined,
        path: '/',
    });
}

 exports.registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { name, email, password, role, mobile, gender, minorityType  } = req.body;

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
            minorityType,
            otp: otpHash,
            otpExpiry,
            isOtpVerified: false,
        });

        await newUser.save();

        console.log(`🔐 OTP for ${email} is: ${otp}`);
        
        // Handle email sending failure gracefully
        try {
            await sendOtpEmail(email, otp);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // Continue anyway - user can resend OTP
        }

        res.cookie('otpPending', 'true', getCookieOptions(10 * 60 * 1000));

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

        if (user.isDeleted) {
            return res.status(403).json({ success: false, message: 'Account has been deleted' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked by admin' });
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

        // Send welcome email
        try {
            const firstName = user.name.split(' ')[0];
            // await sendWelcomeEmail(user.email, firstName);/
            await sendWelcomeEmail(user.email, firstName, user.role);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        // Generate JWT Token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, getCookieOptions(7 * 24 * 60 * 60 * 1000));

        res.cookie('user_session', 'true', getCookieOptions(7 * 24 * 60 * 60 * 1000, {
            httpOnly: false,
        }));

        res.cookie('user_gender', user.gender || '', getCookieOptions(7 * 24 * 60 * 60 * 1000, {
            httpOnly: false,
        }));

        clearCookieWithSharedOptions(res, 'otpPending');

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


// const isProd = process.env.NODE_ENV === "production";


//  exports.registerUser = async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     try {
//         const { name, email, password, role, mobile, gender, minorityType  } = req.body;

//         const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
//         if (existingUser) {
//             return res.status(400).json({ success: false, message: 'User already exists with email or mobile' });
//         }

//         const passwordHash = await bcrypt.hash(password, 12);

//         // Generate OTP
//         const otp = Math.floor(100000 + Math.random() * 900000).toString();
//         const otpHash = await bcrypt.hash(otp, 10);
//         const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//         const newUser = new User({
//             name,
//             email,
//             passwordHash,
//             mobile,
//             role,
//             gender,
//             minorityType,
//             otp: otpHash,
//             otpExpiry,
//             isOtpVerified: false,
//         });

//         await newUser.save();

//         console.log(`🔐 OTP for ${email} is: ${otp}`);
        
//         // Handle email sending failure gracefully
//         try {
//             await sendOtpEmail(email, otp);
//         } catch (emailError) {
//             console.error('Failed to send OTP email:', emailError);
//             // Continue anyway - user can resend OTP
//         }

//         // res.cookie('otpPending', 'true', {
//         //     httpOnly: true,
//         //     secure: process.env.NODE_ENV === 'production',
//         //     sameSite: 'none',
//         //     maxAge: 10 * 60 * 1000,
//         // });

//         res.cookie("otpPending", "true", {
//     httpOnly: true,
//     secure: isProd,
//     sameSite: isProd ? "none" : "lax",
//     domain: isProd ? ".mosaicbizhub.com" : undefined,
//     path: "/",
//     maxAge: 10 * 60 * 1000,
// });

//         res.status(201).json({
//             success: true,
//             message: 'User registered successfully. OTP sent to mobile.',
//         });
//     } catch (err) {
//         console.error('Registration error:', err);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };


// // -------------------------------------------------------otp verifictaion and otp resend ----------------------------------------------------

// // otp verifictaion

// exports.verifyOtp = async (req, res) => {
//     const { email, otp } = req.body;

//     try {
//         const user = await User.findOne({ email });
//         if (!user || !user.otp || !user.otpExpiry) {
//             return res.status(400).json({ success: false, message: 'OTP not generated or user not found' });
//         }

//         if (user.isDeleted) {
//             return res.status(403).json({ success: false, message: 'Account has been deleted' });
//         }

//         if (user.isBlocked) {
//             return res.status(403).json({ success: false, message: 'Account is blocked by admin' });
//         }

//         if (user.otpExpiry < Date.now()) {
//             return res.status(400).json({ success: false, message: 'OTP has expired' });
//         }

//         const isValid = await bcrypt.compare(otp, user.otp);
//         if (!isValid) {
//             return res.status(400).json({ success: false, message: 'Invalid OTP' });
//         }

//         // Mark as verified
//         user.isOtpVerified = true;
//         user.otp = undefined;
//         user.otpExpiry = undefined;
//         await user.save();

//         // Send welcome email
//         try {
//             const firstName = user.name.split(' ')[0];
//             await sendWelcomeEmail(user.email, firstName);
//         } catch (emailError) {
//             console.error('Failed to send welcome email:', emailError);
//         }

//         // Generate JWT Token
//         const token = jwt.sign(
//             { userId: user._id, role: user.role },
//             process.env.JWT_SECRET,
//             { expiresIn: '7d' }
//         );

// res.cookie("token", token, {
//     httpOnly: true,
//     secure: isProd,
//     sameSite: isProd ? "none" : "lax",
//     domain: isProd ? ".mosaicbizhub.com" : undefined,
//     path: "/",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
// });

// res.cookie("user_session", "true", {
//     httpOnly: false,
//     secure: isProd,
//     sameSite: isProd ? "none" : "lax",
//     domain: isProd ? ".mosaicbizhub.com" : undefined,
//     path: "/",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
// });

// res.cookie("user_gender", user.gender || "", {
//     httpOnly: false,
//     secure: isProd,
//     sameSite: isProd ? "none" : "lax",
//     domain: isProd ? ".mosaicbizhub.com" : undefined,
//     path: "/",
//     maxAge: 7 * 24 * 60 * 60 * 1000,
// });

// res.clearCookie("otpPending", {
//     domain: isProd ? ".mosaicbizhub.com" : undefined,
//     path: "/",
// });


//         res.status(200).json({
//             success: true,
//             message: 'OTP verified and login successful',
//             token,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 mobile: user.mobile,
//                 role: user.role,
//                 gender: user.gender,
//             },
//         });

//     } catch (err) {
//         console.error('OTP verify error:', err);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };



// OTP Resend

exports.resendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isDeleted) {
            return res.status(403).json({ success: false, message: 'Account has been deleted' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked by admin' });
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

        await sendOtpEmail(user.email, otp);
        console.log(`🔐 OTP for ${email} is: ${otp}`); // Simulate sending OTP

        res.cookie('otpPending', 'true', getCookieOptions(10 * 60 * 1000));

        res.status(200).json({
            success: true,
            message: 'OTP resent successfully.',
        });

    } catch (err) {
        console.error('Resend OTP error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.forgotPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isDeleted) {
            return res.status(403).json({ success: false, message: 'Account has been deleted' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked by admin' });
        }

        if (!user.passwordHash) {
            return res.status(400).json({ success: false, message: 'Password reset is not available for this account' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.resetPasswordOtp = otpHash;
        user.resetPasswordOtpExpiry = otpExpiry;
        await user.save();

        try {
            await sendPasswordResetOtpEmail(user.email, otp);
        } catch (emailError) {
            console.error('Failed to send password reset OTP email:', emailError);
            return res.status(500).json({ success: false, message: 'Failed to send reset OTP' });
        }

        console.log(`Password reset OTP for ${email} is: ${otp}`);

        return res.status(200).json({
            success: true,
            message: 'Password reset OTP sent successfully.',
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.resetPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpiry) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset request' });
        }

        if (user.isDeleted) {
            return res.status(403).json({ success: false, message: 'Account has been deleted' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked by admin' });
        }

        if (user.resetPasswordOtpExpiry < Date.now()) {
            user.resetPasswordOtp = undefined;
            user.resetPasswordOtpExpiry = undefined;
            await user.save();

            return res.status(400).json({ success: false, message: 'Reset OTP has expired' });
        }

        const isValidOtp = await bcrypt.compare(otp, user.resetPasswordOtp);
        if (!isValidOtp) {
            return res.status(400).json({ success: false, message: 'Invalid reset OTP' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        user.passwordHash = passwordHash;
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpiry = undefined;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password reset successful',
        });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};



// -------------------------------------------------------------------------------------------------------------------------------------------



// exports.loginUser = async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//         return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     try {
//         const { email, password, role } = req.body;

//         const user = await User.findOne({ email });
//         if (!user || !user.passwordHash) {
//             return res.status(401).json({ success: false, message: 'Invalid credentials' });
//         }

//         if (role && user.role !== role) {
//             return res.status(401).json({ success: false, message: 'Invalid role for this account' });
//         }

//         if (user.isDeleted) {
//             return res.status(403).json({ success: false, message: 'Account has been deleted' });
//         }

//         if (user.isBlocked) {
//             return res.status(403).json({ success: false, message: 'Account is blocked by admin' });
//         }


//         const isMatch = await bcrypt.compare(password, user.passwordHash);
//         if (!isMatch) {
//             return res.status(401).json({ success: false, message: 'Invalid credentials' });
//         }

//         if (!user.isOtpVerified) {
//             const otp = Math.floor(100000 + Math.random() * 900000).toString();
//             const otpHash = await bcrypt.hash(otp, 10);
//             const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

//             user.otp = otpHash;
//             user.otpExpiry = otpExpiry;
//             await user.save();

//             console.log(`🔐 OTP re-sent for ${email}: ${otp}`);
//             await sendOtpEmail(user.email, otp);

//             res.cookie('otpPending', 'true', {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === 'production',
//                 sameSite: 'none',
//                 domain: '.mosaicbizhub.com',
//                 maxAge: 10 * 60 * 1000, // 10 minutes
//             });

//             return res.status(403).json({
//                 success: false,
//                 otpPending: true,
//                 message: 'OTP not verified. A new OTP has been sent.',
//                 user: {
//                     email: user.email,
//                     role: user.role,
//                 },
//             });
//         }

//         const token = jwt.sign(
//             { userId: user._id, role: user.role },
//             process.env.JWT_SECRET,
//             { expiresIn: '7d' }
//         );

//         res.cookie('token', token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === 'production',
//             sameSite: 'strict',
//             // sameSite: 'none',
//             // domain: '.mosaicbizhub.com',
//             maxAge: 7 * 24 * 60 * 60 * 1000,
//         });

//         res.cookie('user_session', 'true', {
//             httpOnly: false,
//             sameSite: 'strict',
//             // sameSite: 'none',
//             // domain: '.mosaicbizhub.com',
//             secure: process.env.NODE_ENV === 'production',
//             maxAge: 7 * 24 * 60 * 60 * 1000,
//         });

//         res.cookie('user_gender', user.gender || '', {
//             httpOnly: false,
//             secure: process.env.NODE_ENV === 'production',
//             sameSite: 'strict',
//             // sameSite: 'none',
//             // domain: '.mosaicbizhub.com',
//             maxAge: 7 * 24 * 60 * 60 * 1000,
//         });

//         res.status(200).json({
//             success: true,
//             message: 'Login successful',
//             token,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role,
//                 gender: user.gender,
//             },
//         });

//     } catch (err) {
//         console.error('Login error:', err);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };


//cookies fixed version

exports.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { email, password, role } = req.body;

        const user = await User.findOne({ email });
        if (!user || !user.passwordHash) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (role && user.role !== role) {
            return res.status(401).json({ success: false, message: 'Invalid role for this account' });
        }

        if (user.isDeleted) {
            return res.status(403).json({ success: false, message: 'Account has been deleted' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Account is blocked by admin' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // 🔐 OTP not verified yet
        if (!user.isOtpVerified) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpHash = await bcrypt.hash(otp, 10);
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            user.otp = otpHash;
            user.otpExpiry = otpExpiry;
            await user.save();

            console.log(`🔐 OTP re-sent for ${email}: ${otp}`);
            await sendOtpEmail(user.email, otp);

            res.cookie('otpPending', 'true', getCookieOptions(10 * 60 * 1000));

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

        // ✅ Issue JWT
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const cookieOptions = getCookieOptions(7 * 24 * 60 * 60 * 1000);

        // Token cookie
        res.cookie('token', token, cookieOptions);

        // User session cookie (frontend accessible)
        res.cookie('user_session', 'true', {
            ...cookieOptions,
            httpOnly: false,
        });

        // User gender cookie (frontend accessible)
        res.cookie('user_gender', user.gender || '', {
            ...cookieOptions,
            httpOnly: false,
        });

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



exports.logout = (req, res) => {
  clearCookieWithSharedOptions(res, 'token');
  clearCookieWithSharedOptions(res, 'user_session', { httpOnly: false });
  clearCookieWithSharedOptions(res, 'user_gender', { httpOnly: false });
  clearCookieWithSharedOptions(res, 'otpPending');

  res.status(200).json({ message: 'Logged out successfully' });
};


