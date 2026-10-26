import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import {
  detectCycle,
  isTaskLocked,
  recalculateLocks,
  canMoveTask,
  propagateDependencyState,
  getDependentTasks
} from '../services/dependencyEngine.js';
import { INITIAL_DEMO_TASKS } from '../config/seedData.js';

/**
 * Helper to generate unique task string ID matching frontend format
 */
const generateTaskId = (prefix = 'task') => {
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${randomStr}`;
};

/**
 * Helper to log an activity event to MongoDB
 */
const recordActivity = async (text, type = 'info') => {
  try {
    const activityId = `act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    await Activity.create({ id: activityId, text, type, timestamp });
  } catch (err) {
    console.error('[Activity] Failed to record activity:', err.message);
  }
};

/**
 * Helper to find task by custom string ID or MongoDB _id
 */
const findTaskByIdOrCustomId = async (idParam) => {
  let task = await Task.findOne({ id: idParam });
  if (!task && mongoose.Types.ObjectId.isValid(idParam)) {
    task = await Task.findById(idParam);
  }
  return task;
};

/**
 * @desc   Fetch all tasks
 * @route  GET /api/tasks
 */
export const getTasks = async (req, res, next) => {
  try {
    let tasks = await Task.find().sort({ createdAt: 1 });

    // Auto-seed with demo tasks if database is empty
    if (tasks.length === 0) {
      console.log('[Seed] Database empty. Auto-seeding initial demo tasks...');
      const lockedDemoTasks = recalculateLocks(INITIAL_DEMO_TASKS);
      await Task.insertMany(lockedDemoTasks);
      await recordActivity('Workspace initialized with demo project in MongoDB', 'system');
      tasks = await Task.find().sort({ createdAt: 1 });
    }

    // Ensure all locks are up-to-date with current state
    const recalculated = recalculateLocks(tasks);
    const updates = [];
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].locked !== recalculated[i].locked) {
        updates.push(Task.updateOne({ id: tasks[i].id }, { locked: recalculated[i].locked }));
        tasks[i].locked = recalculated[i].locked;
      }
    }
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Support query filtering if specified
    const { search, status, priority, sortBy } = req.query;
    let filtered = [...tasks];

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'all') {
      if (status === 'locked') {
        filtered = filtered.filter(t => t.locked);
      } else {
        filtered = filtered.filter(t => t.status === status);
      }
    }

    if (priority && priority !== 'all') {
      filtered = filtered.filter(t => t.priority === priority);
    }

    if (sortBy) {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      filtered.sort((a, b) => {
        if (sortBy === 'priority') {
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        } else if (sortBy === 'dueDate') {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else if (sortBy === 'dependencies') {
          return (b.dependsOn || []).length - (a.dependsOn || []).length;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
      tasks: filtered
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Fetch single task
 * @route  GET /api/tasks/:id
 */
export const getTaskById = async (req, res, next) => {
  try {
    const task = await findTaskByIdOrCustomId(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with ID: ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: task,
      task: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Create new task
 * @route  POST /api/tasks
 */
export const createTask = async (req, res, next) => {
  try {
    const { title, description, status = 'Todo', priority = 'Medium', assignee, dueDate, dependsOn = [] } = req.body;

    const allTasks = await Task.find();
    const taskId = req.body.id || generateTaskId();

    // 1. Verify invalid dependency references
    if (dependsOn && dependsOn.length > 0) {
      const existingTaskIds = new Set(allTasks.map(t => t.id));
      const invalidDeps = dependsOn.filter(depId => !existingTaskIds.has(depId));
      if (invalidDeps.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid dependency reference(s): ${invalidDeps.join(', ')}. Target dependency task does not exist.`
        });
      }

      // 2. Cycle detection
      const cycleCheck = detectCycle(taskId, dependsOn, allTasks);
      if (cycleCheck.hasCycle) {
        return res.status(400).json({
          success: false,
          message: `Circular dependency detected: ${cycleCheck.cycleChain.join(' → ')}`,
          cycleChain: cycleCheck.cycleChain
        });
      }
    }

    // 3. Determine initial lock status
    const tempTask = { id: taskId, dependsOn, status };
    const locked = isTaskLocked(tempTask, allTasks);

    // Rule: Cannot create a task directly in 'In Progress' or 'Done' if it is locked
    if (locked && (status === 'In Progress' || status === 'Done')) {
      return res.status(400).json({
        success: false,
        message: `Cannot create task "${title.trim()}" directly in "${status}" because its dependencies are not complete.`
      });
    }

    const newTask = await Task.create({
      id: taskId,
      title: title.trim(),
      description: description ? description.trim() : '',
      status,
      priority,
      assignee: assignee ? assignee.trim() : 'Unassigned',
      dueDate: dueDate || '',
      dependsOn,
      locked
    });

    await recordActivity(`Created task "${newTask.title}"`, 'add');

    res.status(201).json({
      success: true,
      data: newTask,
      task: newTask
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update task (fields, status, dependencies)
 * @route  PATCH /api/tasks/:id
 */
export const updateTask = async (req, res, next) => {
  try {
    const task = await findTaskByIdOrCustomId(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with ID: ${req.params.id}`
      });
    }

    const allTasks = await Task.find();
    const { title, description, status, priority, assignee, dueDate, dependsOn } = req.body;

    // 1. Dependency validation & cycle detection
    if (dependsOn !== undefined) {
      if (dependsOn.includes(task.id)) {
        return res.status(400).json({
          success: false,
          message: 'A task cannot depend on itself.'
        });
      }

      const existingTaskIds = new Set(allTasks.map(t => t.id));
      const invalidDeps = dependsOn.filter(depId => !existingTaskIds.has(depId));
      if (invalidDeps.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid dependency reference(s): ${invalidDeps.join(', ')}. Target dependency task does not exist.`
        });
      }

      const cycleCheck = detectCycle(task.id, dependsOn, allTasks);
      if (cycleCheck.hasCycle) {
        return res.status(400).json({
          success: false,
          message: `Circular dependency detected: ${cycleCheck.cycleChain.join(' → ')}`,
          cycleChain: cycleCheck.cycleChain
        });
      }
    }

    // 2. Status transition & workflow anti-cheat rules
    const effectiveStatus = status !== undefined ? status : task.status;
    const effectiveDependsOn = dependsOn !== undefined ? dependsOn : task.dependsOn;

    // Check lock state under proposed changes
    const updatedTaskPreview = {
      ...task.toObject(),
      status: effectiveStatus,
      dependsOn: effectiveDependsOn
    };

    if (status !== undefined && status !== task.status) {
      const validation = canMoveTask(updatedTaskPreview, status, allTasks);
      if (!validation.allowed) {
        await recordActivity(`Blocked: "${task.title}" → ${status} (dependency not met)`, 'blocked');
        return res.status(400).json({
          success: false,
          message: validation.reason,
          blockingTasks: validation.blockingTasks
        });
      }
    }

    // Apply updates
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee.trim();
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (dependsOn !== undefined) task.dependsOn = dependsOn;

    const oldStatus = task.status;
    const statusChanged = status !== undefined && status !== oldStatus;
    if (status !== undefined) task.status = status;

    // Update locked state of this task
    task.locked = isTaskLocked(task, allTasks);

    await task.save();

    // 3. Cascading state propagation down the dependency graph
    const refreshedTasks = await Task.find();
    const propagation = propagateDependencyState(refreshedTasks, task.id);

    // Persist any updated lock statuses across the workspace
    const updatePromises = [];
    for (const t of propagation.tasks) {
      const original = refreshedTasks.find(o => o.id === t.id);
      if (original && original.locked !== t.locked) {
        updatePromises.push(Task.updateOne({ id: t.id }, { locked: t.locked }));
      }
    }
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // Activity logging
    if (statusChanged) {
      await recordActivity(`"${task.title}": ${oldStatus} → ${task.status}`, 'move');
      if (task.status === 'Done') {
        const newlyUnlocked = propagation.affectedDependents.filter(d => !d.locked);
        for (const u of newlyUnlocked) {
          await recordActivity(`"${u.title}" is now unblocked`, 'unlock');
        }
      }
    } else {
      await recordActivity(`Updated task "${task.title}"`, 'edit');
    }

    const finalTask = await Task.findOne({ id: task.id });

    res.status(200).json({
      success: true,
      data: finalTask,
      task: finalTask,
      affectedDependents: propagation.affectedDependents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete task
 * @route  DELETE /api/tasks/:id
 */
export const deleteTask = async (req, res, next) => {
  try {
    const task = await findTaskByIdOrCustomId(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task not found with ID: ${req.params.id}`
      });
    }

    const allTasks = await Task.find();
    const dependentTasks = getDependentTasks(task.id, allTasks);
    const isForce = req.query.force === 'true' || req.body?.force === true;

    // If other tasks depend on this task and force is false, require confirmation
    if (dependentTasks.length > 0 && !isForce) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        dependentCount: dependentTasks.length,
        dependentTitles: dependentTasks.map(t => t.title),
        message: `"${task.title}" is required by ${dependentTasks.length} task(s): ${dependentTasks.map(t => t.title).join(', ')}`
      });
    }

    // Remove task from DB
    await Task.deleteOne({ id: task.id });

    // Clean up broken references in remaining tasks
    const tasksWithReference = await Task.find({ dependsOn: task.id });
    if (tasksWithReference.length > 0) {
      for (const t of tasksWithReference) {
        t.dependsOn = t.dependsOn.filter(depId => depId !== task.id);
        await t.save();
      }
    }

    // Recalculate locks across remaining tasks
    const remainingTasks = await Task.find();
    const updatedRemaining = recalculateLocks(remainingTasks);
    for (const t of updatedRemaining) {
      await Task.updateOne({ id: t.id }, { locked: t.locked });
    }

    await recordActivity(`Deleted task "${task.title}"`, 'delete');

    res.status(200).json({
      success: true,
      message: `Task "${task.title}" deleted successfully. Cleaned up dependencies.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Reset workspace to initial demo seed tasks
 * @route  POST /api/tasks/reset-demo
 */
export const resetDemoTasks = async (req, res, next) => {
  try {
    await Task.deleteMany({});
    const lockedDemoTasks = recalculateLocks(INITIAL_DEMO_TASKS);
    await Task.insertMany(lockedDemoTasks);
    await recordActivity('Workspace reset to initial demo state', 'system');

    const tasks = await Task.find().sort({ createdAt: 1 });
    res.status(200).json({
      success: true,
      message: 'Workspace successfully reset to demo state.',
      count: tasks.length,
      data: tasks,
      tasks: tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Bulk import tasks from JSON
 * @route  POST /api/tasks/import
 */
export const importTasks = async (req, res, next) => {
  try {
    const { tasks: importedTasks } = req.body;
    if (!Array.isArray(importedTasks) || importedTasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Must provide an array of tasks to import.'
      });
    }

    // Validate and clean tasks
    const validIds = new Set(importedTasks.map((t, idx) => t.id || `task-imp-${idx}-${Date.now()}`));
    const preparedTasks = importedTasks.map((t, idx) => {
      const id = t.id || `task-imp-${idx}-${Date.now()}`;
      const rawDeps = Array.isArray(t.dependsOn) ? t.dependsOn : [];
      const cleanDeps = rawDeps.filter(depId => validIds.has(depId) && depId !== id);

      return {
        id,
        title: (t.title || `Imported Task ${idx + 1}`).trim(),
        description: t.description || '',
        status: ['Backlog', 'Todo', 'In Progress', 'Done'].includes(t.status) ? t.status : 'Todo',
        priority: ['High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
        assignee: t.assignee || 'Unassigned',
        dueDate: t.dueDate || '',
        dependsOn: cleanDeps,
        locked: false
      };
    });

    const lockedTasks = recalculateLocks(preparedTasks);

    await Task.deleteMany({});
    await Task.insertMany(lockedTasks);
    await recordActivity(`Imported workspace: ${lockedTasks.length} tasks`, 'system');

    const savedTasks = await Task.find().sort({ createdAt: 1 });
    res.status(200).json({
      success: true,
      message: `Successfully imported ${savedTasks.length} tasks.`,
      count: savedTasks.length,
      data: savedTasks,
      tasks: savedTasks
    });
  } catch (error) {
    next(error);
  }
};
