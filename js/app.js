/**
 * FlowLock Main Application Entry Point & Controller (Lectures 21-24: Events, Drag & Drop, ES6)
 */

import { checkAuthGuard, logoutUser } from './auth.js';
import { taskManager } from './taskManager.js';
import { renderMetrics, renderKanbanBoard, renderDependencyInspector, populateTaskForm, renderActivityLog } from './ui.js';
import { validateTaskForm, renderFormErrors } from './validation.js';
import { showToast, debounce } from './utils.js';
import { savePreferences, loadPreferences, exportBoardAsJSON, parseAndValidateImportedJSON } from './storage.js';

// Global application state for toolbar filters
const appState = {
  searchQuery: '',
  filterStatus: 'all',
  sortBy: 'priority',
  draggedTaskId: null,
  taskToDeleteId: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  // 1. Auth Route Guard
  const user = checkAuthGuard('dashboard');
  if (user) {
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.name || 'Diksha';
  }

  // 2. Load Theme Preference
  const prefs = loadPreferences();
  if (prefs.theme) {
    document.documentElement.setAttribute('data-theme', prefs.theme);
  }

  // 3. Render Initial State
  refreshAppUI();

  // 4. Attach Event Listeners
  initThemeToggle();
  initToolbarListeners();
  initKanbanDragAndDrop();
  initModalListeners();
  initDemoScenarioButtons();
  initJsonImportExport();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
  }
});

// Refresh Complete App View
export const refreshAppUI = () => {
  const allTasks = taskManager.getAllTasks();
  const filteredTasks = taskManager.getFilteredTasks({
    search: appState.searchQuery,
    filterStatus: appState.filterStatus,
    sortBy: appState.sortBy
  });
  const metrics = taskManager.getMetrics();
  const activities = taskManager.getRecentActivities();

  renderMetrics(metrics);
  renderKanbanBoard(filteredTasks, allTasks);
  renderActivityLog(activities);
};

// Theme Toggle
const initThemeToggle = () => {
  const themeBtn = document.getElementById('themeToggleBtn');
  if (!themeBtn) return;

  themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    savePreferences({ theme: newTheme });
    themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    showToast(`Switched to ${newTheme} theme`, 'info');
  });
};

// Toolbar Search, Filtering, and Sorting
const initToolbarListeners = () => {
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const sortSelect = document.getElementById('sortSelect');

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      appState.searchQuery = e.target.value;
      refreshAppUI();
    }, 200));
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      appState.filterStatus = e.target.value;
      refreshAppUI();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      appState.sortBy = e.target.value;
      refreshAppUI();
    });
  }
};

// Native HTML5 Drag and Drop Kanban Controller
const initKanbanDragAndDrop = () => {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  // Delegate dragstart & dragend on task cards
  board.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;

    appState.draggedTaskId = card.dataset.taskId;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', card.dataset.taskId);
    e.dataTransfer.effectAllowed = 'move';
  });

  board.addEventListener('dragend', (e) => {
    const card = e.target.closest('.task-card');
    if (card) card.classList.remove('dragging');

    document.querySelectorAll('.task-list').forEach(list => list.classList.remove('drag-over'));
    appState.draggedTaskId = null;
  });

  // Attach dragover and drop handlers on column lists
  const columnLists = document.querySelectorAll('.task-list');
  columnLists.forEach(list => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.classList.add('drag-over');
    });

    list.addEventListener('dragleave', () => {
      list.classList.remove('drag-over');
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.classList.remove('drag-over');

      const taskId = e.dataTransfer.getData('text/plain') || appState.draggedTaskId;
      const targetStatus = list.dataset.status;

      if (!taskId || !targetStatus) return;

      // Attempt to move task
      const result = taskManager.moveTaskStatus(taskId, targetStatus);

      if (!result.success) {
        // Anti-Cheat Block Triggered!
        const cardEl = document.getElementById(`card-${taskId}`);
        if (cardEl) {
          cardEl.classList.add('shake');
          setTimeout(() => cardEl.classList.remove('shake'), 500);
        }

        showToast(`🔒 ${result.message}`, 'error', 5000);

        // Open Inspector to explain why task is locked
        const task = taskManager.getTaskById(taskId);
        if (task && task.locked) {
          renderDependencyInspector(task, taskManager.getAllTasks());
          openModal('inspectorModal');
        }
      } else {
        showToast(`Moved "${result.task.title}" to ${targetStatus}`, 'success');
        refreshAppUI();
      }
    });
  });
};

// Modal Open / Close Helpers
export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
};

export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
};

