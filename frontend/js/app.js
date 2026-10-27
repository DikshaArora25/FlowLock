import { checkAuthGuard, logoutUser } from './auth.js';
import { taskManager } from './taskManager.js';
import {
  renderMetrics,
  renderDashboardLoading,
  renderKanbanBoard,
  renderDependencyInspector,
  populateTaskForm,
  renderActivityLog
} from './ui.js';
import { validateTaskForm, renderFormErrors } from './validation.js';
import { canMoveTask } from './dependencyEngine.js';
import { showToast, debounce, escapeHtml } from './utils.js';
import { savePreferences, loadPreferences, exportBoardAsJSON, parseAndValidateImportedJSON } from './storage.js';

const appState = {
  searchQuery: '',
  filterStatus: 'all',
  sortBy: 'priority',
  draggedTaskId: null,
  taskToDeleteId: null
};

document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard — redirects to login.html if not logged in
  const user = checkAuthGuard('dashboard');
  if (user) {
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = user.name || 'User';

    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
  }

  const prefs = loadPreferences();
  if (prefs.theme) {
    document.documentElement.setAttribute('data-theme', prefs.theme);
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.textContent = prefs.theme === 'dark' ? '🌙' : '☀️';
  }

  // Show dashboard skeleton loader while fetching
  renderDashboardLoading(true);

  // Authoritatively fetch tasks from MongoDB backend
  const loadResult = await taskManager.loadFromAPI();
  if (!loadResult.success) {
    showToast(`⚠️ Server Connection: ${loadResult.message}`, 'error', 7000);
  }

  refreshAppUI();

  initThemeToggle();
  initToolbarListeners();
  initKanbanDragAndDrop();
  initModalListeners();
  initDemoScenarioButtons();
  initJsonImportExport();

  // Handle #inspector URL hash navigation
  const handleHashRouting = () => {
    if (window.location.hash === '#inspector') {
      const targetTask = taskManager.getFirstLockedTask() || taskManager.getAllTasks()[0];
      if (targetTask) {
        renderDependencyInspector(targetTask, taskManager.getAllTasks());
        openModal('inspectorModal');
      }
    }
  };
  handleHashRouting();
  window.addEventListener('hashchange', handleHashRouting);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

  const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
  if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', logoutUser);
});

export const refreshAppUI = () => {
  const allTasks = taskManager.getAllTasks();
  const filteredTasks = taskManager.getFilteredTasks({
    search: appState.searchQuery,
    filterStatus: appState.filterStatus,
    sortBy: appState.sortBy
  });
  const metrics = taskManager.getMetrics();
  const activities = taskManager.getRecentActivities(20);

  renderMetrics(metrics, appState.filterStatus);
  renderKanbanBoard(filteredTasks, allTasks);
  renderActivityLog(activities);
};

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

const initToolbarListeners = () => {
  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const sortSelect = document.getElementById('sortSelect');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        appState.searchQuery = e.target.value;
        refreshAppUI();
      }, 200)
    );
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

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      appState.searchQuery = '';
      appState.filterStatus = 'all';
      appState.sortBy = 'priority';

      if (searchInput) searchInput.value = '';
      if (filterSelect) filterSelect.value = 'all';
      if (sortSelect) sortSelect.value = 'priority';

      refreshAppUI();
    });
  }

  // Interactive metric card click filtering
  const metricsGrid = document.getElementById('metricsGrid');
  if (metricsGrid) {
    metricsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.metric-card[data-filter]');
      if (!card) return;
      const filter = card.dataset.filter;
      appState.filterStatus = filter;
      if (filterSelect) filterSelect.value = filter;
      refreshAppUI();
    });
  }

  // Workspace Sync button
  const syncBtn = document.getElementById('syncBoardBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      syncBtn.textContent = '🔄 Syncing...';
      const res = await taskManager.loadFromAPI();
      syncBtn.disabled = false;
      syncBtn.textContent = '🔄 Sync';
      if (res.success) {
        showToast('✓ Workspace synced from backend', 'success');
      } else {
        showToast(`⚠️ Server notice: ${res.message}`, 'info');
      }
      refreshAppUI();
    });
  }
};

