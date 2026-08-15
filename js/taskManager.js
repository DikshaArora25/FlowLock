/**
 * FlowLock Task Manager Module (Lectures 11-14: Array HOFs filter, map, reduce, sort, state management)
 */

import { saveTasks, loadTasks, saveActivityLog, loadActivityLog } from './storage.js';
import { recalculateLocks, detectCycle, propagateDependencyState, canMoveTask } from './dependencyEngine.js';
import { generateId } from './utils.js';

// Initial Demo Seed Tasks (10 Realistic Tasks with Branching Dependencies)
const INITIAL_DEMO_TASKS = [
  {
    id: 'task-1',
    title: 'Project Requirements & Architecture',
    description: 'Define syllabus objectives, technical scope, and system design document.',
    status: 'Done',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-10',
    dependsOn: [],
    locked: false,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-05T14:00:00.000Z'
  },
  {
    id: 'task-2',
    title: 'Database Schema Design',
    description: 'Structure JSON schema for tasks, dependency relations, and status enums.',
    status: 'Done',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-12',
    dependsOn: ['task-1'],
    locked: false,
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-08T16:00:00.000Z'
  },
  {
    id: 'task-3',
    title: 'User Authentication Data Model',
    description: 'Design user profile schemas and session state structures for demo auth.',
    status: 'Done',
    priority: 'Medium',
    assignee: 'Diksha',
    dueDate: '2026-08-14',
    dependsOn: ['task-2'],
    locked: false,
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-10T12:00:00.000Z'
  },
  {
    id: 'task-4',
    title: 'Backend API Setup',
    description: 'Build core business logic modules for task management and state validation.',
    status: 'Done',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-15',
    dependsOn: ['task-2'],
    locked: false,
    createdAt: '2026-08-04T10:00:00.000Z',
    updatedAt: '2026-08-12T11:00:00.000Z'
  },
  {
    id: 'task-5',
    title: 'Authentication & Session Service',
    description: 'Implement SessionStorage authentication guard and route protection handlers.',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-18',
    dependsOn: ['task-3'],
    locked: false,
    createdAt: '2026-08-05T10:00:00.000Z',
    updatedAt: '2026-08-14T09:00:00.000Z'
  },
  {
    id: 'task-6',
    title: 'Dependency Graph Engine',
    description: 'Implement DFS cycle detection and topological status lock calculation.',
    status: 'Done',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-17',
    dependsOn: ['task-4'],
    locked: false,
    createdAt: '2026-08-06T10:00:00.000Z',
    updatedAt: '2026-08-15T15:00:00.000Z'
  },
  {
    id: 'task-7',
    title: 'Kanban Dashboard UI Integration',
    description: 'Build drag and drop columns, status badges, and interactive task cards.',
    status: 'Todo',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-20',
    dependsOn: ['task-5', 'task-6'],
    locked: true, // task-5 is In Progress (not Done), so task-7 is LOCKED!
    createdAt: '2026-08-07T10:00:00.000Z',
    updatedAt: '2026-08-15T15:00:00.000Z'
  },
  {
    id: 'task-8',
    title: 'End-to-End System Testing',
    description: 'Perform unit tests on cycle detection, lock propagation, and edge cases.',
    status: 'Todo',
    priority: 'Medium',
    assignee: 'Diksha',
    dueDate: '2026-08-22',
    dependsOn: ['task-7'],
    locked: true,
    createdAt: '2026-08-08T10:00:00.000Z',
    updatedAt: '2026-08-15T15:00:00.000Z'
  },
  {
    id: 'task-9',
    title: 'Production Cloud Deployment',
    description: 'Configure production hosting, environment variables, and static build delivery.',
    status: 'Backlog',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-25',
    dependsOn: ['task-8'],
    locked: true,
    createdAt: '2026-08-09T10:00:00.000Z',
    updatedAt: '2026-08-15T15:00:00.000Z'
  },
  {
    id: 'task-10',
    title: 'Documentation & Final Viva Prep',
    description: 'Compile README concept mapping, architectural diagrams, and rubric checklists.',
    status: 'Backlog',
    priority: 'Low',
    assignee: 'Diksha',
    dueDate: '2026-08-28',
    dependsOn: ['task-9'],
    locked: true,
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-15T15:00:00.000Z'
  }
];

class TaskManager {
  constructor() {
    this.tasks = [];
    this.activities = [];
    this.init();
  }

  init() {
    // Load from LocalStorage or seed initial demo workspace
    let loaded = loadTasks();
    if (!loaded || loaded.length === 0) {
      this.tasks = recalculateLocks(INITIAL_DEMO_TASKS);
      saveTasks(this.tasks);
      this.logActivity('Workspace initialized with demo project tasks', 'system');
    } else {
      this.tasks = recalculateLocks(loaded);
    }
    this.activities = loadActivityLog();
  }

  // Reset to original seed state
  resetDemoWorkspace() {
    this.tasks = recalculateLocks(INITIAL_DEMO_TASKS);
    saveTasks(this.tasks);
    this.logActivity('Demo scenario workspace reset to default state', 'system');
    return this.tasks;
  }

  // Get all tasks
  getAllTasks() {
    return this.tasks;
  }

  // Get single task by ID
  getTaskById(id) {
    return this.tasks.find(t => t.id === id);
  }

