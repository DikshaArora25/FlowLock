import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * @desc   Server and Database Health Check
 * @route  GET /api/health
 */
router.get('/', (req, res) => {
  const mongoStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = mongoose.connection.readyState;
  const host = mongoose.connection.host || '';
  const isAtlas = Boolean(host && (host.includes('mongodb.net') || host.includes('atlas')));

  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: mongoStatus[dbState] || 'unknown',
      connected: dbState === 1,
      name: mongoose.connection.name || 'flowlock',
      host: host,
      isAtlas: isAtlas,
      type: isAtlas ? 'MongoDB Atlas (Cloud)' : 'Local MongoDB'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
