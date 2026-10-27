const STORAGE_KEYS = {
  USERS: 'flowlock_users_v1',
  TASKS: 'flowlock_tasks_v1',
  PREFERENCES: 'flowlock_prefs_v1',
  ACTIVITY_LOG: 'flowlock_activity_v1',
  SESSION_USER: 'flowlock_session_user'
};

// Save tasks collection to LocalStorage
export const saveTasks = (tasks) => {
  try {
    const jsonString = JSON.stringify(tasks);
    localStorage.setItem(STORAGE_KEYS.TASKS, jsonString);
    return true;
  } catch (error) {
    console.error('Error saving tasks to LocalStorage:', error);
    return false;
  }
};

// Load tasks collection from LocalStorage
export const loadTasks = () => {
  try {
    const jsonString = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!jsonString) return null;
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing tasks from LocalStorage:', error);
    return null;
  }
};

export const clearTasks = () => {
  localStorage.removeItem(STORAGE_KEYS.TASKS);
};

export const savePreferences = (prefs) => {
  try {
    const currentPrefs = loadPreferences() || {};
    const updated = { ...currentPrefs, ...prefs };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

export const loadPreferences = () => {
  try {
    const jsonString = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return jsonString ? JSON.parse(jsonString) : { theme: 'dark' };
  } catch (error) {
    return { theme: 'dark' };
  }
};

export const saveActivityLog = (activities) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(activities.slice(0, 50)));
  } catch (error) {
    console.error('Error saving activity log:', error);
  }
};

export const loadActivityLog = () => {
  try {
    const jsonString = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG);
    return jsonString ? JSON.parse(jsonString) : [];
  } catch (error) {
    return [];
  }
};

// Session Storage & Persistent Auth State (LocalStorage for Remember Me)
export const saveSessionUser = (userObject, rememberMe = false) => {
  try {
    const jsonStr = JSON.stringify(userObject);
    sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, jsonStr);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.SESSION_USER, jsonStr);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    }
  } catch (error) {
    console.error('Error saving session user:', error);
  }
};

export const getSessionUser = () => {
  try {
    let jsonString = sessionStorage.getItem(STORAGE_KEYS.SESSION_USER);
    if (!jsonString) {
      jsonString = localStorage.getItem(STORAGE_KEYS.SESSION_USER);
      if (jsonString) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, jsonString);
      }
    }
    if (!jsonString) return null;

    const user = JSON.parse(jsonString);
    if (user && user.expiresAt) {
      const expiry = new Date(user.expiresAt).getTime();
      if (expiry <= Date.now()) {
        clearSessionUser();
        return null;
      }
    }
    return user;
  } catch (error) {
    return null;
  }
};

export const clearSessionUser = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION_USER);
  } catch (error) {
    console.error('Error clearing session user:', error);
  }
};

export const loadUsers = () => {
  try {
    const jsonString = localStorage.getItem(STORAGE_KEYS.USERS);

    if (!jsonString) {
      return [];
    }

    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error loading users from LocalStorage:', error);
    return [];
  }
};

export const saveUsers = (users) => {
  try {
    localStorage.setItem(
      STORAGE_KEYS.USERS,
      JSON.stringify(users)
    );

    return true;
  } catch (error) {
    console.error('Error saving users to LocalStorage:', error);
    return false;
  }
};

export const exportBoardAsJSON = (tasks) => {
  const exportData = {
    appName: 'FlowLock',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    taskCount: tasks.length,
    tasks: tasks
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowlock-board-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const parseAndValidateImportedJSON = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    let tasksToValidate = null;

    if (Array.isArray(data)) {
      tasksToValidate = data;
    } else if (data && Array.isArray(data.tasks)) {
      tasksToValidate = data.tasks;
    } else {
      throw new Error('Invalid JSON format: Must be an array of tasks or export payload.');
    }

    const validatedTasks = tasksToValidate.map((task, index) => {
      if (!task.title || typeof task.title !== 'string') {
        throw new Error(`Task at index ${index} missing valid title.`);
      }
      return {
        id: task.id || `task-imp-${index}-${Date.now()}`,
        title: task.title.trim(),
        description: task.description || '',
        status: ['Backlog', 'Todo', 'In Progress', 'Done'].includes(task.status) ? task.status : 'Todo',
        priority: ['High', 'Medium', 'Low'].includes(task.priority) ? task.priority : 'Medium',
        assignee: task.assignee || 'Unassigned',
        dueDate: task.dueDate || '',
        dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : [],
        locked: Boolean(task.locked),
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString()
      };
    });

    // Prune orphan dependency IDs that do not exist in the imported dataset & avoid self-dependencies
    const validIds = new Set(validatedTasks.map(t => t.id));
    validatedTasks.forEach(t => {
      t.dependsOn = t.dependsOn.filter(depId => validIds.has(depId) && depId !== t.id);
    });

    return { success: true, tasks: validatedTasks };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
