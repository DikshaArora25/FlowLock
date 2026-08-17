/**
 * FlowLock Auth Module — SessionStorage-backed demo authentication guard
 */

import { saveSessionUser, getSessionUser, clearSessionUser } from './storage.js';

const DEMO_USER = {
  email: 'demo@flowlock.app',
  password: 'flowlock123',
  name: 'Diksha',
  role: 'Lead Engineer'
};

// Authenticate demo credentials
export const loginUser = (email, password) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (cleanEmail === DEMO_USER.email && cleanPassword === DEMO_USER.password) {
    const userSession = {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
      loggedInAt: new Date().toISOString()
    };
    saveSessionUser(userSession);
    return { success: true, user: userSession };
  } else {
    return { success: false, message: 'Invalid credentials. Use demo@flowlock.app / flowlock123' };
  }
};

// Require active session check for protected pages
export const checkAuthGuard = (currentPage) => {
  const session = getSessionUser();
  if ((currentPage === 'dashboard' || currentPage === 'profile') && !session) {
    window.location.href = 'index.html';
  } else if (currentPage === 'login' && session) {
    window.location.href = 'dashboard.html';
  }
  return session;
};

// Logout handler
export const logoutUser = () => {
  clearSessionUser();
  window.location.href = 'index.html';
};
