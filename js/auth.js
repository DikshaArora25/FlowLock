/**
 * FlowLock — Production-Grade Authentication Engine
 * Pure Vanilla JavaScript · Web Crypto API (PBKDF2 with Salt) · Session Token Lifecycle
 */

import {
  saveSessionUser,
  getSessionUser,
  clearSessionUser,
  loadUsers,
  saveUsers
} from './storage.js';

/* ==========================================================================
   CONSTANTS & DEMO CREDENTIALS
   ========================================================================== */

export const DEMO_USER = {
  email: 'demo@flowlock.app',
  password: 'flowlock123',
  name: 'Diksha',
  role: 'Lead Engineer'
};

const PBKDF2_ITERATIONS = 100000;
const PROTECTED_PAGES = ['dashboard', 'tasks', 'activity', 'profile'];
const GUEST_PAGES = ['login', 'signup', 'index'];

/* ==========================================================================
   CRYPTOGRAPHIC UTILITIES (PBKDF2 WITH SALT)
   ========================================================================== */

// Convert Uint8Array buffer to hex string
const bufferToHex = (buffer) => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Convert hex string to Uint8Array buffer
const hexToBuffer = (hexString) => {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return bytes.buffer;
};

// Generate 16-byte random cryptographic salt
export const generateSalt = () => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bufferToHex(salt);
};

/**
 * Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and salt.
 * Returns formatted string: "salt:hashHex"
 */
export const hashPassword = async (password, salt = null) => {
  const actualSalt = salt || generateSalt();
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(actualSalt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  );

  const hashHex = bufferToHex(derivedBits);
  return `${actualSalt}:${hashHex}`;
};

/**
 * Verify a candidate password against a stored hash.
 * Supports modern salted PBKDF2 ("salt:hash") as well as legacy SHA-256 fallback.
 */
export const verifyPassword = async (candidatePassword, storedHash) => {
  if (!storedHash || !candidatePassword) return false;

  // Salted PBKDF2 verification
  if (storedHash.includes(':')) {
    const [salt] = storedHash.split(':');
    const computed = await hashPassword(candidatePassword, salt);
    return computed === storedHash;
  }

  // Legacy SHA-256 fallback
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(candidatePassword));
  const computedHex = bufferToHex(hashBuffer);
  return computedHex === storedHash;
};

/* ==========================================================================
   VALIDATION & PASSWORD STRENGTH ENGINE
   ========================================================================== */

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
  let color = '#ef4444'; // Red

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

/* ==========================================================================
   USER REGISTRATION & LOGIN
   ========================================================================== */

