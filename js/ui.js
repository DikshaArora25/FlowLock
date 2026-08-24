import { escapeHtml, formatDate } from './utils.js';
import { getBlockingDependencies } from './dependencyEngine.js';
import { getCurrentUser } from './auth.js';

export const renderMetrics = (metrics) => {
  const container = document.getElementById('metricsGrid');
  if (!container) return;

  container.innerHTML = `
    <div class="metric-card">
      <span class="metric-label">Total Tasks</span>
      <span class="metric-value">${metrics.total}</span>
      <span class="metric-sub">${metrics.withDeps} with dependencies</span>
    </div>
    <div class="metric-card todo">
      <span class="metric-label">Todo</span>
      <span class="metric-value">${metrics.todo}</span>
      <span class="metric-sub">Ready to start</span>
    </div>
    <div class="metric-card in-progress">
      <span class="metric-label">In Progress</span>
      <span class="metric-value">${metrics.inProgress}</span>
      <span class="metric-sub">Currently active</span>
    </div>
    <div class="metric-card done">
      <span class="metric-label">Done</span>
      <span class="metric-value">${metrics.done}</span>
      <span class="metric-sub">Completed</span>
    </div>
    <div class="metric-card locked">
      <span class="metric-label">Locked Tasks</span>
      <span class="metric-value">${metrics.locked}</span>
      <span class="metric-sub">Blocked by dependencies</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Completion %</span>
      <span class="metric-value">${metrics.completionRate}%</span>
      <span class="metric-sub">Overall progress</span>
    </div>
  `;
};

export const createTaskCardElement = (task, allTasks) => {
  const card = document.createElement('div');
  card.className = `task-card ${task.locked ? 'is-locked' : ''}`;
  card.id = `card-${task.id}`;
  card.dataset.taskId = task.id;
  card.draggable = true;

  const depCount = Array.isArray(task.dependsOn) ? task.dependsOn.length : 0;
  const blocking = task.locked ? getBlockingDependencies(task, allTasks) : [];
  const blockingNames = blocking.map(b => b.title).join(', ');

  const priorityClass = `priority-${(task.priority || 'medium').toLowerCase()}`;

  card.innerHTML = `
    <div class="card-header">
      <h4 class="card-title">${escapeHtml(task.title)}</h4>
      ${task.locked 
        ? `<span class="card-lock-badge locked" title="Blocked by: ${escapeHtml(blockingNames)}">🔒 BLOCKED</span>`
        : (depCount > 0 
            ? `<span class="card-lock-badge unlocked">🔓 READY</span>`
            : '')
      }
    </div>

    <p class="card-description">${escapeHtml(task.description)}</p>

    ${depCount > 0 ? `
      <div class="card-dependencies-info">
        <span>🔗 ${depCount} Dependenc${depCount > 1 ? 'ies' : 'y'}</span>
        ${task.locked ? `<span style="color: var(--status-locked); font-size:10px;">Waiting: ${escapeHtml(blocking[0] ? blocking[0].title : 'Incomplete')}</span>` : '<span style="color: var(--status-done); font-size:10px;">All Done</span>'}
      </div>
    ` : ''}

    <div class="card-meta">
      <span class="card-priority ${escapeHtml(priorityClass)}">⚡ ${escapeHtml(task.priority)}</span>
      <span class="card-assignee">👤 ${escapeHtml(task.assignee)}</span>
    </div>

    <div class="card-meta" style="padding-top: 4px; border: none;">
      <span style="font-size: 10px;">📅 ${escapeHtml(formatDate(task.dueDate))}</span>
    </div>

    <div class="card-actions">
      <button class="card-btn btn-inspect" data-id="${escapeHtml(task.id)}" title="View Dependency Inspector">🔍 Inspect Graph</button>
      <button class="card-btn btn-edit" data-id="${escapeHtml(task.id)}" title="Edit Task">✏️ Edit</button>
      <button class="card-btn btn-delete" data-id="${escapeHtml(task.id)}" title="Delete Task">🗑️ Delete</button>
    </div>
  `;

  return card;
};

