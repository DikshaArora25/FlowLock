import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import app from '../app.js';
import connectDB, { disconnectDB } from '../config/db.js';
import User from '../models/User.js';

let server;
let baseUrl;
let authToken = '';

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

describe('FlowLock Authentication API Tests', () => {
  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
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
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  test('reject signup with missing required fields', async () => {
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

  test('reject signup with invalid email format', async () => {
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
    assert.equal((await res.json()).success, false);
  });

  test('reject signup with weak password', async () => {
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
    assert.equal((await res.json()).success, false);
  });

  test('register a new user and return JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.token, 'Response should contain a JWT token');
    assert.ok(body.user);
    assert.equal(body.user.email, TEST_USER.email.toLowerCase());
    assert.equal(body.user.name, TEST_USER.name);
    assert.equal(body.user.role, TEST_USER.role);
    assert.equal(body.user.password, undefined);

    const dbUser = await User.findOne({ email: TEST_USER.email.toLowerCase() }).select('+password');
    assert.ok(dbUser);
    assert.notEqual(dbUser.password, TEST_USER.password);
    assert.ok(dbUser.password.startsWith('$2'));
  });

  test('reject duplicate email registration', async () => {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    assert.equal(res.status, 409);
    assert.equal((await res.json()).success, false);
  });

  test('reject login with non-existent email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@flowlock.test', password: 'Password123!' })
    });

    assert.equal(res.status, 401);
    assert.equal((await res.json()).success, false);
  });

  test('reject login with wrong password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: 'WrongPassword999!'
      })
    });

    assert.equal(res.status, 401);
    assert.equal((await res.json()).success, false);
  });

  test('login successfully and return JWT', async () => {
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

  test('reject unauthenticated access to protected route', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
    assert.equal((await res.json()).success, false);
  });

  test('reject invalid JWTs on protected route', async () => {
    const invalidTokens = [
      jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: -1 }),
      jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET),
      jwt.sign({ sub: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
      jwt.sign({ id: 'not-an-object-id' }, process.env.JWT_SECRET, { expiresIn: '1h' }),
      jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: '1h', algorithm: 'HS384' })
    ];

    for (const token of invalidTokens) {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(res.status, 401);
      assert.equal((await res.json()).success, false);
    }
  });

  test('accept valid JWT and return current user profile', async () => {
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

  test('update profile via PUT /api/auth/profile', async () => {
    const res = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ name: 'Updated Engineer', role: 'Staff Engineer' })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.name, 'Updated Engineer');
    assert.equal(body.user.role, 'Staff Engineer');
  });

  test('change password and verify the new password works', async () => {
    const newPassword = 'NewSecretPassword99!';
    const res = await fetch(`${baseUrl}/api/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        currentPassword: TEST_USER.password,
        newPassword
      })
    });

    assert.equal(res.status, 200);
    assert.equal((await res.json()).success, true);

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_USER.email, password: newPassword })
    });

    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.equal(loginBody.success, true);
    assert.ok(loginBody.token);
    authToken = loginBody.token;
  });

  test('return conflict when concurrent signups race on a unique email', async () => {
    const requests = Array.from({ length: 2 }, () => fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(RACE_USER)
    }));

    const responses = await Promise.all(requests);
    assert.deepEqual(responses.map((response) => response.status).sort((a, b) => a - b), [201, 409]);
  });
});
