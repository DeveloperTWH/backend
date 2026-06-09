const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { clearAuthCookies } = require('../utils/cookieHelper');

function deny(res, message, { clearCookies = false } = {}) {
  if (clearCookies) {
    clearAuthCookies(res);
  }

  return res.status(401).json({
    success: false,
    message,
  });
}

module.exports = async (req, res, next) => {
  const bearerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : undefined;
  const cookieToken = req.cookies?.token;
  const token = bearerToken || cookieToken;

  if (!token) {
    return deny(res, 'Authentication required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.sub;

    if (!userId) {
      return deny(res, 'Invalid authentication token', { clearCookies: Boolean(cookieToken) });
    }

    const user = await User.findById(userId);
    if (!user) {
      return deny(res, 'Authenticated user not found', { clearCookies: Boolean(cookieToken) });
    }

    const tokenSessionVersion = Number.isInteger(decoded.sessionVersion)
      ? decoded.sessionVersion
      : 0;
    const currentSessionVersion = user.sessionVersion || 0;

    if (tokenSessionVersion !== currentSessionVersion) {
      return deny(res, 'Session expired. Please log in again.', { clearCookies: Boolean(cookieToken) });
    }

    req.user = user;
    next();
  } catch (err) {
    return deny(res, 'Invalid or expired authentication token', { clearCookies: Boolean(cookieToken) });
  }
};