export const renderKanbanBoard = (tasks, allTasks) => {
  const columns = {
    'Backlog': document.getElementById('list-Backlog'),
    'Todo': document.getElementById('list-Todo'),
    'In Progress': document.getElementById('list-In Progress'),
    'Done': document.getElementById('list-Done')
  };

  Object.keys(columns).forEach(status => {
    if (columns[status]) {
      columns[status].innerHTML = '';
    }
  });

  const counts = { 'Backlog': 0, 'Todo': 0, 'In Progress': 0, 'Done': 0 };

  tasks.forEach(task => {
    const listEl = columns[task.status];
    if (listEl) {
      const cardEl = createTaskCardElement(task, allTasks);
      listEl.appendChild(cardEl);
      counts[task.status]++;
    }
  });

  Object.keys(counts).forEach(status => {
    const badge = document.getElementById(`count-${status.replace(/\s+/g, '')}`);
    if (badge) {
      badge.textContent = counts[status];
    }
  });

  Object.keys(columns).forEach(status => {
    const listEl = columns[status];
    if (listEl && counts[status] === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'column-empty-state';
      emptyEl.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; border: 1px dashed var(--border-color); border-radius: var(--radius-md); color: var(--text-dim); text-align: center; font-size: 12px; height: 120px;';
      
      let emptyMsg = 'No tasks here yet.';
      if (status === 'Todo') {
        emptyMsg = 'No tasks here yet.<br><span style="font-size:11px;color:var(--accent-primary);cursor:pointer;font-weight:600;margin-top:4px;" id="empty-state-add-btn">+ Add Task</span>';
      } else if (status === 'In Progress') {
        emptyMsg = 'Move a ready task here when work begins.';
      }
      
      emptyEl.innerHTML = emptyMsg;
      listEl.appendChild(emptyEl);
      
      if (status === 'Todo') {
        const addBtn = emptyEl.querySelector('#empty-state-add-btn');
        if (addBtn) {
          addBtn.addEventListener('click', () => {
            const actAddBtn = document.getElementById('addTaskBtn');
            if (actAddBtn) actAddBtn.click();
          });
        }
      }
    }
  });
};

export const renderDependencyInspector = (task, allTasks) => {
  const modalTitle = document.getElementById('inspectorModalTitle');
  const modalBody = document.getElementById('inspectorModalBody');
  if (!modalTitle || !modalBody) return;

  modalTitle.textContent = `Dependency Graph: ${task.title}`;

  const taskMap = new Map(allTasks.map(t => [t.id, t]));
  
  const getTaskState = (t) => {
    if (t.status === 'Done') return { text: 'DONE', class: 'done', icon: '🟢' };
    if (t.locked) return { text: 'BLOCKED', class: 'blocking', icon: '🔒' };
    if (t.status === 'In Progress') return { text: 'IN PROGRESS', class: 'pending', icon: '🟡' };
    return { text: 'READY', class: 'ready', icon: '🔵' };
  };

  let html = `<div class="inspector-wrapper" style="display: flex; flex-direction: column; gap: 20px;">`;

  html += `<div>
    <h4 style="font-size: 13px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
      🔗 DEPENDS ON (Prerequisites)
    </h4>
    <div class="inspector-chain">`;

  if (!task.dependsOn || task.dependsOn.length === 0) {
    html += `
      <div style="padding: 12px; border: 1px dashed var(--border-color); border-radius: var(--radius-md); text-align: center; color: var(--text-dim); font-size: 12px;">
        No prerequisites. This task can be started immediately.
      </div>`;
  } else {
    task.dependsOn.forEach((depId, index) => {
      const depTask = taskMap.get(depId);
      if (depTask) {
        const state = getTaskState(depTask);
        html += `
          <div class="inspector-node ${state.class}">
            <span class="node-status-icon">${state.icon}</span>
            <div class="node-info" style="flex: 1;">
              <span class="node-title" style="font-weight: 600; font-size: 13px;">${escapeHtml(depTask.title)}</span>
              <div class="node-meta" style="font-size: 11px; color: var(--text-muted); display: flex; gap: 10px; margin-top: 2px;">
                <span>State: <strong class="priority-${state.class}">${state.text}</strong></span>
                <span>Assignee: ${escapeHtml(depTask.assignee)}</span>
              </div>
            </div>
          </div>
        `;
        if (index < task.dependsOn.length - 1) {
          html += `<div class="inspector-arrow" style="text-align: center; color: var(--text-dim); margin: 2px 0;">↓</div>`;
        }
      } else {
        html += `
          <div class="inspector-node blocking">
            <span class="node-status-icon">⚠️</span>
            <div class="node-info" style="flex: 1;">
              <span class="node-title" style="font-weight: 600; font-size: 13px;">Missing Task (ID: ${depId})</span>
              <div class="node-meta" style="font-size: 11px; color: var(--text-muted); display: flex; gap: 10px; margin-top: 2px;">
                <span>State: <strong class="priority-blocking">UNKNOWN</strong></span>
              </div>
            </div>
          </div>
        `;
        if (index < task.dependsOn.length - 1) {
          html += `<div class="inspector-arrow" style="text-align: center; color: var(--text-dim); margin: 2px 0;">↓</div>`;
        }
      }
    });
  }
  html += `</div></div>`;

  const currentStat = getTaskState(task);
  html += `
    <div style="margin: 10px 0; text-align: center; display: flex; flex-direction: column; align-items: center;">
      <div style="color: var(--text-dim); margin-bottom: 6px;">▼</div>
      <div class="inspector-node current" style="border: 2px solid var(--accent-primary); width: 100%;">
        <span class="node-status-icon">${currentStat.icon}</span>
        <div class="node-info" style="text-align: left; flex: 1;">
          <span class="node-title" style="font-weight: 700; font-size: 14px; color: var(--accent-primary);">${escapeHtml(task.title)} (Target)</span>
          <div class="node-meta" style="font-size: 11px; color: var(--text-muted); display: flex; gap: 10px; margin-top: 2px;">
            <span>State: <strong>${currentStat.text}</strong></span>
            <span>Column: ${task.status}</span>
          </div>
        </div>
      </div>
      <div style="color: var(--text-dim); margin-top: 6px;">▼</div>
    </div>
  `;

  const dependents = allTasks.filter(t => Array.isArray(t.dependsOn) && t.dependsOn.includes(task.id));
  html += `<div>
    <h4 style="font-size: 13px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
      🚫 BLOCKS (Downstream Dependents)
    </h4>
    <div class="inspector-chain">`;

  if (dependents.length === 0) {
    html += `
      <div style="padding: 12px; border: 1px dashed var(--border-color); border-radius: var(--radius-md); text-align: center; color: var(--text-dim); font-size: 12px;">
        No downstream tasks depend on this.
      </div>`;
  } else {
    dependents.forEach((depTask, index) => {
      const state = getTaskState(depTask);
      html += `
        <div class="inspector-node ${state.class}">
          <span class="node-status-icon">${state.icon}</span>
          <div class="node-info" style="flex: 1;">
            <span class="node-title" style="font-weight: 600; font-size: 13px;">${escapeHtml(depTask.title)}</span>
            <div class="node-meta" style="font-size: 11px; color: var(--text-muted); display: flex; gap: 10px; margin-top: 2px;">
              <span>State: <strong class="priority-${state.class}">${state.text}</strong></span>
              <span>Assignee: ${escapeHtml(depTask.assignee)}</span>
            </div>
          </div>
        </div>
      `;
      if (index < dependents.length - 1) {
        html += `<div class="inspector-arrow" style="text-align: center; color: var(--text-dim); margin: 2px 0;">↓</div>`;
      }
    });
  }
  html += `</div></div>`;

  html += `</div>`;
  modalBody.innerHTML = html;
};