const generateUserId = () => {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

  const users = loadUsers();
  const existingUser = users.find(u => u.email === cleanEmail);

  if (existingUser || cleanEmail === DEMO_USER.email.toLowerCase()) {
    return { success: false, message: 'An account with this email already exists.' };
  }

  let passwordHash;
  try {
    passwordHash = await hashPassword(password);
  } catch (error) {
    console.error('Password hashing failed:', error);
    return { success: false, message: 'Unable to secure password. Please try again.' };
  }

  const newUser = {
    id: generateUserId(),
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    role: cleanRole,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  const saved = saveUsers(users);

  if (!saved) {
    return { success: false, message: 'Unable to save account. Please try again.' };
  }

  return {
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  };
};

export const loginUser = async (email, password, rememberMe = false) => {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanPassword = password ? password.trim() : '';

  if (!isValidEmail(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  if (!cleanPassword) {
    return { success: false, message: 'Please enter your password.' };
  }

  const now = Date.now();
  // Standard session: 24h; Remember me: 30 days
  const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now + durationMs).toISOString();

  // Demo user check
  if (cleanEmail === DEMO_USER.email.toLowerCase() && cleanPassword === DEMO_USER.password) {
    const userSession = {
      id: 'demo-user',
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: DEMO_USER.role,
      sessionToken: crypto.randomUUID ? crypto.randomUUID() : `token-${Date.now()}`,
      rememberMe: Boolean(rememberMe),
      loggedInAt: new Date().toISOString(),
      expiresAt
    };

    saveSessionUser(userSession, rememberMe);
    return { success: true, user: userSession };
  }

  // Load stored users
  const users = loadUsers();
  const user = users.find(u => u.email === cleanEmail);

  if (!user) {
    return { success: false, message: 'No account found with this email address.' };
  }

  let isPasswordValid = false;
  try {
    isPasswordValid = await verifyPassword(cleanPassword, user.passwordHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return { success: false, message: 'Authentication verification failed. Please try again.' };
  }

  if (!isPasswordValid) {
    return { success: false, message: 'Incorrect password. Please try again.' };
  }

  const userSession = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'Software Engineer',
    sessionToken: crypto.randomUUID ? crypto.randomUUID() : `token-${Date.now()}`,
    rememberMe: Boolean(rememberMe),
    createdAt: user.createdAt,
    loggedInAt: new Date().toISOString(),
    expiresAt
  };

  saveSessionUser(userSession, rememberMe);
  return { success: true, user: userSession };
};

/* ==========================================================================
   PROFILE & ACCOUNT MANAGEMENT
   ========================================================================== */

export const updateUserProfile = ({ name, role }) => {
  const current = getSessionUser();
  if (!current) return { success: false, message: 'No active session.' };

  const cleanName = name ? name.trim() : current.name;
  const cleanRole = role ? role.trim() : (current.role || 'Software Engineer');

  if (cleanName.length < 2) {
    return { success: false, message: 'Full name must be at least 2 characters.' };
  }

  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === current.id || u.email === current.email);

  if (userIndex !== -1) {
    users[userIndex].name = cleanName;
    users[userIndex].role = cleanRole;
    saveUsers(users);
  }

  const updatedSession = {
    ...current,
    name: cleanName,
    role: cleanRole
  };

  saveSessionUser(updatedSession, current.rememberMe);
  return { success: true, user: updatedSession };
};

export const changeUserPassword = async ({ currentPassword, newPassword, confirmNewPassword }) => {
  const current = getSessionUser();
  if (!current) return { success: false, message: 'No active session.' };

  if (newPassword !== confirmNewPassword) {
    return { success: false, message: 'New passwords do not match.' };
  }

  if (!isValidPassword(newPassword)) {
    return {
      success: false,
      message: 'New password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
    };
  }

  // Demo user handling
  if (current.id === 'demo-user') {
    if (currentPassword !== DEMO_USER.password) {
      return { success: false, message: 'Current password does not match demo credentials.' };
    }
    return { success: true, message: 'Demo password verified. Password updated successfully!' };
  }

  const users = loadUsers();
  const user = users.find(u => u.id === current.id || u.email === current.email);

  if (!user) {
    return { success: false, message: 'User account record not found.' };
  }

  const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return { success: false, message: 'Current password is incorrect.' };
  }

  const newHash = await hashPassword(newPassword);
  user.passwordHash = newHash;
  saveUsers(users);

  return { success: true, message: 'Password updated successfully!' };
};

/* ==========================================================================
   ROUTE GUARDS & SESSION LIFECYCLE
   ========================================================================== */

export const checkAuthGuard = (currentPage) => {
  const session = getSessionUser();

  // Protected pages -> redirect to login if no valid session
  if (PROTECTED_PAGES.includes(currentPage) && !session) {
    window.location.href = 'login.html';
    return null;
  }

  // Guest-only pages -> redirect to dashboard if logged in
  if (GUEST_PAGES.includes(currentPage) && session) {
    window.location.href = 'dashboard.html';
    return session;
  }

  return session;
};

export const logoutUser = () => {
  clearSessionUser();
  window.location.href = 'login.html';
};

export const getCurrentUser = () => {
  return getSessionUser();
};