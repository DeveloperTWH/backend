const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const Module = require('node:module');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const userControllerPath = path.resolve(__dirname, '../../controllers/userController.js');
const authenticatePath = path.resolve(__dirname, '../../middlewares/authenticate.js');

function withMocks(modulePath, mocks) {
  const originalLoad = Module._load;

  Module._load = function mockLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[modulePath];
  const loadedModule = require(modulePath);
  Module._load = originalLoad;

  return loadedModule;
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    clearedCookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    clearCookie(name) {
      this.clearedCookies.push(name);
      return this;
    },
  };
}

test('resetPassword increments sessionVersion so older JWT sessions can be invalidated', async () => {
  const user = {
    _id: 'user-1',
    email: 'vendor@example.com',
    role: 'customer',
    resetPasswordOtp: 'hashed-reset-otp',
    resetPasswordOtpExpiry: new Date(Date.now() + 60_000),
    passwordHash: 'old-hash',
    sessionVersion: 0,
    isDeleted: false,
    isBlocked: false,
    saveCalls: 0,
    async save() {
      this.saveCalls += 1;
    },
  };

  const userController = withMocks(userControllerPath, {
    '../models/User': {
      findOne: async ({ email }) => (email === user.email ? user : null),
    },
    bcryptjs: {
      compare: async (plain, hashed) => plain === '654321' && hashed === user.resetPasswordOtp,
      hash: async (value) => `hashed:${value}`,
    },
    'express-validator': {
      validationResult: () => ({ isEmpty: () => true, array: () => [] }),
    },
    '../utils/mailer': {
      sendOtpEmail: async () => {},
      sendWelcomeEmail: async () => {},
      sendPasswordResetOtpEmail: async () => {},
    },
    '../utils/cookieHelper': {
      getCookieOptions: () => ({}),
      clearCookie: () => {},
      setAuthCookies: () => {},
      clearAuthCookies: () => {},
    },
  });

  const req = {
    body: {
      email: 'vendor@example.com',
      otp: '654321',
      newPassword: 'NewPass123!',
    },
  };
  const res = createResponse();

  await userController.resetPassword(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(user.passwordHash, 'hashed:NewPass123!');
  assert.equal(user.sessionVersion, 1);
  assert.equal(user.resetPasswordOtp, undefined);
  assert.equal(user.resetPasswordOtpExpiry, undefined);
  assert.equal(user.saveCalls, 1);
});

test('authenticate rejects JWTs created before a password reset bumps sessionVersion', async () => {
  const oldToken = jwt.sign(
    { userId: 'user-2', role: 'customer', sessionVersion: 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const authenticate = withMocks(authenticatePath, {
    '../models/User': {
      findById: async () => ({
        _id: 'user-2',
        role: 'customer',
        sessionVersion: 1,
      }),
    },
    '../utils/cookieHelper': {
      clearAuthCookies: (res) => {
        res.clearCookie('token');
        res.clearCookie('user_session');
        res.clearCookie('user_gender');
      },
    },
  });

  const req = {
    headers: {},
    cookies: { token: oldToken },
  };
  const res = createResponse();
  let calledNext = false;

  await authenticate(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.message, 'Session expired. Please log in again.');
  assert.deepEqual(res.clearedCookies, ['token', 'user_session', 'user_gender']);
});

test('authenticate accepts JWTs whose sessionVersion matches the user record', async () => {
  const currentToken = jwt.sign(
    { userId: 'user-3', role: 'customer', sessionVersion: 2 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  const user = {
    _id: 'user-3',
    role: 'customer',
    sessionVersion: 2,
  };

  const authenticate = withMocks(authenticatePath, {
    '../models/User': {
      findById: async () => user,
    },
    '../utils/cookieHelper': {
      clearAuthCookies: () => {},
    },
  });

  const req = {
    headers: {
      authorization: `Bearer ${currentToken}`,
    },
    cookies: {},
  };
  const res = createResponse();
  let calledNext = false;

  await authenticate(req, res, () => {
    calledNext = true;
  });

  assert.equal(calledNext, true);
  assert.equal(req.user, user);
  assert.equal(res.statusCode, null);
});
