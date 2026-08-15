/**
 * FlowLock Utilities Module (Lectures 1–24: Functions, Arrow Functions, Scope, Template Literals, ES6)
 */

// Generate unique ID using timestamp and random string
export const generateId = (prefix = 'task') => {
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${randomStr}`;
};

// Format date string nicely (e.g., "Aug 15, 2026")
export const formatDate = (dateString) => {
  if (!dateString) return 'No due date';
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Calculate relative days remaining
export const getDaysRemaining = (dueDateString) => {
  if (!dueDateString) return null;
  const now = new Date();
  const due = new Date(dueDateString);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Escape HTML strings to prevent XSS in DOM rendering
export const escapeHtml = (unsafeStr) => {
  if (typeof unsafeStr !== 'string') return unsafeStr;
  return unsafeStr
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Display custom animated Toast Notification
export const showToast = (message, type = 'info', duration = 4000) => {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'error') icon = '🔒';
  if (type === 'success') icon = '✓';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <span>${icon}</span>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// Debounce helper for search input processing
export const debounce = (func, delay = 250) => {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => func(...args), delay);
  };
};
