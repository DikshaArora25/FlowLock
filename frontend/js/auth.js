/**
 * FlowLock Authoritative Client Authentication Module
 * -------------------------------------------------------------
 * Connected to Express & MongoDB Atlas backend.
 * All authentication, session generation, profile updates, and password
 * modifications are performed exclusively via backend API endpoints.
 * -------------------------------------------------------------
 */

import {
  saveSessionUser,
  getSessionUser,
  clearSessionUser
} from './storage.js';

import {
  signupAPI,
  loginAPI,
  getMeAPI,
  updateProfileAPI,
  changePasswordAPI
} from './api.js';

export const DEMO_USER = {
  email: 'demo@flowlock.app',
  password: 'flowlock123',
  name: 'Diksha',
  role: 'Lead Engineer'
};

const PROTECTED_PAGES = ['dashboard', 'tasks', 'activity', 'profile'];
const GUEST_PAGES = ['login', 'signup', 'index'];

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return passwordRegex.test(password);
};

export const calculatePasswordStrength = (password) => {
  if (!password) {
    return {
      score: 0,
      label: 'None',
      percent: 0,
      color: '#6b7280',
      criteria: { length: false, upper: false, lower: false, number: false, special: false }
    };
  }

  const criteria = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z\d]/.test(password)
  };

  const metCount = Object.values(criteria).filter(Boolean).length;
  let label = 'Weak';
  let percent = (metCount / 5) * 100;
  let color = '#ef4444';

  if (metCount <= 2) {
    label = 'Weak';
    color = '#ef4444';
  } else if (metCount === 3) {
    label = 'Fair';
    color = '#f59e0b';
  } else if (metCount === 4) {
    label = 'Good';
    color = '#3b82f6';
  } else if (metCount === 5) {
    label = 'Strong';
    color = '#10b981';
  }

  return { score: metCount, label, percent, color, criteria };
};

/**
 * Register a new user account with Express & MongoDB backend
 */
export const signupUser = async ({
  name,
  email,
  password,
  confirmPassword,
  role = 'Software Engineer'
}) => {
  const cleanName = name ? name.trim() : '';
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanRole = role ? role.trim() : 'Software Engineer';

  console.log('[Auth] Initiating user registration for:', cleanEmail);

  if (!cleanName || cleanName.length < 2) {
    console.warn('[Auth] Registration validation error: Name too short.');
    return { success: false, message: 'Please enter your full name (at least 2 characters).' };
  }

  if (!isValidEmail(cleanEmail)) {
    console.warn('[Auth] Registration validation error: Invalid email format.');
    return { success: false, message: 'Please enter a valid email address.' };
  }

  if (!isValidPassword(password)) {
    console.warn('[Auth] Registration validation error: Weak password.');
    return {
      success: false,
      message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
    };
  }

  if (password !== confirmPassword) {
    console.warn('[Auth] Registration validation error: Passwords do not match.');
    return { success: false, message: 'Passwords do not match.' };
  }

  try {
    console.log('[Auth] Dispatching POST /api/auth/signup to backend...');
    const res = await signupAPI({
      name: cleanName,
      email: cleanEmail,
      password,
      role: cleanRole
    });

    const now = Date.now();
    const durationMs = 30 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(now + durationMs).toISOString();

    const userSession = {
      id: res.user.id || res.user._id,
      email: res.user.email,
      name: res.user.name,
      role: res.user.role || cleanRole,
      sessionToken: res.token,
      token: res.token,
      rememberMe: true,
      createdAt: res.user.createdAt,
      loggedInAt: new Date().toISOString(),
      expiresAt
    };

    saveSessionUser(userSession, true);
    console.log('[Auth] User successfully registered and session initialized via MongoDB Atlas:', userSession.email);

    return {
      success: true,
      user: userSession,
      token: res.token
    };
  } catch (error) {
    console.error('[Auth] Backend registration failed:', error.message);
    return {
      success: false,
      message: error.message || 'Registration failed. Please try again.'
    };
  }
};

/**
 * Authenticate user credentials with Express & MongoDB backend
 * Strictly enforces backend verification with bcrypt and JWT (No mock bypass / no offline fallback)
 */
export const loginUser = async (email, password, rememberMe = false) => {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanPassword = password ? password.trim() : '';

  console.log('[Auth] Initiating login verification for:', cleanEmail);

  if (!isValidEmail(cleanEmail)) {
    console.warn('[Auth] Login validation error: Invalid email format.');
    return { success: false, message: 'Please enter a valid email address.' };
  }

  if (!cleanPassword) {
    console.warn('[Auth] Login validation error: Password missing.');
    return { success: false, message: 'Please enter your password.' };
  }

  const now = Date.now();
  const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now + durationMs).toISOString();

  try {
    console.log('[Auth] Dispatching POST /api/auth/login to backend...');
    const res = await loginAPI({
      email: cleanEmail,
      password: cleanPassword
    });

    const userSession = {
      id: res.user.id,
      email: res.user.email,
      name: res.user.name,
      role: res.user.role || 'Software Engineer',
      sessionToken: res.token,
      token: res.token,
      rememberMe: Boolean(rememberMe),
      createdAt: res.user.createdAt,
      loggedInAt: new Date().toISOString(),
      expiresAt
    };

    saveSessionUser(userSession, rememberMe);
    console.log('[Auth] Backend login successful. JWT verified for user:', userSession.email);

    return { success: true, user: userSession };
  } catch (backendError) {
    console.error('[Auth] Backend authentication rejected:', backendError.message);
    return {
      success: false,
      message: backendError.message || 'Invalid email or password.'
    };
  }
};

