import { saveTasks, loadTasks, saveActivityLog, loadActivityLog } from './storage.js';
import { recalculateLocks, detectCycle, propagateDependencyState, canMoveTask } from './dependencyEngine.js';
import { generateId } from './utils.js';

// Realistic demo workspace with real dependency relationships
const INITIAL_DEMO_TASKS = [
  {
    id: 'task-1',
    title: 'Project Requirements & Planning',
    description: 'Define the technical scope, system architecture, and data schema for the workspace platform.',
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
    description: 'Structure the data model for tasks, dependency relations, and status state machines.',
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
    title: 'User Authentication Service',
    description: 'Design and implement the session management system with route protection guards.',
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
    title: 'Core API & Business Logic',
    description: 'Build the core business logic modules for task management and state validation.',
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
    title: 'Dependency Graph Engine',
    description: 'Implement DFS cycle detection and topological lock propagation algorithms.',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-17',
    dependsOn: ['task-4'],
    locked: false,
    createdAt: '2026-08-05T10:00:00.000Z',
    updatedAt: '2026-08-14T09:00:00.000Z'
  },
  {
    id: 'task-6',
    title: 'Authentication Integration',
    description: 'Wire auth service into the main application flow with session persistence.',
    status: 'Todo',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-18',
    dependsOn: ['task-3'],
    locked: false,
    createdAt: '2026-08-06T10:00:00.000Z',
    updatedAt: '2026-08-15T15:00:00.000Z'
  },
  {
    id: 'task-7',
    title: 'Kanban Dashboard UI',
    description: 'Build the drag-and-drop Kanban board with status columns, task cards, and lock indicators.',
    status: 'Todo',
    priority: 'High',
    assignee: 'Diksha',
    dueDate: '2026-08-20',
    dependsOn: ['task-5', 'task-6'],
    locked: true,
    createdAt: '2026-08-07T10:00:00.000Z',
    updatedAt: '2026-08-15T15:00:00.000Z'
  },
  {
    id: 'task-8',
    title: 'End-to-End Integration Testing',
    description: 'Verify cycle detection, lock propagation, drag-and-drop, and storage across all edge cases.',
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
    title: 'Production Deployment',
    description: 'Configure production hosting, environment setup, and static build delivery pipeline.',
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
    title: 'Documentation & README',
    description: 'Write comprehensive documentation covering architecture, setup, and technical decisions.',
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
    const loaded = loadTasks();
    if (loaded === null) {
      this.tasks = recalculateLocks(INITIAL_DEMO_TASKS);
      saveTasks(this.tasks);
      this.logActivity('Workspace initialized with demo project', 'system');
    } else {
      this.tasks = recalculateLocks(loaded);
    }
    this.activities = loadActivityLog();
  }

  // Reset to original seed state
  resetDemoWorkspace() {
    this.tasks = recalculateLocks(INITIAL_DEMO_TASKS);
    saveTasks(this.tasks);
    this.logActivity('Workspace reset to initial demo state', 'system');
    return this.tasks;
  }

  getAllTasks() {
    return this.tasks;
  }

  getTaskById(id) {
    return this.tasks.find(t => t.id === id) || null;
  }

  getFirstLockedTask() {
    return this.tasks.find(t => t.locked) || null;
  }

  // Returns a currently blocking dependency (incomplete prerequisite of a locked task)
  getFirstBlockingDependency() {
    const lockedTask = this.getFirstLockedTask();
    if (!lockedTask) return null;
    const taskMap = new Map(this.tasks.map(t => [t.id, t]));
    for (const depId of lockedTask.dependsOn) {
      const dep = taskMap.get(depId);
      if (dep && dep.status !== 'Done') return dep;
    }
    return null;
  }

  addTask(taskData) {
    const dependsOn = Array.isArray(taskData.dependsOn) ? [...taskData.dependsOn] : [];
    if (dependsOn.length > 0) {
      const tempId = generateId();
      const cycleCheck = detectCycle(tempId, dependsOn, this.tasks);
      if (cycleCheck.hasCycle) {
        return { success: false, message: `Circular dependency detected: ${cycleCheck.cycleChain.join(' → ')}` };
      }
    }

    const newTask = {
      id: generateId(),
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      status: taskData.status || 'Todo',
      priority: taskData.priority || 'Medium',
      assignee: taskData.assignee ? taskData.assignee.trim() : 'Unassigned',
      dueDate: taskData.dueDate || '',
      dependsOn: dependsOn,
      locked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks.push(newTask);
    this.tasks = recalculateLocks(this.tasks);
    saveTasks(this.tasks);
    this.logActivity(`Created task "${newTask.title}"`, 'add');
    return { success: true, task: this.getTaskById(newTask.id) };
  }

  updateTask(taskId, updatedFields) {
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return { success: false, message: 'Task not found.' };
    }

    const currentTask = this.tasks[taskIndex];

    if (updatedFields.dependsOn && Array.isArray(updatedFields.dependsOn)) {
      if (updatedFields.dependsOn.includes(taskId)) {
        return { success: false, message: 'A task cannot depend on itself.' };
      }
      const cycleCheck = detectCycle(taskId, updatedFields.dependsOn, this.tasks);
      if (cycleCheck.hasCycle) {
        return { success: false, message: `Circular dependency: ${cycleCheck.cycleChain.join(' → ')}` };
      }
    }

    const updatedTask = {
      ...currentTask,
      ...updatedFields,
      id: taskId,
      updatedAt: new Date().toISOString()
    };

    this.tasks[taskIndex] = updatedTask;
    const propagation = propagateDependencyState(this.tasks, taskId);
    this.tasks = propagation.tasks;
    saveTasks(this.tasks);
    this.logActivity(`Updated task "${updatedTask.title}"`, 'edit');
    return { success: true, task: this.getTaskById(taskId) };
  }

  moveTaskStatus(taskId, newStatus) {
    const task = this.getTaskById(taskId);
    if (!task) {
      return { success: false, message: 'Task not found.' };
    }

    if (task.status === newStatus) {
      return { success: true, task };
    }

    const validation = canMoveTask(task, newStatus, this.tasks);
    if (!validation.allowed) {
      this.logActivity(`Blocked: "${task.title}" → ${newStatus} (dependency not met)`, 'blocked');
      return {
        success: false,
        message: validation.reason,
        blockingTasks: validation.blockingTasks
      };
    }

    const oldStatus = task.status;

    const taskRef = this.tasks.find(t => t.id === taskId);
    taskRef.status = newStatus;
    taskRef.updatedAt = new Date().toISOString();

    const propagation = propagateDependencyState(this.tasks, taskId);
    this.tasks = propagation.tasks;
    saveTasks(this.tasks);

    this.logActivity(`"${task.title}": ${oldStatus} → ${newStatus}`, 'move');

    if (newStatus === 'Done') {
      const unlocked = propagation.affectedDependents.filter(d => !d.locked);
      unlocked.forEach(d => {
        this.logActivity(`"${d.title}" is now unblocked`, 'unlock');
      });
    }

    return { success: true, task: this.getTaskById(taskId), affectedDependents: propagation.affectedDependents };
  }

  deleteTask(taskId, force = false) {
    const task = this.getTaskById(taskId);
    if (!task) return { success: false, message: 'Task not found.' };

    const dependentTasks = this.tasks.filter(t => Array.isArray(t.dependsOn) && t.dependsOn.includes(taskId));

    if (dependentTasks.length > 0 && !force) {
      return {
        success: false,
        requiresConfirmation: true,
        dependentCount: dependentTasks.length,
        dependentTitles: dependentTasks.map(t => t.title),
        message: `"${task.title}" is required by ${dependentTasks.length} task(s): ${dependentTasks.map(t => t.title).join(', ')}`
      };
    }

    this.tasks = this.tasks
      .filter(t => t.id !== taskId)
      .map(t => ({ ...t, dependsOn: (t.dependsOn || []).filter(id => id !== taskId) }));

    this.tasks = recalculateLocks(this.tasks);
    saveTasks(this.tasks);
    this.logActivity(`Deleted task "${task.title}"`, 'delete');
    return { success: true };
  }

  importBoardTasks(importedTasks) {
    this.tasks = recalculateLocks(importedTasks);
    saveTasks(this.tasks);
    this.logActivity(`Imported workspace: ${importedTasks.length} tasks`, 'system');
    return this.tasks;
  }

  getFilteredTasks({ search = '', filterStatus = 'all', sortBy = 'priority' } = {}) {
    let result = [...this.tasks];

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'locked') {
        result = result.filter(t => t.locked);
      } else if (['High', 'Medium', 'Low'].includes(filterStatus)) {
        result = result.filter(t => t.priority === filterStatus);
      } else {
        result = result.filter(t => t.status === filterStatus);
      }
    }

    const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
    result.sort((a, b) => {
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

    return result;
  }

  getMetrics() {
    const total = this.tasks.length;
    const backlog = this.tasks.filter(t => t.status === 'Backlog').length;
    const todo = this.tasks.filter(t => t.status === 'Todo').length;
    const inProgress = this.tasks.filter(t => t.status === 'In Progress').length;
    const done = this.tasks.filter(t => t.status === 'Done').length;
    const locked = this.tasks.filter(t => t.locked).length;
    const withDeps = this.tasks.filter(t => (t.dependsOn || []).length > 0).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const unblockedHealth = total > 0 ? Math.round(((total - locked) / total) * 100) : 100;

    return { total, backlog, todo, inProgress, done, locked, withDeps, completionRate, unblockedHealth };
  }

  logActivity(text, type = 'info') {
    const entry = {
      id: generateId('act'),
      text,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    this.activities.unshift(entry);
    if (this.activities.length > 50) this.activities = this.activities.slice(0, 50);
    saveActivityLog(this.activities);
  }

  getRecentActivities(limit = 20) {
    return this.activities.slice(0, limit);
  }

  clearActivities() {
    this.activities = [];
    saveActivityLog([]);
  }
}

export const taskManager = new TaskManager();
