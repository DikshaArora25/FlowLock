/**
 * FlowLock Frontend Environment Configuration
 * 
 * -------------------------------------------------------------
 * HOW TO CONFIGURE YOUR BACKEND URL:
 * -------------------------------------------------------------
 * 1. For Local Development:
 *    Keep API_BASE_URL as 'http://localhost:5000/api'
 *
 * 2. When Deploying on Vercel:
 *    Update API_BASE_URL with your deployed Render backend link:
 *    e.g. 'https://your-app-name.onrender.com/api'
 *
 * All modules across the frontend (tasks, auth, activity) will
 * automatically route all requests to this base URL.
 * -------------------------------------------------------------
 */

export const ENV = {
  API_BASE_URL: 'http://localhost:5000/api'
};

// Expose on window for runtime browser debugging or script tag access
if (typeof window !== 'undefined') {
  window.__ENV__ = ENV;
}
