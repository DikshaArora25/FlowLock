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

const PROTECTED_PAGES = ['dashboard', 'tasks', 'activity', 'profile'];
const GUEST_PAGES = ['login', 'signup', 'index'];

const getTokenExpiry = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return Number.isFinite(decoded.exp) ? new Date(decoded.exp * 1000).toISOString() : null;
  } catch (error) {
    return null;
  }
};

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
  const percent = (metCount / 5) * 100;

  let label = 'Weak';
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

  if (!cleanName || cleanName.length < 2) {
    return { success: false, message: 'Please enter your full name (at least 2 characters).' };
  }

  if (!isValidEmail(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  if (!isValidPassword(password)) {
    return {
      success: false,
      message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
    };
  }

  if (password !== confirmPassword) {
    return { success: false, message: 'Passwords do not match.' };
  }

  try {
    const res = await signupAPI({
      name: cleanName,
      email: cleanEmail,
      password,
      role: cleanRole
    });

    const expiresAt = getTokenExpiry(res.token) || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
    return { success: true, user: userSession, token: res.token };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Registration failed. Please try again.'
    };
  }
};

export const loginUser = async (email, password, rememberMe = false) => {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanPassword = typeof password === 'string' ? password : '';

  if (!isValidEmail(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  if (!cleanPassword) {
    return { success: false, message: 'Please enter your password.' };
  }

  try {
    const res = await loginAPI({
      email: cleanEmail,
      password: cleanPassword
    });

    const expiresAt = getTokenExpiry(res.token) || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const userSession = {
      id: res.user.id || res.user._id,
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
    return { success: true, user: userSession };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Invalid email or password.'
    };
  }
};

export const updateUserProfile = async ({ name, role }) => {
  const current = getSessionUser();
  if (!current || !current.token) {
    return { success: false, message: 'No active session.' };
  }

  if ((name !== undefined && typeof name !== 'string') || (role !== undefined && typeof role !== 'string')) {
    return { success: false, message: 'Name and role must be text values.' };
  }

  const cleanName = typeof name === 'string' ? name.trim() : current.name;
  const cleanRole = typeof role === 'string' && role.trim() ? role.trim() : (current.role || 'Software Engineer');

  if (typeof cleanName !== 'string' || cleanName.length < 2 || cleanName.length > 80) {
    return { success: false, message: 'Full name must be between 2 and 80 characters.' };
  }

  if (typeof cleanRole !== 'string' || cleanRole.length > 60) {
    return { success: false, message: 'Role cannot exceed 60 characters.' };
  }

  try {
    const response = await updateProfileAPI(current.token, { name: cleanName, role: cleanRole });
    const updatedSession = { ...current, ...response.user };
    saveSessionUser(updatedSession, current.rememberMe);
    return { success: true, user: updatedSession };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Unable to update your profile. Please try again.'
    };
  }
};

export const changeUserPassword = async ({ currentPassword, newPassword, confirmNewPassword }) => {
  const current = getSessionUser();
  if (!current || !current.token) {
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

  try {
    const response = await changePasswordAPI(current.token, { currentPassword, newPassword });
    return {
      success: true,
      message: response.message || 'Password updated successfully!'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to update password.'
    };
  }
};

export const checkAuthGuard = (currentPage) => {
  const session = getSessionUser();
  const isAuthenticated = Boolean(session && session.token);

  if (PROTECTED_PAGES.includes(currentPage) && !isAuthenticated) {
    window.location.href = 'login.html';
    return null;
  }

  if (GUEST_PAGES.includes(currentPage) && isAuthenticated) {
    window.location.href = 'dashboard.html';
    return session;
  }

  return session;
};

export const verifySessionWithBackend = async () => {
  const session = getSessionUser();
  if (!session || !session.token) {
    return { authenticated: false };
  }

  try {
    const res = await getMeAPI(session.token);
    return { authenticated: true, user: res.user };
  } catch (error) {
    clearSessionUser();
    return { authenticated: false, message: error.message };
  }
};

export const logoutUser = () => {
  clearSessionUser();
  window.location.href = 'login.html';
};

export const getCurrentUser = () => {
  return getSessionUser();
};