// Modal Forms & Dynamic Action Listeners
const initModalListeners = () => {
  // Modal Backdrop Click to Close
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
      }
    });
  });

  // Modal Close Buttons
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) modal.classList.remove('active');
    });
  });

  // Create Task Button
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      populateTaskForm(null, taskManager.getAllTasks());
      openModal('taskModal');
    });
  }

  // Task Form Submit
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const taskId = document.getElementById('taskIdInput').value;
      const title = document.getElementById('taskTitle').value;
      const description = document.getElementById('taskDescription').value;
      const priority = document.getElementById('taskPriority').value;
      const assignee = document.getElementById('taskAssignee').value;
      const dueDate = document.getElementById('taskDueDate').value;
      const status = document.getElementById('taskStatus').value;

      // Extract checked dependencies
      const depCheckboxes = taskForm.querySelectorAll('input[name="dependsOn"]:checked');
      const dependsOn = Array.from(depCheckboxes).map(cb => cb.value);

      const formData = { title, description, priority, assignee, dueDate, status, dependsOn };

      // Validate
      const validation = validateTaskForm(formData, taskId, taskManager.getAllTasks());
      if (!validation.isValid) {
        renderFormErrors(taskForm, validation.errors);
        return;
      }

      if (taskId) {
        // Edit existing task
        const result = taskManager.updateTask(taskId, formData);
        if (!result.success) {
          showToast(`Error: ${result.message}`, 'error');
          return;
        }
        showToast(`Updated task "${result.task.title}"`, 'success');
      } else {
        // Create new task
        const result = taskManager.addTask(formData);
        if (!result.success) {
          showToast(`Error: ${result.message}`, 'error');
          return;
        }
        showToast(`Created new task "${result.task.title}"`, 'success');
      }

      closeModal('taskModal');
      refreshAppUI();
    });
  }

  // Delegated Card Actions (Inspect, Edit, Delete)
  const board = document.getElementById('kanbanBoard');
  if (board) {
    board.addEventListener('click', (e) => {
      const inspectBtn = e.target.closest('.btn-inspect');
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');

      if (inspectBtn) {
        const id = inspectBtn.dataset.id;
        const task = taskManager.getTaskById(id);
        if (task) {
          renderDependencyInspector(task, taskManager.getAllTasks());
          openModal('inspectorModal');
        }
      } else if (editBtn) {
        const id = editBtn.dataset.id;
        const task = taskManager.getTaskById(id);
        if (task) {
          populateTaskForm(task, taskManager.getAllTasks());
          openModal('taskModal');
        }
      } else if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        appState.taskToDeleteId = id;

        const result = taskManager.deleteTask(id, false);
        if (!result.success && result.requiresConfirmation) {
          // Open confirm modal with warning message
          document.getElementById('deleteConfirmMessage').innerHTML = `
            <strong>Warning:</strong> Task "${result.dependentTitles.join(', ')}" depends on this task.<br><br>
            Deleting it will safely clean references, but may unlock dependent tasks. Continue?
          `;
          openModal('deleteModal');
        } else if (result.success) {
          showToast('Task deleted', 'info');
          refreshAppUI();
        }
      }
    });
  }

  // Confirm Delete Action
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      if (appState.taskToDeleteId) {
        taskManager.deleteTask(appState.taskToDeleteId, true);
        showToast('Task deleted successfully', 'info');
        appState.taskToDeleteId = null;
        closeModal('deleteModal');
        refreshAppUI();
      }
    });
  }
};

// Demo Scenario Quick-Demonstration Controls (For Examiner Viva)
const initDemoScenarioButtons = () => {
  const resetBtn = document.getElementById('demoResetBtn');
  const completeDepBtn = document.getElementById('demoCompleteDepBtn');
  const tryLockedBtn = document.getElementById('demoTryLockedBtn');
  const showChainBtn = document.getElementById('demoShowChainBtn');

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      taskManager.resetDemoWorkspace();
      refreshAppUI();
      showToast('Demo scenario workspace reset to initial state', 'success');
    });
  }

  if (completeDepBtn) {
    completeDepBtn.addEventListener('click', () => {
      // Find task-5 (Authentication & Session Service) and mark it Done
      const task5 = taskManager.getTaskById('task-5');
      if (task5) {
        const res = taskManager.moveTaskStatus('task-5', 'Done');
        if (res.success) {
          showToast('✓ Marked "Authentication & Session Service" as Done! "Kanban Dashboard UI Integration" is now UNLOCKED!', 'success', 5000);
          refreshAppUI();
        }
      } else {
        showToast('Task-5 not found. Reset demo first.', 'warning');
      }
    });
  }

  if (tryLockedBtn) {
    tryLockedBtn.addEventListener('click', () => {
      // Attempt to move locked task-7 to In Progress
      const task7 = taskManager.getTaskById('task-7');
      if (task7) {
        const res = taskManager.moveTaskStatus('task-7', 'In Progress');
        if (!res.success) {
          showToast(`🔒 Anti-Cheat Action: ${res.message}`, 'error', 6000);
          renderDependencyInspector(task7, taskManager.getAllTasks());
          openModal('inspectorModal');
        }
      } else {
        showToast('Task-7 not found. Reset demo first.', 'warning');
      }
    });
  }

  if (showChainBtn) {
    showChainBtn.addEventListener('click', () => {
      const task7 = taskManager.getTaskById('task-7');
      if (task7) {
        renderDependencyInspector(task7, taskManager.getAllTasks());
        openModal('inspectorModal');
      }
    });
  }
};

// JSON Import / Export Handlers
const initJsonImportExport = () => {
  const exportBtn = document.getElementById('exportJsonBtn');
  const importBtn = document.getElementById('importJsonBtn');
  const fileInput = document.getElementById('jsonFileInput');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportBoardAsJSON(taskManager.getAllTasks());
      showToast('Board exported as JSON file', 'success');
    });
  }

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = parseAndValidateImportedJSON(event.target.result);
        if (result.success) {
          taskManager.importBoardTasks(result.tasks);
          refreshAppUI();
          showToast(`Successfully imported ${result.tasks.length} tasks!`, 'success');
        } else {
          showToast(`Import Error: ${result.error}`, 'error', 6000);
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }
};
