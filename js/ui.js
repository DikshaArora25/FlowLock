/**
 * FlowLock UI Rendering & Component Module (Lectures 17-20: DOM selection, DOM traversal, element creation, styles)
 */

import { escapeHtml, formatDate } from './utils.js';
import { getBlockingDependencies } from './dependencyEngine.js';

// Render Dynamic Summary Metrics Header
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

// Render Single Task Card Element
export const createTaskCardElement = (task, allTasks) => {
  const card = document.createElement('div');
  card.className = `task-card ${task.locked ? 'is-locked' : ''}`;
  card.id = `card-${task.id}`;
  card.dataset.taskId = task.id;
  card.draggable = true;

  // Determine lock badge & dependency details
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
        <span>🔗 ${depCount} Dependency${depCount > 1 ? 'ies' : ''}</span>
        ${task.locked ? `<span style="color: var(--status-locked); font-size:10px;">Waiting: ${escapeHtml(blocking[0] ? blocking[0].title : 'Incomplete')}</span>` : '<span style="color: var(--status-done); font-size:10px;">All Done</span>'}
      </div>
    ` : ''}

    <div class="card-meta">
      <span class="card-priority ${priorityClass}">⚡ ${escapeHtml(task.priority)}</span>
      <span class="card-assignee">👤 ${escapeHtml(task.assignee)}</span>
    </div>

    <div class="card-meta" style="padding-top: 4px; border: none;">
      <span style="font-size: 10px;">📅 ${formatDate(task.dueDate)}</span>
    </div>

    <div class="card-actions">
      <button class="card-btn btn-inspect" data-id="${task.id}" title="View Dependency Inspector">🔍 Inspect Graph</button>
      <button class="card-btn btn-edit" data-id="${task.id}" title="Edit Task">✏️ Edit</button>
      <button class="card-btn btn-delete" data-id="${task.id}" title="Delete Task">🗑️ Delete</button>
    </div>
  `;

  return card;
};

// Render Complete 4-Column Kanban Board
export const renderKanbanBoard = (tasks, allTasks) => {
  const columns = {
    'Backlog': document.getElementById('list-Backlog'),
    'Todo': document.getElementById('list-Todo'),
    'In Progress': document.getElementById('list-In Progress'),
    'Done': document.getElementById('list-Done')
  };

  // Clear existing task items
  Object.keys(columns).forEach(status => {
    if (columns[status]) {
      columns[status].innerHTML = '';
    }
  });

  // Count per column
  const counts = { 'Backlog': 0, 'Todo': 0, 'In Progress': 0, 'Done': 0 };

  // Append cards using DOM manipulation
  tasks.forEach(task => {
    const listEl = columns[task.status];
    if (listEl) {
      const cardEl = createTaskCardElement(task, allTasks);
      listEl.appendChild(cardEl);
      counts[task.status]++;
    }
  });

  // Update header column count badges
  Object.keys(counts).forEach(status => {
    const badge = document.getElementById(`count-${status.replace(/\s+/g, '')}`);
    if (badge) {
      badge.textContent = counts[status];
    }
  });
};

// Render Dependency Inspector Visual Graph Modal
export const renderDependencyInspector = (task, allTasks) => {
  const modalTitle = document.getElementById('inspectorModalTitle');
  const modalBody = document.getElementById('inspectorModalBody');
  if (!modalTitle || !modalBody) return;

  modalTitle.textContent = `Dependency Inspector: ${task.title}`;

  const taskMap = new Map(allTasks.map(t => [t.id, t]));

  if (!task.dependsOn || task.dependsOn.length === 0) {
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 24px; color: var(--text-muted);">
        <p style="font-size: 24px; margin-bottom: 8px;">🟢 Unrestricted Task</p>
        <p>This task has no prerequisites and can be started immediately.</p>
      </div>
    `;
    return;
  }

  let html = `<div class="inspector-chain">`;
  html += `<p style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
    To unlock <strong>${escapeHtml(task.title)}</strong>, all of the following dependencies must reach <span style="color: var(--status-done);">Done</span> status:
  </p>`;

  task.dependsOn.forEach((depId, index) => {
    const depTask = taskMap.get(depId);
    let nodeClass = 'pending';
    let icon = '🟡';
    let statusText = 'Pending';

    if (depTask) {
      if (depTask.status === 'Done') {
        nodeClass = 'done';
        icon = '🟢';
        statusText = 'Completed (Done)';
      } else if (task.locked && depTask.status !== 'Done') {
        nodeClass = 'blocking';
        icon = '🔴';
        statusText = `Blocking (${depTask.status})`;
      } else {
        statusText = depTask.status;
      }
    }

    html += `
      <div class="inspector-node ${nodeClass}">
        <span class="node-status-icon">${icon}</span>
        <div class="node-info">
          <span class="node-title">${escapeHtml(depTask ? depTask.title : `Task ID: ${depId}`)}</span>
          <span class="node-meta">Status: <strong>${statusText}</strong> | Priority: ${depTask ? depTask.priority : 'N/A'} | Assignee: ${depTask ? depTask.assignee : 'N/A'}</span>
        </div>
      </div>
    `;

    if (index < task.dependsOn.length - 1) {
      html += `<div class="inspector-arrow">↓</div>`;
    }
  });

  html += `<div class="inspector-arrow">↓</div>`;
  
  html += `
    <div class="inspector-node current">
      <span class="node-status-icon">🔵</span>
      <div class="node-info">
        <span class="node-title">${escapeHtml(task.title)} (Target Task)</span>
        <span class="node-meta">Current Status: <strong>${task.status}</strong> | Lock State: <strong>${task.locked ? '🔒 LOCKED' : '🔓 UNLOCKED'}</strong></span>
      </div>
    </div>
  `;

  html += `</div>`;

  modalBody.innerHTML = html;
};

// Populate Task Form for Add or Edit
export const populateTaskForm = (task = null, allTasks = []) => {
  const form = document.getElementById('taskForm');
  if (!form) return;

  const currentTaskId = task ? task.id : '';
  document.getElementById('taskIdInput').value = currentTaskId;
  document.getElementById('formTitle').textContent = task ? 'Edit Task' : 'Create New Task';

  document.getElementById('taskTitle').value = task ? task.title : '';
  document.getElementById('taskDescription').value = task ? task.description : '';
  document.getElementById('taskPriority').value = task ? task.priority : 'Medium';
  document.getElementById('taskAssignee').value = task ? task.assignee : 'Diksha';
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

// Render Activity Log Entries
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
