/**
 * FlowLock Frontend Environment Configuration
 * 
 * -------------------------------------------------------------
 * BACKEND API URL:
 * -------------------------------------------------------------
 * Configured for production on Render:
 * https://flowlock.onrender.com/api
 *
 * All modules across the frontend (tasks, auth, activity)
 * route all API calls through this base URL.
 * -------------------------------------------------------------
 */

export const ENV = {
  API_BASE_URL: 'https://flowlock.onrender.com/api'
};

export const envReady = Promise.resolve(ENV);

// Expose on window for runtime browser debugging or script tag access
if (typeof window !== 'undefined') {
  window.__ENV__ = ENV;
}
