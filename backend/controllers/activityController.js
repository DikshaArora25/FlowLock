import Activity from '../models/Activity.js';

/**
 * @desc   Get activity log
 * @route  GET /api/activity
 */
export const getActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(limit);

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
      activities: activities
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
