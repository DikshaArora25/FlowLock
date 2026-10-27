/**
 * FlowLock Backend Dependency Validation & Graph Cycle Detection Engine
 * Core Algorithmic Component enforcing dependency rules on the server
 */

/**
 * Detect circular dependencies before adding a new edge or update.
 * Depth-First Search (DFS) graph traversal with visited set and recursion stack.
 *
 * @param {string} targetTaskId - The task receiving a new dependency
 * @param {Array<string>|string} proposedDependencyId - The dependency task(s) being added/set
 * @param {Array<Object>} tasks - All tasks in the workspace
 * @returns {Object} { hasCycle: boolean, cycleChain: Array<string> }
 */
export const detectCycle = (targetTaskId, proposedDependencyId, tasks) => {
  const proposedDeps = Array.isArray(proposedDependencyId) ? proposedDependencyId : [proposedDependencyId];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // 1. Direct self-dependency check
  for (const depId of proposedDeps) {
    if (targetTaskId === depId) {
      const task = taskMap.get(targetTaskId);
      const name = task ? task.title : targetTaskId;
      return {
        hasCycle: true,
        cycleChain: [name, name]
      };
    }
  }

  // Helper to get dependencies of a task under the proposed changes
  const getDeps = (taskId) => {
    if (taskId === targetTaskId) {
      return proposedDeps;
    }
    const t = taskMap.get(taskId);
    return t && Array.isArray(t.dependsOn) ? t.dependsOn : [];
  };

  // 2. DFS traversal to check if starting from any proposed dependency leads back to targetTaskId
  for (const depId of proposedDeps) {
    const visited = new Set();
    const path = [];

    const dfs = (currentId) => {
      visited.add(currentId);
      path.push(currentId);

      if (currentId === targetTaskId) {
        return true; // Cycle detected
      }

      const nextDeps = getDeps(currentId);
      for (const nextId of nextDeps) {
        if (!visited.has(nextId)) {
          if (dfs(nextId)) return true;
        } else if (path.includes(nextId) && nextId === targetTaskId) {
          path.push(nextId);
          return true;
        }
      }

      path.pop();
      return false;
    };

    if (dfs(depId)) {
      const fullPathIds = [targetTaskId, ...path];
      const cycleChainTitles = fullPathIds.map(id => {
        const t = taskMap.get(id);
        return t ? t.title : id;
      });
      return {
        hasCycle: true,
        cycleChain: cycleChainTitles
      };
    }
  }

  return {
    hasCycle: false,
    cycleChain: []
  };
};

/**
 * Checks if a task is locked.
 * A task is locked if ANY of its valid dependencies have a status other than 'Done'.
 */
export const isTaskLocked = (task, tasks) => {
  if (!task || !Array.isArray(task.dependsOn) || task.dependsOn.length === 0) {
    return false;
  }

  const taskMap = new Map(tasks.map(t => [t.id, t]));

  for (const depId of task.dependsOn) {
    const depTask = taskMap.get(depId);
    if (depTask && depTask.status !== 'Done') {
      return true;
    }
  }

  return false;
};

/**
 * Retrieves the specific tasks that are blocking a locked task.
 */
export const getBlockingDependencies = (task, tasks) => {
  if (!task || !Array.isArray(task.dependsOn)) return [];

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const blocking = [];

  for (const depId of task.dependsOn) {
    const depTask = taskMap.get(depId);
    if (depTask && depTask.status !== 'Done') {
      blocking.push(depTask);
    }
  }

  return blocking;
};

/**
 * Recalculate locked states across all tasks in memory.
 */
export const recalculateLocks = (tasks) => {
  return tasks.map(task => {
    const locked = isTaskLocked(task, tasks);
    const plain = typeof task.toObject === 'function' ? task.toObject() : { ...task };
    return {
      ...plain,
      locked
    };
  });
};

/**
 * Get all tasks that depend on a given taskId.
 */
export const getDependentTasks = (taskId, tasks) => {
  return tasks.filter(t => Array.isArray(t.dependsOn) && t.dependsOn.includes(taskId));
};

/**
 * Rule Checker:
 * Determines if moving a task to newStatus is permitted.
 */
export const canMoveTask = (task, newStatus, tasks) => {
  if (!task) {
    return { allowed: false, reason: 'Task not found.' };
  }

  // Rule 1: Moving to 'In Progress' requires all dependencies to be 'Done'
  if (newStatus === 'In Progress') {
    const locked = isTaskLocked(task, tasks);
    if (locked) {
      const blocking = getBlockingDependencies(task, tasks);
      const blockingTitles = blocking.map(b => b.title).join(', ');
      return {
        allowed: false,
        reason: `Task "${task.title}" is locked. Complete blocking dependencies first: [${blockingTitles}]`,
        blockingTasks: blocking
      };
    }
  }

  // Rule 2: Moving directly to 'Done' requires all dependencies to be 'Done'
  if (newStatus === 'Done') {
    const locked = isTaskLocked(task, tasks);
    if (locked) {
      const blocking = getBlockingDependencies(task, tasks);
      const blockingTitles = blocking.map(b => b.title).join(', ');
      return {
        allowed: false,
        reason: `Cannot complete "${task.title}" while its dependencies are incomplete: [${blockingTitles}]`,
        blockingTasks: blocking
      };
    }
  }

  return { allowed: true };
};

/**
 * Recalculates locks down the dependency graph after a status change.
 */
export const propagateDependencyState = (tasks, changedTaskId) => {
  const updatedTasks = recalculateLocks(tasks);
  const directDependents = getDependentTasks(changedTaskId, updatedTasks);

  return {
    tasks: updatedTasks,
    affectedDependents: directDependents
  };
};
