/**
 * FlowLock Authentication Module
 *
 * Handles:
 * - User registration
 * - Email validation
 * - Password validation
 * - Password hashing
 * - User persistence
 * - Login
 * - Session management
 * - Authentication guards
 * - Logout
 */

import {
    saveSessionUser,
    getSessionUser,
    clearSessionUser,
    loadUsers,
    saveUsers
} from './storage.js';


/* =========================================================
   DEMO ACCOUNT
   ========================================================= */

const DEMO_USER = {
    email: 'demo@flowlock.app',
    password: 'flowlock123',
    name: 'Diksha',
    role: 'Lead Engineer'
};


/* =========================================================
   VALIDATION
   ========================================================= */

/**
 * Validate email format.
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};


/**
 * Validate password strength.
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
export const isValidPassword = (password) => {
    const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    return passwordRegex.test(password);
};


/* =========================================================
   PASSWORD HASHING
   ========================================================= */

const hashPassword = async (password) => {

    const encoder = new TextEncoder();

    const data = encoder.encode(password);

    const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        data
    );

    const hashArray = Array.from(
        new Uint8Array(hashBuffer)
    );

    return hashArray
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};


/* =========================================================
   USER ID
   ========================================================= */

const generateUserId = () => {

    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `user-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;
};


/* =========================================================
   SIGN UP
   ========================================================= */

export const signupUser = async ({
    name,
    email,
    password,
    confirmPassword
}) => {

    /* ---------- Clean input ---------- */

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();


    /* ---------- Name validation ---------- */

    if (!cleanName) {
        return {
            success: false,
            message: 'Please enter your full name.'
        };
    }

    if (cleanName.length < 2) {
        return {
            success: false,
            message: 'Name must contain at least 2 characters.'
        };
    }


    /* ---------- Email validation ---------- */

    if (!isValidEmail(cleanEmail)) {
        return {
            success: false,
            message: 'Please enter a valid email address.'
        };
    }


    /* ---------- Password validation ---------- */

    if (!isValidPassword(password)) {
        return {
            success: false,
            message:
                'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
        };
    }


    /* ---------- Confirm password ---------- */

    if (password !== confirmPassword) {
        return {
            success: false,
            message: 'Passwords do not match.'
        };
    }


    /* ---------- Load existing users ---------- */

    const users = loadUsers();


    /* ---------- Duplicate email check ---------- */

    const existingUser = users.find(
        user => user.email === cleanEmail
    );

    if (existingUser) {
        return {
            success: false,
            message: 'An account with this email already exists.'
        };
    }


    /* ---------- Hash password ---------- */

    let passwordHash;

    try {

        passwordHash = await hashPassword(password);

    } catch (error) {

        console.error(
            'Password hashing failed:',
            error
        );

        return {
            success: false,
            message:
                'Unable to create account. Please try again.'
        };
    }


    /* ---------- Create user ---------- */

    const newUser = {

        id: generateUserId(),

        name: cleanName,

        email: cleanEmail,

        passwordHash,

        role: 'Project Member',

        createdAt: new Date().toISOString()

    };


    /* ---------- Save user ---------- */

    users.push(newUser);

    const saved = saveUsers(users);

    if (!saved) {

        return {
            success: false,
            message:
                'Unable to save your account. Please try again.'
        };
    }


    /* ---------- Success ---------- */

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


/* =========================================================
   LOGIN
   ========================================================= */

export const loginUser = async (
    email,
    password
) => {

    const cleanEmail =
        email.trim().toLowerCase();

    const cleanPassword =
        password.trim();


    /* ---------- Validate email ---------- */

    if (!isValidEmail(cleanEmail)) {

        return {
            success: false,
            message: 'Please enter a valid email address.'
        };

    }


    /* ---------- Demo account ---------- */

    if (
        cleanEmail === DEMO_USER.email &&
        cleanPassword === DEMO_USER.password
    ) {

        const userSession = {

            id: 'demo-user',

            email: DEMO_USER.email,

            name: DEMO_USER.name,

            role: DEMO_USER.role,

            loggedInAt:
                new Date().toISOString()

        };

        saveSessionUser(userSession);

        return {

            success: true,

            user: userSession

        };

    }


    /* ---------- Load registered users ---------- */

    const users = loadUsers();


    /* ---------- Find account ---------- */

    const user = users.find(
        storedUser =>
            storedUser.email === cleanEmail
    );


    if (!user) {

        return {

            success: false,

            message:
                'No account exists with this email.'

        };

    }


    /* ---------- Hash entered password ---------- */

    let enteredPasswordHash;

    try {

        enteredPasswordHash =
            await hashPassword(cleanPassword);

    } catch (error) {

        console.error(
            'Password hashing failed:',
            error
        );

        return {

            success: false,

            message:
                'Unable to sign in. Please try again.'

        };

    }


    /* ---------- Verify password ---------- */

    if (
        enteredPasswordHash !==
        user.passwordHash
    ) {

        return {

            success: false,

            message:
                'Incorrect password. Please try again.'

        };

    }


    /* ---------- Create session ---------- */

    const userSession = {

        id: user.id,

        email: user.email,

        name: user.name,

        role: user.role,

        createdAt: user.createdAt,

        loggedInAt:
            new Date().toISOString()

    };


    saveSessionUser(userSession);


    /* ---------- Successful login ---------- */

    return {

        success: true,

        user: userSession

    };

};


/* =========================================================
   AUTH GUARD
   ========================================================= */

export const checkAuthGuard = (
    currentPage
) => {

    const session =
        getSessionUser();


    /* ---------- Protected pages ---------- */

    if (
        (
            currentPage === 'dashboard' ||
            currentPage === 'profile'
        ) &&
        !session
    ) {

        window.location.href =
            'login.html';

        return null;

    }


    /* ---------- Login page ---------- */

    if (
        currentPage === 'login' &&
        session
    ) {

        window.location.href =
            'dashboard.html';

        return session;

    }


    return session;

};


/* =========================================================
   LOGOUT
   ========================================================= */

export const logoutUser = () => {

    clearSessionUser();

    window.location.href =
        'login.html';

};


/* =========================================================
   GET CURRENT USER
   ========================================================= */

export const getCurrentUser = () => {

    return getSessionUser();

};