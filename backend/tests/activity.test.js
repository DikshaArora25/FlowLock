import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Activity from '../models/Activity.js';
import { getActivity, getActivityStats, addActivity, clearActivity } from '../controllers/activityController.js';

describe('Activity Model Unit Tests (In-Memory Validation)', () => {
  test('Activity model should validate required text', async () => {
    const act = new Activity({
      id: 'act-test-1',
      type: 'info'
    });
    
    let error;
    try {
      await act.validate();
    } catch (err) {
      error = err;
    }
    assert.ok(error, 'Should have failed validation without text');
    assert.ok(error.errors.text, 'Should have validation error on text');
  });

  test('Activity model accepts valid types', async () => {
    const validTypes = ['info', 'move', 'unlock', 'blocked', 'add', 'edit', 'delete', 'system'];
    for (const type of validTypes) {
      const act = new Activity({
        id: `act-valid-${type}`,
        text: `Activity for ${type}`,
        type
      });
      await act.validate();
      assert.equal(act.type, type);
    }
  });

  test('Activity model rejects invalid type enum', async () => {
    const act = new Activity({
      id: 'act-invalid-type',
      text: 'Invalid type activity',
      type: 'unsupported_type_xyz'
    });

    let error;
    try {
      await act.validate();
    } catch (err) {
      error = err;
    }
    assert.ok(error, 'Should reject invalid enum type');
    assert.ok(error.errors.type);
  });
});

describe('Activity Controller Unit Tests', () => {
  test('addActivity returns 400 when text is missing', async () => {
    const req = { body: { type: 'move' } };
    let statusCode = null;
    let jsonBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      }
    };
    const next = () => {};

    await addActivity(req, res, next);

    assert.equal(statusCode, 400);
    assert.equal(jsonBody.success, false);
    assert.equal(jsonBody.message, 'Activity text is required.');
  });

  test('addActivity returns 400 when text is only whitespace', async () => {
    const req = { body: { text: '   ' } };
    let statusCode = null;
    let jsonBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      }
    };
    const next = () => {};

    await addActivity(req, res, next);

    assert.equal(statusCode, 400);
    assert.equal(jsonBody.success, false);
    assert.equal(jsonBody.message, 'Activity text is required.');
  });

  test('getActivity handles pagination, search, and type query params correctly', async () => {
    // Stub Activity.countDocuments and Activity.find
    const originalCount = Activity.countDocuments;
    const originalFind = Activity.find;

    let capturedQuery = null;
    let capturedSkip = null;
    let capturedLimit = null;

    Activity.countDocuments = async (query) => {
      capturedQuery = query;
      return 15;
    };

    Activity.find = (query) => {
      return {
        sort: () => ({
          skip: (skipVal) => ({
            limit: async (limitVal) => {
              capturedSkip = skipVal;
              capturedLimit = limitVal;
              return [
                { id: 'act-1', text: 'Task moved', type: 'move', createdAt: new Date() }
              ];
            }
          })
        })
      };
    };

    try {
      const req = {
        query: {
          type: 'move',
          search: 'moved',
          page: '2',
          limit: '10'
        }
      };
      let statusCode = null;
      let jsonBody = null;

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        }
      };

      await getActivity(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(jsonBody.total, 15);
      assert.equal(jsonBody.page, 2);
      assert.equal(jsonBody.totalPages, 2);
      assert.equal(capturedQuery.type, 'move');
      assert.ok(capturedQuery.text.$regex.includes('moved'));
      assert.equal(capturedSkip, 10);
      assert.equal(capturedLimit, 10);
    } finally {
      Activity.countDocuments = originalCount;
      Activity.find = originalFind;
    }
  });

  test('getActivityStats aggregates activity counts by type', async () => {
    const originalCount = Activity.countDocuments;
    const originalAggregate = Activity.aggregate;
    const originalFindOne = Activity.findOne;

    Activity.countDocuments = async () => 24;
    Activity.aggregate = async () => [
      { _id: 'move', count: 10 },
      { _id: 'unlock', count: 5 },
      { _id: 'blocked', count: 3 },
      { _id: 'add', count: 6 }
    ];
    Activity.findOne = () => ({
      sort: async () => ({ id: 'act-latest', text: 'Latest event', type: 'move' })
    });

    try {
      const req = {};
      let statusCode = null;
      let jsonBody = null;

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        }
      };

      await getActivityStats(req, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.equal(jsonBody.data.total, 24);
      assert.equal(jsonBody.data.byType.move, 10);
      assert.equal(jsonBody.data.byType.unlock, 5);
      assert.equal(jsonBody.data.byType.blocked, 3);
      assert.equal(jsonBody.data.byType.add, 6);
      assert.equal(jsonBody.data.byType.delete, 0);
      assert.equal(jsonBody.data.latest.id, 'act-latest');
    } finally {
      Activity.countDocuments = originalCount;
      Activity.aggregate = originalAggregate;
      Activity.findOne = originalFindOne;
    }
  });
});
