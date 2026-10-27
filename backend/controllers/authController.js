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

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
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
      role: role ? role.trim() : 'Software Engineer'
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
    let user = await User.findOne({ email: cleanEmail }).select('+password');

    // Auto-seed demo user in MongoDB Atlas if logging in as demo for the first time
    if (!user && cleanEmail === 'demo@flowlock.app' && password === 'flowlock123') {
      user = await User.create({
        name: 'Diksha',
        email: 'demo@flowlock.app',
        password: 'flowlock123',
        role: 'Lead Engineer'
      });
      console.log('[Auth] Auto-seeded demo user in MongoDB Atlas: demo@flowlock.app');
    }

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

/**
 * @desc    Update authenticated user profile (name, role)
 * @route   PUT /api/auth/profile
 * @access  Private (Requires JWT)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, role } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters.' });
      }
      user.name = cleanName;
    }

    if (role !== undefined) {
      user.role = String(role).trim() || 'Software Engineer';
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change authenticated user password
 * @route   PUT /api/auth/password
 * @access  Private (Requires JWT)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    }

    const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!passwordComplexityRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must contain uppercase, lowercase, a number, and a special character.'
      });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
