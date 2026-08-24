/**
 * FlowLock Dependency Validation & Graph Cycle Detection Engine
 * Core Algorithmic Component
 */

/**
 * Detect circular dependencies before adding a new edge (targetTaskId -> proposedDependencyId).
 * Example invalid graph: Task A depends on Task B, B depends on C, C depends on A.
 * Using Depth-First Search (DFS) graph traversal with visited set and recursion stack.
 * 
 * @param {string} targetTaskId - The task receiving a new dependency
 * @param {string} proposedDependencyId - The dependency task being added
 * @param {Array<Object>} tasks - All tasks in the workspace
 * @returns {Object} { hasCycle: boolean, cycleChain: Array<string> }
 */
export const detectCycle = (targetTaskId, proposedDependencyId, tasks) => {
  // Normalize proposedDependencyId to array of dependency IDs
  const proposedDeps = Array.isArray(proposedDependencyId) ? proposedDependencyId : [proposedDependencyId];

  // Build lookup map for fast task retrieval
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // 1. Check direct self dependency
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

  // 2. Check if starting from any proposed dependency leads back to targetTaskId
  for (const depId of proposedDeps) {
    const visited = new Set();
    const path = [];

    const dfs = (currentId) => {
      visited.add(currentId);
      path.push(currentId);

      if (currentId === targetTaskId) {
        return true; // Cycle detected: targetTaskId -> depId -> ... -> targetTaskId
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
    // If dependency exists and is not Done, task is locked
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
 * Recalculate locked states across all tasks.
 */
export const recalculateLocks = (tasks) => {
  const updatedTasks = tasks.map(task => {
    const locked = isTaskLocked(task, tasks);
    if (locked === task.locked) {
      return { ...task }; // No change — preserve updatedAt
    }
    return {
      ...task,
      locked
      // Note: updatedAt is intentionally NOT updated here.
      // Lock state is a computed property, not a user action.
    };
  });

  return updatedTasks;
};

/**
 * Get all tasks that depend on a given taskId.
 */
export const getDependentTasks = (taskId, tasks) => {
  return tasks.filter(t => Array.isArray(t.dependsOn) && t.dependsOn.includes(taskId));
};

/**
 * Anti-Cheat & Workflow Validation Rule Checker:
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
 * Cascading State Propagation Algorithm:
 * Recalculates locks down the dependency graph after a status change.
 */
export const propagateDependencyState = (tasks, changedTaskId) => {
  // Step 1: Recalculate locks for all tasks
  let updatedTasks = recalculateLocks(tasks);

  // Step 2: Identify downstream affected dependents
  const directDependents = getDependentTasks(changedTaskId, updatedTasks);

  // Return updated task list with new recalculated lock flags
  return {
    tasks: updatedTasks,
    affectedDependents: directDependents
  };
};
