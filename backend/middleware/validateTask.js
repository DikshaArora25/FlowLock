/**
 * Task Input Validation Middleware
 */

const VALID_STATUSES = ['Backlog', 'Todo', 'In Progress', 'Done'];
const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
const MAX_TITLE_LENGTH = 160;

const sendValidationError = (res, message) =>
  res.status(400).json({ success: false, message });

const validateTitle = (title, res, required = false) => {
  if (title === undefined && !required) return true;

  if (typeof title !== 'string' || title.trim().length === 0) {
    sendValidationError(
      res,
      required
        ? 'Task title is required and cannot be empty.'
        : 'Task title cannot be empty.'
    );
    return false;
  }

  if (title.trim().length > MAX_TITLE_LENGTH) {
    sendValidationError(res, 'Task title cannot exceed 160 characters.');
    return false;
  }

  return true;
};

const validateFields = (body, res) => {
  const { status, priority, dependsOn } = body;

  if (
    status !== undefined &&
    !VALID_STATUSES.includes(status)
  ) {
    sendValidationError(
      res,
      `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`
    );
    return false;
  }

  if (
    priority !== undefined &&
    !VALID_PRIORITIES.includes(priority)
  ) {
    sendValidationError(
      res,
      `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`
    );
    return false;
  }

  if (dependsOn !== undefined) {
    if (
      !Array.isArray(dependsOn) ||
      !dependsOn.every(
        (id) => typeof id === 'string' && id.trim().length > 0
      )
    ) {
      sendValidationError(
        res,
        'dependsOn must be an array of non-empty task ID strings.'
      );
      return false;
    }
  }

  return true;
};

export const validateCreateTask = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return sendValidationError(res, 'Request body must be a JSON object.');
  }

  if (!validateTitle(req.body.title, res, true)) return;
  if (!validateFields(req.body, res)) return;

  next();
};

export const validateUpdateTask = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return sendValidationError(res, 'Request body must be a JSON object.');
  }

  if (!validateTitle(req.body.title, res)) return;
  if (!validateFields(req.body, res)) return;

  next();
};
