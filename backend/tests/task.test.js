import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import app from '../app.js';
import connectDB, { disconnectDB } from '../config/db.js';

let server;
let baseUrl;

describe('FlowLock Express Backend API Tests', () => {
  before(async () => {
    // Connect to test database or local DB
    await connectDB();
    
    // Start temporary test server on random open port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        console.log(`[Test Suite] Test server running on ${baseUrl}`);
        resolve();
      });
    });

    // Reset workspace to deterministic demo state for testing
    await fetch(`${baseUrl}/api/tasks/reset-demo`, { method: 'POST' });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    await disconnectDB();
  });

  test('1. Health Endpoint Check (GET /api/health)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.status, 'OK');
    assert.equal(body.database.connected, true);
  });

  test('2. Seed & Fetch All Tasks (GET /api/tasks)', async () => {
    const res = await fetch(`${baseUrl}/api/tasks`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.tasks));
    assert.ok(body.tasks.length >= 10, 'Expected at least 10 demo tasks');

    // Verify task-7 is initially locked because task-5 is In Progress
    const task7 = body.tasks.find(t => t.id === 'task-7');
    assert.ok(task7, 'task-7 should exist');
    assert.equal(task7.locked, true, 'task-7 should be locked');
  });

  test('3. Fetch Single Task By ID (GET /api/tasks/:id)', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/task-1`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, 'task-1');
    assert.equal(body.data.title, 'Project Requirements & Planning');
  });

  test('4. Fetch Non-Existent Task Returns 404 (GET /api/tasks/:id)', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/non-existent-task-9999`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('not found'));
  });

  test('5. Reject Task Creation With Missing Title (POST /api/tasks)', async () => {
    const res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', status: 'Todo' })
    });
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('title is required'));
  });

  test('6. Reject Task Creation With Invalid Dependency Reference (POST /api/tasks)', async () => {
    const res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task with ghost dependency',
        status: 'Todo',
        dependsOn: ['fake-non-existent-id']
      })
    });
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('Invalid dependency reference'));
  });

  test('7. Successfully Create a Valid Task (POST /api/tasks)', async () => {
    const testTaskId = `task-test-${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testTaskId,
        title: 'Automated Integration Test Task',
        description: 'Verifying end-to-end task creation via API',
        status: 'Todo',
        priority: 'High',
        assignee: 'Tester',
        dependsOn: ['task-1'] // task-1 is Done, so new task will NOT be locked
      })
    });
    assert.equal(res.status, 201);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.id, testTaskId);
    assert.equal(body.data.locked, false);
  });

  test('8. Anti-Cheat: Reject Moving Locked Task to In Progress (PATCH /api/tasks/:id)', async () => {
    // task-7 is locked because task-5 is In Progress
    const res = await fetch(`${baseUrl}/api/tasks/task-7`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'In Progress' })
    });
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('is locked') || body.message.includes('blocking dependencies'));
  });

  test('9. Circular Dependency: Reject Self-Dependency (PATCH /api/tasks/:id)', async () => {
    const res = await fetch(`${baseUrl}/api/tasks/task-2`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dependsOn: ['task-2'] })
    });
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('cannot depend on itself'));
  });

  test('10. Circular Dependency: Reject Cycle Chain (PATCH /api/tasks/:id)', async () => {
    // task-1 -> []
    // task-2 depends on task-1
    // If task-1 attempts to depend on task-2: cycle task-1 -> task-2 -> task-1
    const res = await fetch(`${baseUrl}/api/tasks/task-1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dependsOn: ['task-2'] })
    });
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('Circular dependency detected'));
  });

  test('11. Delete Guard: Require Confirmation When Deleting Dependency (DELETE /api/tasks/:id)', async () => {
    // task-1 is depended on by task-2
    const res = await fetch(`${baseUrl}/api/tasks/task-1`);
    const initialTask = await res.json();

    const deleteRes = await fetch(`${baseUrl}/api/tasks/task-1`, { method: 'DELETE' });
    assert.equal(deleteRes.status, 409);

    const body = await deleteRes.json();
    assert.equal(body.success, false);
    assert.equal(body.requiresConfirmation, true);
    assert.ok(body.dependentCount > 0);
  });

  test('12. Force Delete Task & Clean Up References (DELETE /api/tasks/:id?force=true)', async () => {
    // Create temporary task and dependent
    const parentId = `task-del-parent-${Date.now()}`;
    const childId = `task-del-child-${Date.now()}`;

    await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parentId, title: 'Temporary Parent' })
    });

    await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: childId, title: 'Temporary Child', dependsOn: [parentId] })
    });

    // Force delete parent
    const delRes = await fetch(`${baseUrl}/api/tasks/${parentId}?force=true`, { method: 'DELETE' });
    assert.equal(delRes.status, 200);

    // Verify child no longer references parentId
    const childRes = await fetch(`${baseUrl}/api/tasks/${childId}`);
    const childBody = await childRes.json();
    assert.ok(!childBody.data.dependsOn.includes(parentId));

    // Cleanup child
    await fetch(`${baseUrl}/api/tasks/${childId}?force=true`, { method: 'DELETE' });
  });

  test('13. Activity Log Tracking (GET /api/activity)', async () => {
    const res = await fetch(`${baseUrl}/api/activity`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.activities));
    assert.ok(body.activities.length > 0, 'Activity log should contain recorded events');
  });
});
