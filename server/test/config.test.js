import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../src/config/env.js';

test('invalid token expiry fails at startup instead of breaking registration', () => {
  const previous = { mongo: process.env.MONGODB_URI, secret: process.env.JWT_SECRET, expiry: process.env.JWT_EXPIRES_IN };
  try {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/interviewready_test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.JWT_EXPIRES_IN = 'NEVER';
    assert.throws(() => getConfig(), /JWT_EXPIRES_IN must be a duration/);
    process.env.JWT_EXPIRES_IN = '7d';
    assert.equal(getConfig().jwtExpiresIn, '7d');
  } finally {
    for (const [key, value] of [['MONGODB_URI', previous.mongo], ['JWT_SECRET', previous.secret], ['JWT_EXPIRES_IN', previous.expiry]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('invalid port and client origin fail at startup', () => {
  const previous = { mongo: process.env.MONGODB_URI, secret: process.env.JWT_SECRET, port: process.env.PORT, origin: process.env.CLIENT_ORIGIN };
  try {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/interviewready_test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.PORT = 'not-a-port';
    assert.throws(() => getConfig(), /PORT must be an integer/);
    process.env.PORT = '5000';
    process.env.CLIENT_ORIGIN = '*';
    assert.throws(() => getConfig(), /CLIENT_ORIGIN must be one http or https origin/);
    process.env.CLIENT_ORIGIN = 'https://example.com';
    assert.equal(getConfig().clientOrigin, 'https://example.com');
  } finally {
    for (const [key, value] of [['MONGODB_URI', previous.mongo], ['JWT_SECRET', previous.secret], ['PORT', previous.port], ['CLIENT_ORIGIN', previous.origin]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
