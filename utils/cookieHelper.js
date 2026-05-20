const isProd = process.env.NODE_ENV === 'production';

function parseBooleanEnv(value, fallback) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

const cookieSecure = parseBooleanEnv(process.env.COOKIE_SECURE, isProd);
const cookieSameSite = process.env.COOKIE_SAMESITE || (cookieSecure ? 'none' : 'lax');
const cookieDomain = process.env.COOKIE_DOMAIN || (isProd ? '.mosaicbizhub.com' : undefined);

function getCookieOptions(maxAge, { httpOnly = true, ...overrides } = {}) {
  return {
    httpOnly,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    domain: cookieDomain,
    path: '/',
    maxAge,
    ...overrides,
  };
}

function setCookie(res, name, value, options = {}) {
  res.cookie(name, value, getCookieOptions(options.maxAge, options));
}

function clearCookie(res, name, options = {}) {
  res.clearCookie(name, getCookieOptions(undefined, options));
}

function setAuthCookies(res, token, user, maxAge) {
  setCookie(res, 'token', token, { maxAge });
  setCookie(res, 'user_session', 'true', { maxAge, httpOnly: false });
  setCookie(res, 'user_gender', user.gender || '', { maxAge, httpOnly: false });
}

function clearAuthCookies(res) {
  clearCookie(res, 'token');
  clearCookie(res, 'user_session', { httpOnly: false });
  clearCookie(res, 'user_gender', { httpOnly: false });
}

module.exports = {
  getCookieOptions,
  setCookie,
  clearCookie,
  setAuthCookies,
  clearAuthCookies,
};
