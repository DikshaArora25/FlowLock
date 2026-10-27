import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import app from '../app.js';
import connectDB, { disconnectDB } from '../config/db.js';
import User from '../models/User.js';

let server;
let baseUrl;

const TEST_USER = {
  name: 'Test Engineer',
  email: `test-${Date.now()}@flowlock.test`,
  password: 'Password123!',
  role: 'Senior Developer'
};
const RACE_USER = {
  name: 'Concurrent Signup',
  email: `race-${Date.now()}@flowlock.test`,
  password: 'Password123!',
  role: 'Software Engineer'
};

let authToken = '';

describe('FlowLock Authentication API Tests', () => {
  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`[Auth Test Suite] Test server running on ${baseUrl}`);
        resolve();
      });
    });

    await User.deleteMany({
      email: { $in: [TEST_USER.email.toLowerCase(), RACE_USER.email.toLowerCase()] }
    });
  });

  after(async () => {
    await User.deleteMany({
      email: { $in: [TEST_USER.email.toLowerCase(), RACE_USER.email.toLowerCase()] }
    });

    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await disconnectDB();
  });

  test('1. Reject signup with missing required fields (POST /api/auth/signup)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'incomplete@flowlock.test' })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message);
  });

  test('2. Reject signup with invalid email format (POST /api/auth/signup)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'Password123!'
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('3. Reject signup with weak password (POST /api/auth/signup)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Pw User',
        email: 'weak@flowlock.test',
        password: 'weak'
      })
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('3a. Reject signup fields outside model limits or with invalid types', async () => {
    const invalidUsers = [
      { ...TEST_USER, name: 'N'.repeat(81) },
      { ...TEST_USER, role: { name: 'Engineer' } },
      { ...TEST_USER, email: `${'a'.repeat(250)}@x.co` },
      { ...TEST_USER, password: `Abcdef1!${'💥'.repeat(17)}` }
    ];

    for (const user of invalidUsers) {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });

      assert.equal(res.status, 400);
      assert.equal((await res.json()).success, false);
    }
  });

  test('4. Successfully register a new user and return JWT (POST /api/auth/signup)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    assert.equal(res.status, 201);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.ok(body.token, 'Response should contain a JWT token');
    assert.ok(body.user, 'Response should contain user profile');
    assert.equal(body.user.email, TEST_USER.email.toLowerCase());
    assert.equal(body.user.name, TEST_USER.name);
    assert.equal(body.user.role, TEST_USER.role);
    assert.equal(body.user.password, undefined, 'Password hash must NEVER be exposed');
    assert.equal(body.user.passwordHash, undefined, 'Password hash aliases must never be exposed');

    // Verify in MongoDB that password was actually hashed with bcrypt
    const dbUser = await User.findOne({ email: TEST_USER.email.toLowerCase() }).select('+password');
    assert.ok(dbUser);
    assert.notEqual(dbUser.password, TEST_USER.password, 'Password must not be stored in plaintext');
    assert.ok(dbUser.password.startsWith('$2'), 'Password should be a valid bcrypt hash');
  });

  test('5. Reject duplicate email registration (POST /api/auth/signup)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('already exists'));
  });

  test('5a. Treat email addresses as case-insensitive during duplicate registration', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...TEST_USER, email: TEST_USER.email.toUpperCase() })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('5b. Return conflict when concurrent signups race on a unique email', async () => {
    const requests = Array.from({ length: 2 }, () => fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(RACE_USER)
    }));
    const responses = await Promise.all(requests);

    assert.deepEqual(responses.map(response => response.status).sort((a, b) => a - b), [201, 409]);
  });

  test('6. Reject login with non-existent email (POST /api/auth/login)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ghost@flowlock.test',
        password: 'Password123!'
      })
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('7. Reject login with wrong password (POST /api/auth/login)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email.toUpperCase(),
        password: 'WrongPassword999!'
      })
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('7a. Do not normalize whitespace in passwords or coerce non-string values', async () => {
    const wrongPassword = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: `${TEST_USER.password} `
      })
    });
    assert.equal(wrongPassword.status, 401);

    const invalidPassword = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_USER.email, password: 12345 })
    });
    assert.equal(invalidPassword.status, 400);
    assert.equal((await invalidPassword.json()).success, false);
  });

  test('8. Successfully login and return JWT token (POST /api/auth/login)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.success, true);
    assert.ok(body.token);
    assert.equal(body.user.email, TEST_USER.email.toLowerCase());
    assert.equal(body.user.password, undefined);

    authToken = body.token;
  });

  test('9. Protected route rejects request with no token (GET /api/auth/me)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('10. Protected route rejects request with invalid token (GET /api/auth/me)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer fake.invalid.jwt.token' }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('11. Protected route accepts valid JWT and returns profile (GET /api/auth/me)', async () => {
    assert.ok(authToken, 'authToken should have been captured in step 8');

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.email, TEST_USER.email.toLowerCase());
    assert.equal(body.user.name, TEST_USER.name);
    assert.equal(body.user.password, undefined);
  });
});
