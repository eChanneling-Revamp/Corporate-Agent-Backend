const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT || 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  }
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    }
  });
});

// API Info endpoint
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'eChanneling Corporate Agent Module API',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/health',
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        reports: '/api/v1/reports'
      },
      database: {
        status: 'disconnected',
        message: 'MongoDB connection not available'
      }
    }
  });
});

// Basic auth endpoints (without database operations)
app.post('/api/v1/auth/register', (req, res) => {
  res.status(503).json({
    success: false,
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database connection not available. Registration temporarily disabled.'
    }
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  res.status(503).json({
    success: false,
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database connection not available. Login temporarily disabled.'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong!'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Info: http://localhost:${PORT}/api/v1`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;