import {
  getTasksAPI,
  createTaskAPI,
  updateTaskAPI,
  deleteTaskAPI,
  resetDemoTasksAPI,
  importTasksAPI,
  getActivityAPI,
  getActivityStatsAPI,
  logActivityAPI,
  clearActivityAPI
} from './api.js';
import { recalculateLocks } from './dependencyEngine.js';

class TaskManager {
  constructor() {
    this.tasks = [];
    this.activities = [];
    this.isInitialized = false;
    this.lastError = null;
  }

  /**
   * Load authoritative tasks and activities from MongoDB via Express API
   */
  async loadFromAPI() {
    try {
      this.lastError = null;
      const [taskResponse, activityResponse] = await Promise.all([
        getTasksAPI(),
        getActivityAPI().catch(() => ({ activities: [] }))
      ]);

      const fetchedTasks = taskResponse.tasks || taskResponse.data || [];
      this.tasks = recalculateLocks(fetchedTasks);
      this.activities = activityResponse.activities || activityResponse.data || [];
      this.isInitialized = true;
      return { success: true, tasks: this.tasks };
    } catch (error) {
      console.error('[TaskManager] Error connecting to MongoDB API:', error);
      this.lastError = error.message;
      this.isInitialized = false;
      return {
        success: false,
        message: error.message,
        isNetworkError: Boolean(error.isNetworkError)
      };
    }
  }

  // Synchronous init fallback
  init() {
    return this.loadFromAPI();
  }

  /**
   * Reset workspace to initial demo state on MongoDB
   */
  async resetDemoWorkspace() {
    try {
      const response = await resetDemoTasksAPI();
      this.tasks = recalculateLocks(response.tasks || response.data || []);
      await this.refreshActivities();
      return { success: true, tasks: this.tasks };
    } catch (error) {
      return { success: false, message: error.message };
    }
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

  /**
   * Create task through backend API
   */
  async addTask(taskData) {
    try {
      const payload = {
        title: taskData.title ? taskData.title.trim() : '',
        description: taskData.description ? taskData.description.trim() : '',
        status: taskData.status || 'Todo',
        priority: taskData.priority || 'Medium',
        assignee: taskData.assignee ? taskData.assignee.trim() : 'Unassigned',
        dueDate: taskData.dueDate || '',
        dependsOn: Array.isArray(taskData.dependsOn) ? taskData.dependsOn : []
      };

      const response = await createTaskAPI(payload);
      const created = response.task || response.data;

      // Refresh tasks from server to ensure accurate lock states
      await this.loadFromAPI();
      return { success: true, task: created };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create task.'
      };
    }
  }

  /**
   * Update task through backend API
   */
  async updateTask(taskId, updatedFields) {
    try {
      const response = await updateTaskAPI(taskId, updatedFields);
      const updated = response.task || response.data;

      // Refresh authoritative workspace from server
      await this.loadFromAPI();
      return { success: true, task: updated, affectedDependents: response.affectedDependents };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update task.'
      };
    }
  }

  /**
   * Change task status through backend API with dependency validation
   */
  async moveTaskStatus(taskId, newStatus) {
    try {
      const response = await updateTaskAPI(taskId, { status: newStatus });
      await this.loadFromAPI();
      return {
        success: true,
        task: response.task || response.data,
        affectedDependents: response.affectedDependents || []
      };
    } catch (error) {
      const blocking = error.data && error.data.blockingTasks ? error.data.blockingTasks : [];
      return {
        success: false,
        message: error.message || `Cannot move task to ${newStatus}.`,
        blockingTasks: blocking
      };
    }
  }

  /**
   * Delete task through backend API
   */
  async deleteTask(taskId, force = false) {
    try {
      const response = await deleteTaskAPI(taskId, force);
      await this.loadFromAPI();
      return { success: true, message: response.message };
    } catch (error) {
      if (error.status === 409 && error.data && error.data.requiresConfirmation) {
        return {
          success: false,
          requiresConfirmation: true,
          dependentCount: error.data.dependentCount,
          dependentTitles: error.data.dependentTitles,
          message: error.data.message
        };
      }
      return {
        success: false,
        message: error.message || 'Failed to delete task.'
      };
    }
  }

  /**
   * Bulk import tasks through backend API
   */
  async importBoardTasks(importedTasks) {
    try {
      const response = await importTasksAPI(importedTasks);
      this.tasks = recalculateLocks(response.tasks || response.data || []);
      await this.refreshActivities();
      return { success: true, tasks: this.tasks };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  getFilteredTasks({ search = '', filterStatus = 'all', sortBy = 'priority' } = {}) {
    let result = [...this.tasks];

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.toLowerCase().includes(q))
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

    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
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
    const highPriority = this.tasks.filter(t => t.priority === 'High').length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const unblockedHealth = total > 0 ? Math.round(((total - locked) / total) * 100) : 100;

    return { total, backlog, todo, inProgress, done, locked, withDeps, highPriority, completionRate, unblockedHealth };
  }

  async fetchActivities(options = {}) {
    try {
      const res = await getActivityAPI(options);
      const items = res.activities || res.data || [];
      if (!options.type && !options.search) {
        this.activities = items;
      }
      return {
        success: true,
        activities: items,
        total: res.total ?? items.length,
        page: res.page ?? 1,
        totalPages: res.totalPages ?? 1
      };
    } catch (err) {
      console.warn('[Activity] Could not fetch activities:', err.message);
      return { success: false, message: err.message, activities: [] };
    }
  }

  async getActivityStats() {
    try {
      const res = await getActivityStatsAPI();
      return res.data || null;
    } catch (err) {
      console.warn('[Activity] Could not fetch activity stats:', err.message);
      return null;
    }
  }

  async logActivity(text, type = 'info') {
    try {
      await logActivityAPI(text, type);
      await this.refreshActivities();
    } catch (err) {
      console.warn('[Activity] Could not log event to server:', err.message);
    }
  }

  async refreshActivities() {
    try {
      const res = await getActivityAPI(50);
      this.activities = res.activities || res.data || [];
    } catch (err) {
      console.warn('[Activity] Could not refresh activities:', err.message);
    }
  }

  getRecentActivities(limit = 20) {
    return this.activities.slice(0, limit);
  }

  async clearActivities() {
    try {
      await clearActivityAPI();
      this.activities = [];
    } catch (err) {
      console.warn('[Activity] Could not clear activities on server:', err.message);
    }
  }
}

export const taskManager = new TaskManager();
