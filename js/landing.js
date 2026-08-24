/**
 * FlowLock Landing Page Interactive Engine
 * Reuses core dependency logic from dependencyEngine.js
 */

import { isTaskLocked, recalculateLocks } from './dependencyEngine.js';

// ─── State for "See Dependencies In Action" Demo ─────────────────────────────
const DEMO_CHAIN_INITIAL = [
  {
    id: 'dep-1',
    title: 'Database Schema',
    status: 'Done',
    priority: 'High',
    dependsOn: [],
    locked: false,
    description: 'Data model & tables created'
  },
  {
    id: 'dep-2',
    title: 'Authentication',
    status: 'Todo',
    priority: 'High',
    dependsOn: ['dep-1'],
    locked: false,
    description: 'OAuth & JWT session system'
  },
  {
    id: 'dep-3',
    title: 'Dashboard Integration',
    status: 'Todo',
    priority: 'High',
    dependsOn: ['dep-2'],
    locked: true,
    description: 'Wire API endpoints into UI'
  },
  {
    id: 'dep-4',
    title: 'E2E Testing',
    status: 'Backlog',
    priority: 'Medium',
    dependsOn: ['dep-3'],
    locked: true,
    description: 'Automated test suite execution'
  },
  {
    id: 'dep-5',
    title: 'Production Deployment',
    status: 'Backlog',
    priority: 'High',
    dependsOn: ['dep-4'],
    locked: true,
    description: 'CI/CD release to production'
  }
];

let demoChainState = JSON.parse(JSON.stringify(DEMO_CHAIN_INITIAL));

// Recalculate demo chain lock states using real dependency engine
function updateDemoChainLocks() {
  demoChainState = recalculateLocks(demoChainState);
}

// Render "See Dependencies In Action" UI
function renderInteractiveDemo() {
  updateDemoChainLocks();
  const container = document.getElementById('interactiveDemoChain');
  if (!container) return;

  container.innerHTML = '';

  demoChainState.forEach((task, index) => {
    const isDone = task.status === 'Done';
    const isLocked = task.locked && !isDone;
    const isReady = !task.locked && !isDone;

    const nodeEl = document.createElement('div');
    nodeEl.className = `demo-chain-card ${isDone ? 'state-done' : isLocked ? 'state-locked' : 'state-ready'}`;

    let statusBadge = '';
    if (isDone) {
      statusBadge = `<span class="badge badge-done">✓ DONE</span>`;
    } else if (isLocked) {
      statusBadge = `<span class="badge badge-locked">🔒 LOCKED</span>`;
    } else {
      statusBadge = `<span class="badge badge-ready">⚡ READY</span>`;
    }

    let dependsText = '';
    if (task.dependsOn.length > 0) {
      const parentTask = demoChainState.find(t => t.id === task.dependsOn[0]);
      dependsText = `<div class="demo-card-dep">Prerequisite: <strong>${parentTask ? parentTask.title : task.dependsOn[0]}</strong></div>`;
    } else {
      dependsText = `<div class="demo-card-dep">Prerequisite: <em>None (Root Task)</em></div>`;
    }

    nodeEl.innerHTML = `
      <div class="demo-card-header">
        <span class="demo-card-step">Task 0${index + 1}</span>
        ${statusBadge}
      </div>
      <h4 class="demo-card-title">${task.title}</h4>
      <p class="demo-card-desc">${task.description}</p>
      ${dependsText}
    `;

    container.appendChild(nodeEl);

    if (index < demoChainState.length - 1) {
      const arrowEl = document.createElement('div');
      arrowEl.className = `demo-chain-arrow ${demoChainState[index].status === 'Done' ? 'active' : ''}`;
      arrowEl.innerHTML = '➔';
      container.appendChild(arrowEl);
    }
  });

  // Update Status Log Message
  const logEl = document.getElementById('demoActionLog');
  if (logEl) {
    const lockedTask = demoChainState.find(t => t.locked);
    const readyTask = demoChainState.find(t => !t.locked && t.status !== 'Done');

    if (readyTask) {
      logEl.innerHTML = `💡 <strong>FlowLock Engine:</strong> Task "<strong>${readyTask.title}</strong>" is READY to move! ${lockedTask ? `Task "<strong>${lockedTask.title}</strong>" is currently LOCKED until prerequisites complete.` : 'All tasks unblocked!'}`;
    } else if (!lockedTask) {
      logEl.innerHTML = `🎉 <strong>FlowLock Engine:</strong> All tasks in the pipeline have been completed! Workspace unblocked.`;
    } else {
      logEl.innerHTML = `🔒 <strong>FlowLock Engine:</strong> Dependent tasks are LOCKED waiting on incomplete prerequisites.`;
    }
  }
}

