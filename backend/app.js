import express from 'express';
import cors from 'cors';

import healthRoutes from './routes/healthRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS configuration supporting Vercel frontend, local dev, and external clients
app.use(cors({
  origin: true, // Dynamically allows Vercel frontend domain, localhost, etc.
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health & API discovery endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'FlowLock API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      tasks: '/api/tasks',
      activity: '/api/activity'
    }
  });
});

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity', activityRoutes);

// Centralized 404 handler for API routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
