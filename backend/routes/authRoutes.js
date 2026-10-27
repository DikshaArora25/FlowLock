import express from 'express';
import { signup, login, getMe, updateProfile, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public authentication endpoints
router.post('/signup', signup);
router.post('/login', login);

// Protected user session endpoints (Requires valid JWT)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

export default router;
