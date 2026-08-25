export const generateId = (prefix = 'task') => {
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${randomStr}`;
};

// Parse a YYYY-MM-DD string into a local Date object (avoiding UTC midnight timezone offset bugs)
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) {
    const [year, month, day] = dateString.trim().split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (dateString) => {
  if (!dateString) return 'No due date';
  const d = parseLocalDate(dateString);
  if (!d) return 'Invalid date';
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return d.toLocaleDateString(undefined, options);
};

export const getDaysRemaining = (dueDateString) => {
  if (!dueDateString) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueDateString);
  if (!due) return null;
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
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

export const debounce = (func, delay = 250) => {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => func(...args), delay);
  };
};
