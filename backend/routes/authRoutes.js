import express from 'express';
import { signup, login, getMe, updateMe, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public authentication endpoints
router.post('/signup', signup);
router.post('/login', login);

// Protected endpoint to verify current user session
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.patch('/password', protect, changePassword);

export default router;
