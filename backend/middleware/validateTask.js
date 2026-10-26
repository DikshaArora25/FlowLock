/**
 * Task Input Validation Middleware
 */

const VALID_STATUSES = ['Backlog', 'Todo', 'In Progress', 'Done'];
const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

export const validateCreateTask = (req, res, next) => {
  const { title, status, priority, dependsOn } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Task title is required and cannot be empty.'
    });
  }

  if (title.trim().length > 160) {
    return res.status(400).json({
      success: false,
      message: 'Task title cannot exceed 160 characters.'
    });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status "${status}". Allowed values: ${VALID_STATUSES.join(', ')}`
    });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: `Invalid priority "${priority}". Allowed values: ${VALID_PRIORITIES.join(', ')}`
    });
  }

  if (dependsOn !== undefined && !Array.isArray(dependsOn)) {
    return res.status(400).json({
      success: false,
      message: 'dependsOn must be an array of task IDs.'
    });
  }

  next();
};

export const validateUpdateTask = (req, res, next) => {
  const { title, status, priority, dependsOn } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Task title cannot be empty.'
      });
    }
    if (title.trim().length > 160) {
      return res.status(400).json({
        success: false,
        message: 'Task title cannot exceed 160 characters.'
      });
    }
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status "${status}". Allowed values: ${VALID_STATUSES.join(', ')}`
    });
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: `Invalid priority "${priority}". Allowed values: ${VALID_PRIORITIES.join(', ')}`
    });
  }

  if (dependsOn !== undefined && !Array.isArray(dependsOn)) {
    return res.status(400).json({
      success: false,
      message: 'dependsOn must be an array of task IDs.'
    });
  }

  next();
};