export const populateTaskForm = (task = null, allTasks = []) => {
  const form = document.getElementById('taskForm');
  if (!form) return;

  const currentTaskId = task ? task.id : '';
  document.getElementById('taskIdInput').value = currentTaskId;
  document.getElementById('formTitle').textContent = task ? 'Edit Task' : 'Create New Task';

  const submitBtn = document.getElementById('submitTaskBtn');
  if (submitBtn) {
    submitBtn.textContent = task ? 'Save Changes' : 'Create Task';
  }

  const currentUser = getCurrentUser();
  const defaultAssignee = currentUser && currentUser.name ? currentUser.name : 'Unassigned';

  document.getElementById('taskTitle').value = task ? task.title : '';
  document.getElementById('taskDescription').value = task ? task.description : '';
  document.getElementById('taskPriority').value = task ? task.priority : 'Medium';
  document.getElementById('taskAssignee').value = task ? task.assignee : defaultAssignee;
  document.getElementById('taskDueDate').value = task ? task.dueDate : '';
  document.getElementById('taskStatus').value = task ? task.status : 'Todo';

  // Render Dependency Select Checkboxes (excluding current task to prevent immediate self-dependency)
  const depContainer = document.getElementById('dependencyCheckboxes');
  depContainer.innerHTML = '';

  const availableTasks = allTasks.filter(t => t.id !== currentTaskId);

  if (availableTasks.length === 0) {
    depContainer.innerHTML = `<span style="font-size: 12px; color: var(--text-dim);">No other tasks available for dependency selection.</span>`;
  } else {
    availableTasks.forEach(t => {
      const isChecked = task && Array.isArray(task.dependsOn) && task.dependsOn.includes(t.id);
      const item = document.createElement('label');
      item.className = 'dependency-checkbox-item';
      item.innerHTML = `
        <input type="checkbox" name="dependsOn" value="${t.id}" ${isChecked ? 'checked' : ''}>
        <span style="font-size: 12px; color: var(--text-main);">${escapeHtml(t.title)}</span>
        <span style="font-size: 10px; color: var(--text-dim); margin-left: auto;">(${t.status})</span>
      `;
      depContainer.appendChild(item);
    });
  }
};

export const renderActivityLog = (activities) => {
  const container = document.getElementById('activityList');
  if (!container) return;

  if (activities.length === 0) {
    container.innerHTML = `<div style="font-size: 12px; color: var(--text-dim);">No recent activity logged.</div>`;
    return;
  }

  container.innerHTML = activities.map(act => `
    <div class="activity-item">
      <span>${escapeHtml(act.text)}</span>
      <span class="activity-time">${act.timestamp}</span>
    </div>
  `).join('');
};
