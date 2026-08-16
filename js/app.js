/**
 * FlowLock — Main Application Controller
 * ES6 Modules · HTML5 Drag & Drop · Event Delegation · State Management
 */

import { checkAuthGuard, logoutUser } from './auth.js';
import { taskManager } from './taskManager.js';
import {
  renderMetrics,
  renderKanbanBoard,
  renderDependencyInspector,
  populateTaskForm,
  renderActivityLog
} from './ui.js';
import { validateTaskForm, renderFormErrors } from './validation.js';
import { showToast, debounce } from './utils.js';
import { savePreferences, loadPreferences, exportBoardAsJSON, parseAndValidateImportedJSON } from './storage.js';

// ─── Global App State ────────────────────────────────────────────────────────
const appState = {
  searchQuery: '',
  filterStatus: 'all',
  sortBy: 'priority',
  draggedTaskId: null,
  taskToDeleteId: null
};

// ─── Boot ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. Auth guard — redirects to index.html if not logged in
  const user = checkAuthGuard('dashboard');
  if (user) {
    const el = document.getElementById('userName');
    if (el) el.textContent = user.name || 'Diksha';
  }

  // 2. Load saved theme preference
  const prefs = loadPreferences();
  if (prefs.theme) {
    document.documentElement.setAttribute('data-theme', prefs.theme);
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.textContent = prefs.theme === 'dark' ? '🌙' : '☀️';
  }

  // 3. Render initial state
  refreshAppUI();

  // 4. Attach all event listeners
  initThemeToggle();
  initToolbarListeners();
  initKanbanDragAndDrop();
  initModalListeners();
  initDemoScenarioButtons();
  initJsonImportExport();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
});

// ─── Full UI Refresh ──────────────────────────────────────────────────────────
export const refreshAppUI = () => {
  const allTasks = taskManager.getAllTasks();
  const filteredTasks = taskManager.getFilteredTasks({
    search: appState.searchQuery,
    filterStatus: appState.filterStatus,
    sortBy: appState.sortBy
  });
  const metrics = taskManager.getMetrics();
  const activities = taskManager.getRecentActivities(20);

  renderMetrics(metrics);
  renderKanbanBoard(filteredTasks, allTasks);
  renderActivityLog(activities);
};

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
const initThemeToggle = () => {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    savePreferences({ theme: next });
    btn.textContent = next === 'dark' ? '🌙' : '☀️';
    showToast(`Switched to ${next} mode`, 'info');
  });
};

// ─── Toolbar: Search, Filter, Sort ───────────────────────────────────────────
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

// ─── Kanban Drag & Drop ───────────────────────────────────────────────────────
const initKanbanDragAndDrop = () => {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  // Drag start / end delegated on board
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
    document.querySelectorAll('.task-list').forEach(l => l.classList.remove('drag-over'));
    appState.draggedTaskId = null;
  });

  // Column drop zones
  document.querySelectorAll('.task-list').forEach(list => {
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

      handleTaskMove(taskId, targetStatus);
    });
  });
};

// Shared task-move handler used by drag-drop AND demo buttons
const handleTaskMove = (taskId, targetStatus) => {
  const result = taskManager.moveTaskStatus(taskId, targetStatus);

  if (!result.success) {
    // Anti-cheat: shake animation + error toast + auto-open inspector
    const cardEl = document.getElementById(`card-${taskId}`);
    if (cardEl) {
      cardEl.classList.add('shake');
      setTimeout(() => cardEl.classList.remove('shake'), 600);
    }
    showToast(`🔒 ${result.message}`, 'error', 5000);

    const task = taskManager.getTaskById(taskId);
    if (task && task.locked) {
      renderDependencyInspector(task, taskManager.getAllTasks());
      openModal('inspectorModal');
    }
  } else {
    showToast(`✓ "${result.task.title}" → ${targetStatus}`, 'success');
    refreshAppUI();
  }
  return result;
};

// ─── Modal Helpers ────────────────────────────────────────────────────────────
export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
};

export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
};