const initKanbanDragAndDrop = () => {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;

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
    appState.draggedTaskId = null;

    document.querySelectorAll('.task-list').forEach(list => {
      list.classList.remove('drag-over');
    });
  });

  document.querySelectorAll('.task-list').forEach(list => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      list.classList.add('drag-over');
    });

    list.addEventListener('dragleave', (e) => {
      if (!list.contains(e.relatedTarget)) {
        list.classList.remove('drag-over');
      }
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

// Task move handler (validates locks and triggers anti-cheat feedback when blocked)
const handleTaskMove = async (taskId, targetStatus) => {
  const task = taskManager.getTaskById(taskId);
  if (!task) return;

  if (task.status === targetStatus) return;

  // Pre-validate against dependency rules
  const validation = canMoveTask(task, targetStatus, taskManager.getAllTasks());
  if (!validation.allowed) {
    // Anti-cheat: shake animation + error toast + auto-open inspector
    const cardEl = document.getElementById(`card-${taskId}`);
    if (cardEl) {
      cardEl.classList.add('shake');
      setTimeout(() => cardEl.classList.remove('shake'), 600);
    }
    showToast(`🔒 ${validation.reason}`, 'error', 5000);

    renderDependencyInspector(task, taskManager.getAllTasks());
    openModal('inspectorModal');
    return { success: false, message: validation.reason, blockingTasks: validation.blockingTasks };
  }

  // Persist status change to MongoDB through API
  const result = await taskManager.moveTaskStatus(taskId, targetStatus);

  if (!result.success) {
    const cardEl = document.getElementById(`card-${taskId}`);
    if (cardEl) {
      cardEl.classList.add('shake');
      setTimeout(() => cardEl.classList.remove('shake'), 600);
    }
    showToast(`🔒 ${result.message}`, 'error', 5000);

    const refreshedTask = taskManager.getTaskById(taskId);
    if (refreshedTask && refreshedTask.locked) {
      renderDependencyInspector(refreshedTask, taskManager.getAllTasks());
      openModal('inspectorModal');
    }
  } else {
    showToast(`✓ "${result.task.title}" → ${targetStatus}`, 'success');
    refreshAppUI();
  }
  return result;
};

export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
};

export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    if (modalId === 'deleteModal') {
      appState.taskToDeleteId = null;
    }
  }
};

const initModalListeners = () => {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
        if (backdrop.id === 'deleteModal') {
          appState.taskToDeleteId = null;
        }
      }
    });
  });

  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) {
        modal.classList.remove('active');
        if (modal.id === 'deleteModal') {
          appState.taskToDeleteId = null;
        }
      }
    });
  });

  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      populateTaskForm(null, taskManager.getAllTasks());
      openModal('taskModal');
    });
  }

  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();

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

      const validation = validateTaskForm(formData, taskId, taskManager.getAllTasks());
      if (!validation.isValid) {
        renderFormErrors(taskForm, validation.errors);
        const firstErrorField = Object.keys(validation.errors)[0];
        const firstErrorMessage = validation.errors[firstErrorField];
        showToast(firstErrorMessage, 'error');
        return;
      }

      let result;
      if (taskId) {
        result = await taskManager.updateTask(taskId, formData);
        if (result.success) {
          showToast(`✓ Updated "${result.task.title}"`, 'success');
        }
      } else {
        result = await taskManager.addTask(formData);
        if (result.success) {
          showToast(`✓ Created "${result.task.title}"`, 'success');
        }
      }

      if (!result.success) {
        showToast(`Error: ${result.message}`, 'error');
        return;
      }

      appState.searchQuery = '';
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = '';
      
      closeModal('taskModal');
      refreshAppUI();
    });
  }

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
        if (!id) return;

        const task = taskManager.getTaskById(id);
        if (!task) {
          showToast('Task not found.', 'error');
          return;
        }

        appState.taskToDeleteId = id;

        const dependentTasks = taskManager.getAllTasks().filter(t => Array.isArray(t.dependsOn) && t.dependsOn.includes(id));
        let confirmMsg = `Are you sure you want to delete the task "${escapeHtml(task.title)}"?`;
        if (dependentTasks.length > 0) {
          confirmMsg = `
            <strong>Warning:</strong> The following tasks depend on this:<br>
            <em>${dependentTasks.map(t => escapeHtml(t.title)).join(', ')}</em><br><br>
            Deleting it will remove the dependency reference. Continue?
          `;
        }
        const msgEl = document.getElementById('deleteConfirmMessage');
        if (msgEl) msgEl.innerHTML = confirmMsg;
        openModal('deleteModal');
      }
    });
  }

  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      const taskId = appState.taskToDeleteId;
      if (!taskId) {
        showToast('No task selected for deletion.', 'error');
        closeModal('deleteModal');
        return;
      }

      const result = await taskManager.deleteTask(taskId, true);
      if (result.success) {
        showToast('Task deleted successfully.', 'success');
        appState.taskToDeleteId = null;
        closeModal('deleteModal');
        refreshAppUI();
      } else {
        showToast(result.message || 'Failed to delete task.', 'error');
        appState.taskToDeleteId = null;
        closeModal('deleteModal');
      }
    });
  }
};

