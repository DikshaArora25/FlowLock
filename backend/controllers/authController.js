import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Generate a signed JSON Web Token
 */
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required (at least 2 characters).'
      });
    }

    if (name.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Full name cannot exceed 80 characters.'
      });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length > 254 || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        success: false,
        message: 'Password cannot exceed 72 UTF-8 bytes.'
      });
    }

    // Password complexity check: upper, lower, number, special char
    const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!passwordComplexityRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain uppercase, lowercase, a number, and a special character.'
      });
    }

    if (role !== undefined && typeof role !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Role must be a string.'
      });
    }

    const cleanRole = role ? role.trim() : 'Software Engineer';
    if (cleanRole.length > 60) {
      return res.status(400).json({
        success: false,
        message: 'Role cannot exceed 60 characters.'
      });
    }

    // 2. Check for duplicate user
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // 3. Create user (password is automatically hashed via pre-save hook in User model)
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: cleanRole
    });

    // 4. Generate JWT
    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: newUser.toJSON()
    });
  } catch (error) {
    if (error?.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Query user and explicitly select password field
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password with bcrypt.compare
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private (Requires JWT)
 */
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};