// Handle "Complete Prerequisite" action
function completeNextPrerequisite() {
  const readyTask = demoChainState.find(t => !t.locked && t.status !== 'Done');
  if (readyTask) {
    readyTask.status = 'Done';
    renderInteractiveDemo();
    showLandingToast(`✓ "${readyTask.title}" marked DONE! Downstream locks recalculated.`, 'success');
  } else {
    showLandingToast('All demo tasks are already completed! Reset to try again.', 'info');
  }
}

// Handle "Move Task Forward" action
function moveTaskForward() {
  const inProgressTask = demoChainState.find(t => t.status === 'In Progress');
  const readyTask = demoChainState.find(t => !t.locked && t.status === 'Todo');

  if (inProgressTask) {
    inProgressTask.status = 'Done';
    renderInteractiveDemo();
    showLandingToast(`✓ "${inProgressTask.title}" moved to DONE.`, 'success');
  } else if (readyTask) {
    readyTask.status = 'In Progress';
    renderInteractiveDemo();
    showLandingToast(`⚡ "${readyTask.title}" moved to IN PROGRESS.`, 'info');
  } else {
    const lockedTask = demoChainState.find(t => t.locked);
    if (lockedTask) {
      showLandingToast(`🔒 Action Blocked! "${lockedTask.title}" is locked until prerequisites complete.`, 'error');
    } else {
      showLandingToast('No tasks left to move!', 'info');
    }
  }
}

// Reset Demo
function resetDemoChain() {
  demoChainState = JSON.parse(JSON.stringify(DEMO_CHAIN_INITIAL));
  renderInteractiveDemo();
  showLandingToast('Demo reset to initial state.', 'info');
}

// ─── Interactive Dependency Graph Component ──────────────────────────────────
const GRAPH_NODES = [
  { id: 'g1', title: 'Project Planning', status: 'Done', dependsOn: [], desc: 'Define tech stack & architecture' },
  { id: 'g2', title: 'Database Design', status: 'Done', dependsOn: ['g1'], desc: 'Schema & migrations' },
  { id: 'g3', title: 'Authentication', status: 'Done', dependsOn: ['g2'], desc: 'JWT session management' },
  { id: 'g4', title: 'Core API', status: 'In Progress', dependsOn: ['g2'], desc: 'REST endpoints' },
  { id: 'g5', title: 'Dashboard UI', status: 'Todo', dependsOn: ['g3', 'g4'], desc: 'Kanban interface' },
  { id: 'g6', title: 'E2E Testing', status: 'Backlog', dependsOn: ['g5'], desc: 'Automated test suites' },
  { id: 'g7', title: 'Deployment', status: 'Backlog', dependsOn: ['g6'], desc: 'Production release' }
];

function initInteractiveGraph() {
  const container = document.getElementById('graphNodesContainer');
  const inspectorPanel = document.getElementById('graphNodeDetail');
  if (!container || !inspectorPanel) return;

  function renderGraph() {
    container.innerHTML = '';
    GRAPH_NODES.forEach((node) => {
      const tempTasks = GRAPH_NODES.map(n => ({ ...n, dependsOn: [...n.dependsOn] }));
      const currentTask = tempTasks.find(t => t.id === node.id);
      const isDone = node.status === 'Done';
      const locked = isTaskLocked(currentTask, tempTasks);

      const nodeBtn = document.createElement('div');
      nodeBtn.className = `graph-node ${isDone ? 'node-done' : locked ? 'node-locked' : 'node-ready'}`;
      nodeBtn.dataset.nodeId = node.id;
      nodeBtn.innerHTML = `
        <div class="graph-node-status">${isDone ? '✓' : locked ? '🔒' : '⚡'}</div>
        <div class="graph-node-title">${node.title}</div>
        <div class="graph-node-state">${isDone ? 'Done' : locked ? 'Locked' : 'Ready'}</div>
      `;

      nodeBtn.addEventListener('click', () => selectGraphNode(node, locked));
      container.appendChild(nodeBtn);
    });
  }

  function selectGraphNode(node, isLocked) {
    document.querySelectorAll('.graph-node').forEach(el => el.classList.remove('active'));
    const activeEl = container.querySelector(`[data-node-id="${node.id}"]`);
    if (activeEl) activeEl.classList.add('active');

    const prereqs = node.dependsOn.map(depId => {
      const dep = GRAPH_NODES.find(n => n.id === depId);
      return dep ? dep.title : depId;
    });

    inspectorPanel.innerHTML = `
      <div class="graph-detail-header">
        <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main);">${node.title}</h4>
        <span class="badge ${node.status === 'Done' ? 'badge-done' : isLocked ? 'badge-locked' : 'badge-ready'}">
          ${node.status === 'Done' ? '✓ DONE' : isLocked ? '🔒 LOCKED' : '⚡ READY'}
        </span>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin: 8px 0 12px 0;">${node.desc}</p>
      <div class="graph-detail-field">
        <strong>Prerequisites:</strong> ${prereqs.length > 0 ? prereqs.join(', ') : 'None (Root Node)'}
      </div>
      <div class="graph-detail-field" style="margin-top: 6px;">
        <strong>FlowLock Decision:</strong> ${
          node.status === 'Done'
            ? 'Completed. Downstream dependents unblocked.'
            : isLocked
            ? `<span style="color: var(--status-locked);">Blocked because prerequisites [${prereqs.join(', ')}] are incomplete.</span>`
            : '<span style="color: var(--status-done);">Ready to move to In Progress or Done.</span>'
        }
      </div>
    `;
  }

  renderGraph();
  // Select first node by default
  selectGraphNode(GRAPH_NODES[4], isTaskLocked(GRAPH_NODES[4], GRAPH_NODES));
}

