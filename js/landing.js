/**
 * FlowLock Landing Page Interactive Engine
 * Isolated landing-page demo state & animations
 */

import { escapeHtml } from './utils.js';

// ─── HERO INTERACTIVE KANBAN PREVIEW DEMO ────────────────────────────────────
const HERO_DEMO_STEPS = [
  {
    step: 0,
    statusText: '🔒 Authentication is ready. API Integration is BLOCKED waiting on Authentication.',
    btnLabel: '⚡ Resolve Dependency (Auth → Done)',
    tasks: [
      { id: 'h1', title: 'Database Schema', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Root Dependency' },
      { id: 'h2', title: 'Authentication', status: 'Todo', label: '⚡ READY', class: 'ready', sub: 'Prerequisites Met' },
      { id: 'h3', title: 'API Integration', status: 'Todo', label: '🔒 BLOCKED', class: 'locked', sub: 'Waiting on Authentication' },
      { id: 'h4', title: 'Deployment', status: 'Backlog', label: '🔒 BLOCKED', class: 'locked', sub: 'Waiting on API Integration' }
    ]
  },
  {
    step: 1,
    statusText: '✓ Authentication completed! API Integration is now UNLOCKED & READY.',
    btnLabel: '⚡ Resolve Dependency (API → Done)',
    tasks: [
      { id: 'h1', title: 'Database Schema', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Root Dependency' },
      { id: 'h2', title: 'Authentication', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Prerequisites Met' },
      { id: 'h3', title: 'API Integration', status: 'Todo', label: '⚡ READY', class: 'ready', sub: 'Unlocked automatically!' },
      { id: 'h4', title: 'Deployment', status: 'Backlog', label: '🔒 BLOCKED', class: 'locked', sub: 'Waiting on API Integration' }
    ]
  },
  {
    step: 2,
    statusText: '✓ API Integration completed! Deployment is now UNLOCKED & READY.',
    btnLabel: '⚡ Deploy (Deployment → Done)',
    tasks: [
      { id: 'h1', title: 'Database Schema', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Root Dependency' },
      { id: 'h2', title: 'Authentication', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Prerequisites Met' },
      { id: 'h3', title: 'API Integration', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Prerequisites Met' },
      { id: 'h4', title: 'Deployment', status: 'Todo', label: '⚡ READY', class: 'ready', sub: 'Unlocked automatically!' }
    ]
  },
  {
    step: 3,
    statusText: '🎉 All pipeline dependencies resolved! Project fully deployed.',
    btnLabel: '🔄 Reset Simulation',
    tasks: [
      { id: 'h1', title: 'Database Schema', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Root Dependency' },
      { id: 'h2', title: 'Authentication', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Prerequisites Met' },
      { id: 'h3', title: 'API Integration', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Prerequisites Met' },
      { id: 'h4', title: 'Deployment', status: 'Done', label: '✓ DONE', class: 'done', sub: 'Completed' }
    ]
  }
];

let heroStepIndex = 0;

function renderHeroPreview() {
  const container = document.getElementById('heroPreviewCards');
  const logEl = document.getElementById('heroPreviewStatusLog');
  const btn = document.getElementById('btnHeroResolveDep');
  if (!container) return;

  const currentData = HERO_DEMO_STEPS[heroStepIndex];
  container.innerHTML = '';

  currentData.tasks.forEach((t) => {
    const card = document.createElement('div');
    card.className = `hero-mini-item item-${t.class}`;
    card.innerHTML = `
      <div class="hero-item-main">
        <span class="hero-item-title">${escapeHtml(t.title)}</span>
        <span class="hero-item-sub">${escapeHtml(t.sub)}</span>
      </div>
      <span class="badge badge-${t.class}">${t.label}</span>
    `;
    container.appendChild(card);
  });

  if (logEl) {
    logEl.innerHTML = `<span>${currentData.statusText}</span>`;
  }
  if (btn) {
    btn.textContent = currentData.btnLabel;
  }
}

function initHeroPreview() {
  const btn = document.getElementById('btnHeroResolveDep');
  if (btn) {
    btn.addEventListener('click', () => {
      heroStepIndex = (heroStepIndex + 1) % HERO_DEMO_STEPS.length;
      renderHeroPreview();
    });
  }
  renderHeroPreview();
}

// ─── INTERACTIVE DEPENDENCY CHAIN DEMO ───────────────────────────────────────
const CHAIN_NODES = [
  { id: 'c1', title: 'Planning', status: 'Done', label: '✓ DONE', class: 'done', dependsOn: 'None (Root)', blocks: 'Database', desc: 'System requirements & data schema definition.' },
  { id: 'c2', title: 'Database', status: 'Done', label: '✓ DONE', class: 'done', dependsOn: 'Planning', blocks: 'Authentication', desc: 'PostgreSQL tables, indices, and data model.' },
  { id: 'c3', title: 'Authentication', status: 'Done', label: '✓ DONE', class: 'done', dependsOn: 'Database', blocks: 'API Integration', desc: 'JWT token auth & route guard middleware.' },
  { id: 'c4', title: 'API Integration', status: 'In Progress', label: '◉ ACTIVE', class: 'in-progress', dependsOn: 'Authentication', blocks: 'Testing', desc: 'REST endpoints and state validation logic.' },
  { id: 'c5', title: 'Testing', status: 'Todo', label: '🔒 BLOCKED', class: 'locked', dependsOn: 'API Integration', blocks: 'Deployment', desc: 'E2E automated integration test suite execution.' },
  { id: 'c6', title: 'Deployment', status: 'Backlog', label: '🔒 BLOCKED', class: 'locked', dependsOn: 'Testing', blocks: 'None (End Task)', desc: 'Production release & CI/CD deployment pipeline.' }
];

let selectedChainNodeId = 'c3'; // Authentication by default

function renderDependencyChain() {
  const container = document.getElementById('chainNodesGrid');
  const detailEl = document.getElementById('chainDetailCard');
  if (!container || !detailEl) return;

  container.innerHTML = '';

  CHAIN_NODES.forEach((node, idx) => {
    const isSelected = node.id === selectedChainNodeId;
    const selNode = CHAIN_NODES.find(n => n.id === selectedChainNodeId);
    const isPrereq = selNode && selNode.dependsOn === node.title;
    const isBlockedBySel = selNode && selNode.blocks === node.title;

    const el = document.createElement('div');
    el.className = `chain-node-item ${node.class} ${isSelected ? 'is-selected' : ''} ${isPrereq ? 'is-prereq' : ''} ${isBlockedBySel ? 'is-blocked-by' : ''}`;
    el.innerHTML = `
      <div class="chain-node-step">0${idx + 1}</div>
      <div class="chain-node-name">${escapeHtml(node.title)}</div>
      <span class="badge badge-${node.class}">${node.label}</span>
    `;

    el.addEventListener('click', () => {
      selectedChainNodeId = node.id;
      renderDependencyChain();
    });

    el.addEventListener('mouseenter', () => {
      selectedChainNodeId = node.id;
      renderDependencyChain();
    });

    container.appendChild(el);

    if (idx < CHAIN_NODES.length - 1) {
      const arrow = document.createElement('div');
      arrow.className = `chain-arrow-separator ${idx < 3 ? 'active' : ''}`;
      arrow.textContent = '➔';
      container.appendChild(arrow);
    }
  });

  // Render detail card
  const node = CHAIN_NODES.find(n => n.id === selectedChainNodeId) || CHAIN_NODES[2];
  detailEl.innerHTML = `
    <div class="chain-detail-header">
      <h4 class="chain-detail-title">${escapeHtml(node.title)}</h4>
      <span class="badge badge-${node.class}">${node.label}</span>
    </div>
    <p style="font-size: 13px; color: var(--text-muted); margin: 6px 0 12px 0;">${escapeHtml(node.desc)}</p>
    <div class="chain-detail-meta-grid">
      <div class="chain-meta-box">
        <span class="meta-lbl">Depends On:</span>
        <strong class="meta-val">${escapeHtml(node.dependsOn)}</strong>
      </div>
      <div class="chain-meta-box">
        <span class="meta-lbl">Blocks Downstream:</span>
        <strong class="meta-val" style="color: ${node.blocks !== 'None (End Task)' ? 'var(--status-locked)' : 'var(--text-muted)'};">${escapeHtml(node.blocks)}</strong>
      </div>
      <div class="chain-meta-box">
        <span class="meta-lbl">FlowLock Decision:</span>
        <strong class="meta-val" style="color: ${node.status === 'Done' ? 'var(--status-done)' : (node.class === 'locked' ? 'var(--status-locked)' : 'var(--status-in-progress)')};">
          ${node.status === 'Done' ? 'Completed — downstream unlocked' : (node.class === 'locked' ? 'Locked — waiting for prerequisite' : 'Active work in flight')}
        </strong>
      </div>
    </div>
  `;
}

// ─── BOOT HANDLERS ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initHeroPreview();
  renderDependencyChain();

  // Mobile menu navigation toggle
  const mobileToggle = document.getElementById('mobileNavToggle');
  const mobileMenu = document.getElementById('navLinksMenu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('mobile-open');
    });
  }
});
