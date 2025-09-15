// controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const User = require('../models/User');

// const IS_PROD = process.env.NODE_ENV === 'production';

// ===== Required ENV =====
// GOOGLE_CLIENT_ID
// GOOGLE_CLIENT_SECRET
// API_BASE_URL              e.g., https://api.mosaicbizhub.com
// FRONTEND_URL              e.g., https://app.mosaicbizhub.com
// JWT_SECRET
//
// ===== Cookie behavior (same pattern as your login route) =====
// Dev:    SameSite=strict, Secure=false, no Domain
// Prod:   SameSite=None,   Secure=true,  Domain=.mosaicbizhub.com
//
// ===== Optional: profile completion (collect mobile/minorityType after Google) =====
// REQUIRE_PROFILE_COMPLETION=true|false
// TEMP_COOKIE_NAME=mbh_tmp
// TEMP_COOKIE_TTL_SEC=900

const IS_PROD = false; // force dev behavior

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    // For localhost:
    API_BASE_URL = 'http://localhost:8080',
    FRONTEND_URL = 'http://localhost:3000',
    JWT_SECRET,

    // === Cookie flags for localhost ===
    // no domain, not secure, SameSite=strict
    COOKIE_DOMAIN = undefined,
    COOKIE_SAMESITE = 'strict',
    COOKIE_SECURE = false,

    // profile completion (optional)
    REQUIRE_PROFILE_COMPLETION = 'false',
    TEMP_COOKIE_NAME = 'mbh_tmp',
    TEMP_COOKIE_TTL_SEC = 15 * 60,
} = process.env;

// fixed cookie names
const TOKEN_COOKIE_NAME = 'token';
const USER_SESSION_COOKIE_NAME = 'user_session';
const USER_GENDER_COOKIE_NAME = 'user_gender';


if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !API_BASE_URL || !FRONTEND_URL || !JWT_SECRET) {
    throw new Error('Missing env: GOOGLE_CLIENT_ID/SECRET, API_BASE_URL, FRONTEND_URL, JWT_SECRET');
}