/**
 * Update authenticated user profile via backend API (PUT /api/auth/profile)
 */
export const updateUserProfile = async ({ name, role }) => {
  const current = getSessionUser();
  if (!current || !current.token) {
    console.warn('[Auth] Cannot update profile: No active authenticated session.');
    return { success: false, message: 'No active session.' };
  }

  const cleanName = name ? name.trim() : current.name;
  const cleanRole = role ? role.trim() : (current.role || 'Software Engineer');

  if (cleanName.length < 2) {
    return { success: false, message: 'Full name must be at least 2 characters.' };
  }

  console.log('[Auth] Dispatching profile update to backend for:', current.email);

  try {
    const res = await updateProfileAPI(
      { name: cleanName, role: cleanRole },
      current.token
    );

    const updatedSession = {
      ...current,
      name: res.user.name || cleanName,
      role: res.user.role || cleanRole
    };

    saveSessionUser(updatedSession, current.rememberMe);
    console.log('[Auth] Profile successfully updated on MongoDB Atlas for:', updatedSession.email);

    return { success: true, user: updatedSession };
  } catch (error) {
    console.error('[Auth] Error updating profile on backend:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to update profile on server.'
    };
  }
};

/**
 * Change authenticated user password via backend API (PUT /api/auth/password)
 */
export const changeUserPassword = async ({ currentPassword, newPassword, confirmNewPassword }) => {
  const current = getSessionUser();
  if (!current || !current.token) {
    console.warn('[Auth] Cannot change password: No active authenticated session.');
    return { success: false, message: 'No active session.' };
  }

  if (newPassword !== confirmNewPassword) {
    return { success: false, message: 'New passwords do not match.' };
  }

  if (!isValidPassword(newPassword)) {
    return {
      success: false,
      message: 'New password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
    };
  }

  console.log('[Auth] Dispatching password change request to backend for:', current.email);

  try {
    const res = await changePasswordAPI(
      { currentPassword, newPassword },
      current.token
    );

    console.log('[Auth] Password successfully updated on MongoDB Atlas for:', current.email);
    return {
      success: true,
      message: res.message || 'Password updated successfully!'
    };
  } catch (error) {
    console.error('[Auth] Backend password update rejected:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to update password.'
    };
  }
};

/**
 * Check and enforce route protection across guest and authenticated pages
 */
export const checkAuthGuard = (currentPage) => {
  const session = getSessionUser();
  const isAuthenticated = Boolean(session && session.token);

  console.log(
    `[AuthGuard] Checking route '${currentPage}'. Status: ${
      isAuthenticated ? `Authenticated (${session.email})` : 'Unauthenticated'
    }`
  );

  // Protected pages -> redirect to login if no active session
  if (PROTECTED_PAGES.includes(currentPage) && !isAuthenticated) {
    console.warn(`[AuthGuard] Access denied to protected page '${currentPage}'. Redirecting to login.html.`);
    window.location.href = 'login.html';
    return null;
  }

  // Guest-only pages -> redirect to dashboard if already authenticated
  if (GUEST_PAGES.includes(currentPage) && isAuthenticated) {
    console.log(`[AuthGuard] Already authenticated on guest page '${currentPage}'. Redirecting to dashboard.html.`);
    window.location.href = 'dashboard.html';
    return session;
  }

  return session;
};

/**
 * Verify session token against backend (GET /api/auth/me)
 */
export const verifySessionWithBackend = async () => {
  const session = getSessionUser();
  if (!session || !session.token) {
    return { authenticated: false };
  }

  try {
    console.log('[Auth] Verifying session token with backend (GET /api/auth/me)...');
    const res = await getMeAPI(session.token);
    console.log('[Auth] Session token successfully verified with MongoDB Atlas:', res.user.email);
    return { authenticated: true, user: res.user };
  } catch (error) {
    console.warn('[Auth] Session verification failed on backend:', error.message);
    clearSessionUser();
    return { authenticated: false, message: error.message };
  }
};

/**
 * Log out user and redirect to login page
 */
export const logoutUser = () => {
  const session = getSessionUser();
  console.log('[Auth] Terminating session and logging out user:', session?.email || 'Unknown');
  clearSessionUser();
  window.location.href = 'login.html';
};

export const getCurrentUser = () => {
  return getSessionUser();
};