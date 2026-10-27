import Activity from '../models/Activity.js';

/**
 * @desc   Get activity log with filtering, search, and pagination
 * @route  GET /api/activity
 */
export const getActivity = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by activity type
    if (req.query.type && req.query.type !== 'all') {
      query.type = req.query.type;
    }

    // Text search in activity description
    if (req.query.search && req.query.search.trim() !== '') {
      query.text = { $regex: req.query.search.trim(), $options: 'i' };
    }

    const total = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: activities.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: activities,
      activities: activities
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get summary statistics of workspace activities
 * @route  GET /api/activity/stats
 */
export const getActivityStats = async (req, res, next) => {
  try {
    const total = await Activity.countDocuments();
    const typeBreakdownRaw = await Activity.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const byType = {
      info: 0,
      move: 0,
      unlock: 0,
      blocked: 0,
      add: 0,
      edit: 0,
      delete: 0,
      system: 0
    };

    typeBreakdownRaw.forEach(item => {
      if (item._id && byType.hasOwnProperty(item._id)) {
        byType[item._id] = item.count;
      }
    });

    const latest = await Activity.findOne().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        total,
        byType,
        latest: latest || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Record an activity event
 * @route  POST /api/activity
 */
export const addActivity = async (req, res, next) => {
  try {
    const { text, type = 'info' } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Activity text is required.'
      });
    }

    const activityId = `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newActivity = await Activity.create({
      id: activityId,
      text: text.trim(),
      type,
      timestamp
    });

    res.status(201).json({
      success: true,
      data: newActivity,
      activity: newActivity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Clear activity log
 * @route  DELETE /api/activity
 */
export const clearActivity = async (req, res, next) => {
  try {
    await Activity.deleteMany({});
    res.status(200).json({
      success: true,
      message: 'Activity log cleared successfully.'
    });
  } catch (error) {
    next(error);
  }
};
