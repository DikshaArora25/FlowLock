/**
 * FlowLock Auth Module — Authentication, Registration & Session Guard System
 */

import { saveSessionUser, getSessionUser, clearSessionUser, getRegisteredUsers, saveRegisteredUser } from './storage.js';

export const DEMO_USER = {
  email: 'demo@flowlock.app',
  password: 'flowlock123',
  name: 'Diksha Arora',
  role: 'Lead Software Engineer',
  memberSince: '2026-08-01'
};

// Authenticate user against LocalStorage registered users or demo credentials
export const loginUser = (email, password) => {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, message: 'Please enter both email address and password.' };
  }

  // 1. Check Demo User
  if (cleanEmail === DEMO_USER.email) {
    if (cleanPassword === DEMO_USER.password) {
      const userSession = {
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        role: DEMO_USER.role,
        memberSince: DEMO_USER.memberSince,
        loggedInAt: new Date().toISOString()
      };
      saveSessionUser(userSession);
      return { success: true, user: userSession };
    } else {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }
  }

  // 2. Check LocalStorage Registered Users
  const registeredUsers = getRegisteredUsers();
  const foundUser = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail);

  if (!foundUser) {
    return { success: false, message: 'Account not found. Please create an account.' };
  }

  if (foundUser.password !== cleanPassword) {
    return { success: false, message: 'Incorrect password. Please try again.' };
  }

  const userSession = {
    email: foundUser.email,
    name: foundUser.name,
    role: foundUser.role || 'User',
    memberSince: foundUser.memberSince || new Date().toISOString().split('T')[0],
    loggedInAt: new Date().toISOString()
  };
  saveSessionUser(userSession);
  return { success: true, user: userSession };
};

// Register a new user
export const signupUser = ({ name, email, password, confirmPassword }) => {
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();
  const cleanConfirm = (confirmPassword || '').trim();

  if (!cleanName || !cleanEmail || !cleanPassword || !cleanConfirm) {
    return { success: false, message: 'All fields are required.' };
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  if (cleanPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  if (cleanPassword !== cleanConfirm) {
    return { success: false, message: 'Passwords do not match.' };
  }

  // Check duplicate email (demo user + registered users)
  if (cleanEmail === DEMO_USER.email) {
    return { success: false, message: 'An account with this email already exists. Please sign in.' };
  }

  const existing = getRegisteredUsers();
  if (existing.some(u => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, message: 'An account with this email already exists. Please sign in.' };
  }

  const newUser = {
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    role: 'User',
    memberSince: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  saveRegisteredUser(newUser);

  // Auto log in newly registered user
  const userSession = {
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    memberSince: newUser.memberSince,
    loggedInAt: new Date().toISOString()
  };
  saveSessionUser(userSession);

  return { success: true, user: userSession };
};

// Require active session check for protected pages
export const checkAuthGuard = (currentPage) => {
  const session = getSessionUser();
  const protectedPages = ['dashboard', 'profile', 'tasks', 'activity'];
  const authPages = ['login', 'signup'];

  if (protectedPages.includes(currentPage) && !session) {
    window.location.href = 'login.html';
  } else if (authPages.includes(currentPage) && session) {
    window.location.href = 'dashboard.html';
  }
  return session;
};

// Logout handler
export const logoutUser = () => {
  clearSessionUser();
  window.location.href = 'landing.html';
};
