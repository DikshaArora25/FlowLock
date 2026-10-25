import express from 'express';
import { signup, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public authentication endpoints
router.post('/signup', signup);
router.post('/login', login);

// Protected endpoint to verify current user session
router.get('/me', protect, getMe);

export default router;