const oauth = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${API_BASE_URL}/api/auth/google/callback`
);

// cookie helper (cookie.serialize uses seconds for maxAge)
function setCookie(res, name, val, opts = {}) {
    const cookieStr = cookie.serialize(name, val, {
        httpOnly: true,           // default; can be overridden by opts.httpOnly
        secure: false,            // localhost
        sameSite: 'strict',       // localhost
        domain: undefined,        // localhost
        path: '/',
        ...opts,                  // e.g., { httpOnly:false, maxAge: ... }
    });

    const prev = res.getHeader('Set-Cookie');
    if (!prev) {
        res.setHeader('Set-Cookie', cookieStr);
    } else if (Array.isArray(prev)) {
        res.setHeader('Set-Cookie', [...prev, cookieStr]);
    } else {
        res.setHeader('Set-Cookie', [prev, cookieStr]);
    }
}


function clearCookie(res, name) {
    setCookie(res, name, '', { maxAge: 0 });
}

function mintSessionJWT(user) {
    // short-lived session token (1h)
    return jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

// set token + user_session + user_gender (7d default)
function setAuthCookies(res, user, sessionJwt, ttlSeconds = 7 * 24 * 60 * 60) {
    // 1) token: HttpOnly
    setCookie(res, TOKEN_COOKIE_NAME, sessionJwt, {
        httpOnly: true,
        maxAge: ttlSeconds,
    });
    // 2) user_session: readable
    setCookie(res, USER_SESSION_COOKIE_NAME, 'true', {
        httpOnly: false,
        maxAge: ttlSeconds,
    });
    // 3) user_gender: readable
    setCookie(res, USER_GENDER_COOKIE_NAME, user.gender || 'male', {
        httpOnly: false,
        maxAge: ttlSeconds,
    });
}

/**
 * GET /api/auth/google
 * q: role=business_owner|customer
 * q: redirect=<absolute URL to send user back to>
 */
exports.startGoogleAuth = (req, res) => {
    const role = (req.query.role || 'customer').toString();
    const redirect = (req.query.redirect || FRONTEND_URL).toString();
    const state = Buffer.from(JSON.stringify({ role, redirect })).toString('base64');

    const url = oauth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['openid', 'email', 'profile'],
        state,
    });

    return res.redirect(url);
};

/**
 * GET /api/auth/google/callback
 * Verify, upsert user, set cookies with same flags as login, redirect back
 */
exports.handleGoogleCallback = async (req, res) => {
    try {
        const code = String(req.query.code || '');
        const rawState = String(req.query.state || '');
        const { role, redirect } = JSON.parse(Buffer.from(rawState, 'base64').toString());

        const { tokens } = await oauth.getToken(code);
        const idToken = tokens.id_token;
        if (!idToken) return res.redirect(`${FRONTEND_URL}?error=no_id_token`);

        const ticket = await oauth.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload?.email) return res.redirect(`${FRONTEND_URL}?error=no_email_from_google`);

        const googleId = payload.sub;
        const email = payload.email.toLowerCase();
        const name = payload.name || email.split('@')[0];
        const profileImage = payload.picture;

        // upsert by google id or email
        let user = await User.findOne({ $or: [{ provider: 'google', providerId: googleId }, { email }] });

        if (!user) {
            user = await User.create({
                name,
                email,
                profileImage,
                role: role === 'business_owner' ? 'business_owner' : 'customer',
                provider: 'google',
                providerId: googleId,
                isOtpVerified: true,
            });
        } else {
            user.provider = 'google';
            user.providerId = googleId;
            if (!user.profileImage && profileImage) user.profileImage = profileImage;
            if (['customer', 'business_owner'].includes(role) && user.role !== 'admin') {
                user.role = role;
            }
            await user.save();
        }

        if (user.isBlocked || user.isDeleted) {
            return res.redirect(`${FRONTEND_URL}?error=account_restricted`);
        }

        // (optional) if you must collect mobile/minorityType first
        const mustComplete =
            String(REQUIRE_PROFILE_COMPLETION).toLowerCase() === 'true' &&
            (!user.mobile || !user.minorityType);

        if (mustComplete) {
            const tmp = jwt.sign(
                { sub: user._id.toString(), email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: Math.max(60, Number(TEMP_COOKIE_TTL_SEC) || 900) }
            );
            setCookie(res, TEMP_COOKIE_NAME, tmp, {
                httpOnly: true,
                maxAge: Number(TEMP_COOKIE_TTL_SEC) || 900,
            });
            return res.redirect(`${FRONTEND_URL}/complete-profile`);
        }

        // set the three cookies the same way as your login route
        const session = mintSessionJWT(user);
        setAuthCookies(res, user, session);

        return res.redirect(redirect || FRONTEND_URL);
    } catch (err) {
        console.error('Google OAuth callback error:', err);
        return res.redirect(`${FRONTEND_URL}?error=google_login_failed`);
    }
};

/**
 * POST /api/auth/google/complete
 * Body: { mobile: string, minorityType?: string }
 * Finalize profile, then set cookies (same flags as login)
 */
exports.completeGoogleProfile = async (req, res) => {
    try {
        const tmpToken = req.cookies?.[TEMP_COOKIE_NAME];
        if (!tmpToken) {
            return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(tmpToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
        }

        const { mobile, minorityType } = req.body || {};
        if (!mobile || !String(mobile).trim()) {
            return res.status(400).json({ success: false, message: 'Mobile number is required.' });
        }

        const user = await User.findById(decoded.sub);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        if (!user.mobile) user.mobile = String(mobile).trim();
        if (minorityType && !user.minorityType) user.minorityType = minorityType;
        await user.save();

        clearCookie(res, TEMP_COOKIE_NAME);

        const session = mintSessionJWT(user);
        setAuthCookies(res, user, session);

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                gender: user.gender,
                profileImage: user.profileImage,
                mobile: user.mobile,
                minorityType: user.minorityType,
            },
        });
    } catch (err) {
        console.error('Complete profile error:', err);
        res.status(500).json({ success: false, message: 'Unable to complete profile' });
    }
};

/** Optional: logout — clears all three cookies + temp */
exports.logout = async (_req, res) => {
    clearCookie(res, TOKEN_COOKIE_NAME);
    clearCookie(res, USER_SESSION_COOKIE_NAME);
    clearCookie(res, USER_GENDER_COOKIE_NAME);
    clearCookie(res, TEMP_COOKIE_NAME);
    res.json({ success: true });
};