// ─── Mini Kanban Preview Component ───────────────────────────────────────────
const KANBAN_PREVIEW_TASKS = [
  { id: 'kb-1', title: 'Database Schema', status: 'Done', priority: 'High', locked: false },
  { id: 'kb-2', title: 'Authentication Service', status: 'In Progress', priority: 'High', locked: false },
  { id: 'kb-3', title: 'Dashboard Integration', status: 'Todo', priority: 'High', locked: true, blocking: 'Authentication Service' },
  { id: 'kb-4', title: 'Production Deployment', status: 'Backlog', priority: 'Medium', locked: true, blocking: 'Dashboard Integration' }
];

function renderMiniKanban() {
  const columns = {
    'Backlog': document.getElementById('miniListBacklog'),
    'Todo': document.getElementById('miniListTodo'),
    'In Progress': document.getElementById('miniListInProgress'),
    'Done': document.getElementById('miniListDone')
  };

  Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

  KANBAN_PREVIEW_TASKS.forEach(task => {
    const targetCol = columns[task.status];
    if (!targetCol) return;

    const card = document.createElement('div');
    card.className = `mini-task-card ${task.locked ? 'card-locked' : ''}`;
    card.innerHTML = `
      <div class="mini-card-header">
        <span class="mini-card-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
        <span class="mini-card-badge ${task.status === 'Done' ? 'badge-done' : task.locked ? 'badge-locked' : 'badge-ready'}">
          ${task.status === 'Done' ? '✓ DONE' : task.locked ? '🔒 LOCKED' : '⚡ READY'}
        </span>
      </div>
      <div class="mini-card-title">${task.title}</div>
      ${task.locked ? `<div class="mini-card-lock-reason">Blocked by: ${task.blocking}</div>` : ''}
    `;

    card.addEventListener('click', () => {
      if (task.locked) {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 600);
        showLandingToast(`🔒 Cannot move "${task.title}": Blocked by ${task.blocking}`, 'error');
      } else {
        showLandingToast(`⚡ "${task.title}" is ready! Move it forward in FlowLock Workspace.`, 'info');
      }
    });

    targetCol.appendChild(card);
  });
}

// ─── Toast Notifications ─────────────────────────────────────────────────────
function showLandingToast(msg, type = 'info') {
  let toastContainer = document.getElementById('landingToastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'landingToastContainer';
    toastContainer.className = 'landing-toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `landing-toast toast-${type}`;
  toast.textContent = msg;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Boot Event Handlers ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderInteractiveDemo();
  initInteractiveGraph();
  renderMiniKanban();

  // Attach button listeners
  const btnComplete = document.getElementById('btnCompletePrereq');
  const btnMove = document.getElementById('btnMoveForward');
  const btnReset = document.getElementById('btnResetDemo');

  if (btnComplete) btnComplete.addEventListener('click', completeNextPrerequisite);
  if (btnMove) btnMove.addEventListener('click', moveTaskForward);
  if (btnReset) btnReset.addEventListener('click', resetDemoChain);

  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileNavToggle');
  const mobileMenu = document.getElementById('navLinksMenu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('mobile-open');
    });
  }
});