// ─── Modal Event Listeners ────────────────────────────────────────────────────
const initModalListeners = () => {
  // Backdrop click to close
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  });

  // Close buttons
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) modal.classList.remove('active');
    });
  });

  // "New Task" button in toolbar
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      populateTaskForm(null, taskManager.getAllTasks());
      openModal('taskModal');
    });
  }

  // Task form submit (handles both CREATE and EDIT)
  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Clear old errors
      taskForm.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));

      const taskId = document.getElementById('taskIdInput').value.trim();
      const title = document.getElementById('taskTitle').value.trim();
      const description = document.getElementById('taskDescription').value.trim();
      const priority = document.getElementById('taskPriority').value;
      const assignee = document.getElementById('taskAssignee').value.trim();
      const dueDate = document.getElementById('taskDueDate').value;
      const status = document.getElementById('taskStatus').value;

      const depCheckboxes = taskForm.querySelectorAll('input[name="dependsOn"]:checked');
      const dependsOn = Array.from(depCheckboxes).map(cb => cb.value);

      const formData = { title, description, priority, assignee, dueDate, status, dependsOn };

      // Validate
      const validation = validateTaskForm(formData, taskId, taskManager.getAllTasks());
      if (!validation.isValid) {
        renderFormErrors(taskForm, validation.errors);
        return;
      }

      let result;
      if (taskId) {
        result = taskManager.updateTask(taskId, formData);
        if (result.success) {
          showToast(`✓ Updated "${result.task.title}"`, 'success');
        }
      } else {
        result = taskManager.addTask(formData);
        if (result.success) {
          showToast(`✓ Created "${result.task.title}"`, 'success');
        }
      }

      if (!result.success) {
        showToast(`Error: ${result.message}`, 'error');
        return;
      }

      closeModal('taskModal');
      refreshAppUI();
    });
  }

  // Delegated card actions: Inspect, Edit, Delete
  const board = document.getElementById('kanbanBoard');
  if (board) {
    board.addEventListener('click', (e) => {
      const inspectBtn = e.target.closest('.btn-inspect');
      const editBtn = e.target.closest('.btn-edit');
      const deleteBtn = e.target.closest('.btn-delete');

      if (inspectBtn) {
        const task = taskManager.getTaskById(inspectBtn.dataset.id);
        if (task) {
          renderDependencyInspector(task, taskManager.getAllTasks());
          openModal('inspectorModal');
        }
      } else if (editBtn) {
        const task = taskManager.getTaskById(editBtn.dataset.id);
        if (task) {
          populateTaskForm(task, taskManager.getAllTasks());
          openModal('taskModal');
        }
      } else if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        appState.taskToDeleteId = id;

        const result = taskManager.deleteTask(id, false);
        if (!result.success && result.requiresConfirmation) {
          document.getElementById('deleteConfirmMessage').innerHTML = `
            <strong>Warning:</strong> The following tasks depend on this:<br>
            <em>${result.dependentTitles.join(', ')}</em><br><br>
            Deleting it will remove the dependency reference. Continue?
          `;
          openModal('deleteModal');
        } else if (result.success) {
          showToast('Task deleted.', 'info');
          refreshAppUI();
        }
      }
    });
  }

  // Confirm delete
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      if (appState.taskToDeleteId) {
        taskManager.deleteTask(appState.taskToDeleteId, true);
        showToast('Task deleted.', 'info');
        appState.taskToDeleteId = null;
        closeModal('deleteModal');
        refreshAppUI();
      }
    });
  }
};

// ─── Demo Scenario Buttons ────────────────────────────────────────────────────
const initDemoScenarioButtons = () => {
  const resetBtn = document.getElementById('demoResetBtn');
  const completeDepBtn = document.getElementById('demoCompleteDepBtn');
  const tryLockedBtn = document.getElementById('demoTryLockedBtn');
  const showChainBtn = document.getElementById('demoShowChainBtn');

  // Reset workspace to seed state
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      taskManager.resetDemoWorkspace();
      refreshAppUI();
      showToast('Workspace reset to initial demo state', 'success');
    });
  }

  // Complete a blocking prerequisite → unlock a downstream task
  if (completeDepBtn) {
    completeDepBtn.addEventListener('click', () => {
      // Find the first blocking dependency (an incomplete dep of a locked task)
      const blocking = taskManager.getFirstBlockingDependency();
      if (!blocking) {
        showToast('No blocking dependencies found. Try resetting the workspace first.', 'warning');
        return;
      }
      const result = taskManager.moveTaskStatus(blocking.id, 'Done');
      if (result.success) {
        const unlocked = result.affectedDependents || [];
        const unlockedNames = unlocked.filter(t => !t.locked).map(t => t.title).join(', ');
        showToast(
          `✓ "${blocking.title}" marked Done!${unlockedNames ? ` Unlocked: ${unlockedNames}` : ''}`,
          'success',
          5000
        );
        refreshAppUI();
      } else {
        showToast(`Could not mark Done: ${result.message}`, 'error');
      }
    });
  }

  // Try to move a locked task — triggers anti-cheat
  if (tryLockedBtn) {
    tryLockedBtn.addEventListener('click', () => {
      const locked = taskManager.getFirstLockedTask();
      if (!locked) {
        showToast('No locked tasks found right now. Try resetting the workspace.', 'warning');
        return;
      }
      handleTaskMove(locked.id, 'In Progress');
    });
  }

  // Show dependency chain for first locked task
  if (showChainBtn) {
    showChainBtn.addEventListener('click', () => {
      const locked = taskManager.getFirstLockedTask();
      if (!locked) {
        showToast('No locked tasks to inspect. Try resetting the workspace.', 'warning');
        return;
      }
      renderDependencyInspector(locked, taskManager.getAllTasks());
      openModal('inspectorModal');
    });
  }
};

// ─── JSON Import / Export ─────────────────────────────────────────────────────
const initJsonImportExport = () => {
  const exportBtn = document.getElementById('exportJsonBtn');
  const importBtn = document.getElementById('importJsonBtn');
  const fileInput = document.getElementById('jsonFileInput');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportBoardAsJSON(taskManager.getAllTasks());
      showToast('Board exported as JSON', 'success');
    });
  }

  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = parseAndValidateImportedJSON(event.target.result);
        if (result.success) {
          taskManager.importBoardTasks(result.tasks);
          refreshAppUI();
          showToast(`Imported ${result.tasks.length} tasks successfully!`, 'success');
        } else {
          showToast(`Import Error: ${result.error}`, 'error', 6000);
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }
};