  // Add Task
  addTask(taskData) {
    // Check cycle detection for all proposed dependencies
    if (Array.isArray(taskData.dependsOn)) {
      const tempId = generateId();
      for (const depId of taskData.dependsOn) {
        const cycleCheck = detectCycle(tempId, depId, this.tasks);
        if (cycleCheck.hasCycle) {
          return { success: false, message: `Circular dependency detected: ${cycleCheck.cycleChain.join(' → ')}` };
        }
      }
    }

    const newTask = {
      id: generateId(),
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      status: taskData.status || 'Todo',
      priority: taskData.priority || 'Medium',
      assignee: taskData.assignee || 'Unassigned',
      dueDate: taskData.dueDate || '',
      dependsOn: Array.isArray(taskData.dependsOn) ? taskData.dependsOn : [],
      locked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks.push(newTask);
    this.tasks = recalculateLocks(this.tasks);
    saveTasks(this.tasks);

    this.logActivity(`Created task "${newTask.title}"`, 'add');
    return { success: true, task: newTask };
  }

  // Update Task
  updateTask(taskId, updatedFields) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, message: 'Task not found.' };
    }

    const currentTask = this.tasks[taskIndex];

    // If dependencies changed, perform cycle checks
    if (updatedFields.dependsOn && Array.isArray(updatedFields.dependsOn)) {
      for (const depId of updatedFields.dependsOn) {
        const cycleCheck = detectCycle(taskId, depId, this.tasks);
        if (cycleCheck.hasCycle) {
          return { success: false, message: `Circular dependency detected: ${cycleCheck.cycleChain.join(' → ')}` };
        }
      }
    }

    // Merge updated fields
    const updatedTask = {
      ...currentTask,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    this.tasks[taskIndex] = updatedTask;

    // Trigger lock recalculation & propagation
    const propagation = propagateDependencyState(this.tasks, taskId);
    this.tasks = propagation.tasks;
    saveTasks(this.tasks);

    this.logActivity(`Updated task "${updatedTask.title}"`, 'edit');
    return { success: true, task: updatedTask };
  }

  // Move Task Status with Anti-Cheat Enforcement
  moveTaskStatus(taskId, newStatus) {
    const task = this.getTaskById(taskId);
    if (!task) {
      return { success: false, message: 'Task not found.' };
    }

    if (task.status === newStatus) {
      return { success: true, task };
    }

    // Validate status movement rule
    const validation = canMoveTask(task, newStatus, this.tasks);
    if (!validation.allowed) {
      this.logActivity(`Blocked movement of "${task.title}" to ${newStatus}`, 'blocked');
      return {
        success: false,
        message: validation.reason,
        blockingTasks: validation.blockingTasks
      };
    }

    const oldStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();

    // Propagate state changes to dependent tasks
    const propagation = propagateDependencyState(this.tasks, taskId);
    this.tasks = propagation.tasks;
    saveTasks(this.tasks);

    this.logActivity(`Moved "${task.title}" from ${oldStatus} to ${newStatus}`, 'move');
    return { success: true, task, affectedDependents: propagation.affectedDependents };
  }

  // Delete Task with Dependency Cascade Alert / Clean Up
  deleteTask(taskId, force = false) {
    const task = this.getTaskById(taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    // Check if other tasks depend on this task
    const dependentTasks = this.tasks.filter(t => Array.isArray(t.dependsOn) && t.dependsOn.includes(taskId));

    if (dependentTasks.length > 0 && !force) {
      return {
        success: false,
        requiresConfirmation: true,
        dependentCount: dependentTasks.length,
        dependentTitles: dependentTasks.map(t => t.title),
        message: `Task "${task.title}" is a dependency for ${dependentTasks.length} task(s).`
      };
    }

    // Remove task and clean up references from other tasks' dependsOn arrays
    this.tasks = this.tasks
      .filter(t => t.id !== taskId)
      .map(t => ({
        ...t,
        dependsOn: t.dependsOn.filter(depId => depId !== taskId)
      }));

    this.tasks = recalculateLocks(this.tasks);
    saveTasks(this.tasks);

    this.logActivity(`Deleted task "${task.title}"`, 'delete');
    return { success: true };
  }

  // Overwrite Entire Board (Used in JSON Import)
  importBoardTasks(importedTasks) {
    this.tasks = recalculateLocks(importedTasks);
    saveTasks(this.tasks);
    this.logActivity(`Imported workspace with ${importedTasks.length} tasks`, 'system');
    return this.tasks;
  }

  // Filter & Search & Sort Tasks (Using Array HOFs filter, sort)
  getFilteredTasks({ search = '', filterStatus = 'all', sortBy = 'priority' }) {
    let result = [...this.tasks];

    // Search filter
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q)
      );
    }

    // Status / Lock Filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'locked') {
        result = result.filter(t => t.locked);
      } else if (['High', 'Medium', 'Low'].includes(filterStatus)) {
        result = result.filter(t => t.priority === filterStatus);
      } else {
        result = result.filter(t => t.status === filterStatus);
      }
    }

    // Sort
    const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      } else if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'dependencies') {
        return b.dependsOn.length - a.dependsOn.length;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }

  // Dynamic Dashboard Metrics Calculation (Using reduce & filter)
  getMetrics() {
    const total = this.tasks.length;
    const todo = this.tasks.filter(t => t.status === 'Todo').length;
    const backlog = this.tasks.filter(t => t.status === 'Backlog').length;
    const inProgress = this.tasks.filter(t => t.status === 'In Progress').length;
    const done = this.tasks.filter(t => t.status === 'Done').length;
    const locked = this.tasks.filter(t => t.locked).length;
    
    // Dependency chains metric: tasks with at least 1 dependency
    const withDeps = this.tasks.filter(t => t.dependsOn.length > 0).length;

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      total,
      backlog,
      todo,
      inProgress,
      done,
      locked,
      withDeps,
      completionRate
    };
  }

  // Log Activity
  logActivity(text, type = 'info') {
    const entry = {
      id: generateId('act'),
      text,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    this.activities.unshift(entry);
    saveActivityLog(this.activities);
  }

  getRecentActivities() {
    return this.activities.slice(0, 15);
  }
}

export const taskManager = new TaskManager();
