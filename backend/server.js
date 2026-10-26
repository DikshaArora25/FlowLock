import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB, { disconnectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Initialize MongoDB connection
    await connectDB();

    // 2. Start Express server
    const server = app.listen(PORT, () => {
      console.log(`[FlowLock Backend] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[FlowLock Backend] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[FlowLock Backend] Tasks API:    http://localhost:${PORT}/api/tasks`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    return server;
  } catch (error) {
    console.error(`[Server Error] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