const initDemoScenarioButtons = () => {
  const resetBtn = document.getElementById('demoResetBtn');
  const completeDepBtn = document.getElementById('demoCompleteDepBtn');
  const tryLockedBtn = document.getElementById('demoTryLockedBtn');
  const showChainBtn = document.getElementById('demoShowChainBtn');
  const sidebarInspectBtn = document.getElementById('sidebarInspectBtn');

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      await taskManager.resetDemoWorkspace();
      refreshAppUI();
      showToast('Workspace reset to initial demo state in MongoDB', 'success');
    });
  }

  if (completeDepBtn) {
    completeDepBtn.addEventListener('click', async () => {
      const blocking = taskManager.getFirstBlockingDependency();
      if (!blocking) {
        showToast('No blocking dependencies found. Try resetting the workspace first.', 'warning');
        return;
      }
      const result = await taskManager.moveTaskStatus(blocking.id, 'Done');
      if (result.success) {
        const unlocked = result.affectedDependents || [];
        const unlockedNames = unlocked.filter(t => !t.locked).map(t => t.title).join(', ');
        showToast(
          unlockedNames
            ? `✓ Completed "${blocking.title}"! Unblocked: ${unlockedNames}`
            : `✓ Completed "${blocking.title}"!`,
          'success',
          5000
        );
        refreshAppUI();
      } else {
        showToast(result.message, 'error');
      }
    });
  }

  if (tryLockedBtn) {
    tryLockedBtn.addEventListener('click', () => {
      const locked = taskManager.getFirstLockedTask();
      if (!locked) {
        showToast('No locked tasks in workspace. Reset workspace to try this demo.', 'warning');
        return;
      }
      // Demonstrate blocked-move anti-cheat behavior without modifying real tasks
      const cardEl = document.getElementById(`card-${locked.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        cardEl.classList.add('shake');
        setTimeout(() => cardEl.classList.remove('shake'), 600);
      }
      const validation = canMoveTask(locked, 'In Progress', taskManager.getAllTasks());
      showToast(`🔒 ${validation.reason || `Task "${locked.title}" is locked.`}`, 'error', 5000);
      renderDependencyInspector(locked, taskManager.getAllTasks());
      openModal('inspectorModal');
    });
  }

  const openInspectorForFirstLocked = () => {
    const locked = taskManager.getFirstLockedTask();
    if (!locked) {
      showToast('No locked tasks currently in workspace.', 'info');
      return;
    }
    renderDependencyInspector(locked, taskManager.getAllTasks());
    openModal('inspectorModal');
  };

  if (showChainBtn) {
    showChainBtn.addEventListener('click', () => {
      openInspectorForFirstLocked();
    });
  }

  if (sidebarInspectBtn) {
    sidebarInspectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInspectorForFirstLocked();
    });
  }
};

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
      reader.onload = async (event) => {
        const result = parseAndValidateImportedJSON(event.target.result);
        if (result.success) {
          const importResult = await taskManager.importBoardTasks(result.tasks);
          if (importResult.success) {
            refreshAppUI();
            showToast(`Imported ${result.tasks.length} tasks successfully to MongoDB!`, 'success');
          } else {
            showToast(`Import failed: ${importResult.message}`, 'error', 6000);
          }
        } else {
          showToast(`Import Error: ${result.error}`, 'error', 6000);
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }
};
