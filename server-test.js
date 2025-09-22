require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = 5000; // Force port 5000

console.log('🔧 Starting eChanneling Corporate Agent Module...');

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
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
      version: '1.0.0',
      database: {
        status: 'MongoDB connection temporarily disabled for testing',
        message: 'API structure ready for testing'
      }
    }
  });
});

// API Info endpoint
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'eChanneling Corporate Agent Module API',
    data: {
      name: 'eChanneling Corporate Agent Module',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      status: 'operational',
      endpoints: {
        health: '/health',
        auth: {
          register: 'POST /api/v1/auth/register',
          login: 'POST /api/v1/auth/login',
          refresh: 'POST /api/v1/auth/refresh',
          me: 'GET /api/v1/auth/me',
          logout: 'POST /api/v1/auth/logout'
        },
        users: {
          profile: 'GET /api/v1/users/profile',
          list: 'GET /api/v1/users/list',
          search: 'GET /api/v1/users/search'
        },
        reports: {
          appointments: 'GET /api/v1/reports/appointments',
          revenue: 'GET /api/v1/reports/revenue',
          dashboard: 'GET /api/v1/reports/dashboard'
        }
      },
      database: {
        status: 'temporarily_disabled',
        message: 'MongoDB connection disabled for API testing'
      }
    }
  });
});

// Mock Authentication Routes
app.post('/api/v1/auth/register', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Registration endpoint ready (MongoDB connection required for full functionality)',
    data: {
      mockResponse: true,
      requiredFields: [
        'companyName', 'contactPerson', 'email', 'password', 
        'phone', 'address', 'businessRegistrationNumber'
      ],
      note: 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

app.post('/api/v1/auth/login', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Login endpoint ready (MongoDB connection required for full functionality)',
    data: {
      mockResponse: true,
      requiredFields: ['email', 'password'],
      note: 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

// Mock User Routes
app.get('/api/v1/users/profile', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile endpoint ready',
    data: {
      mockResponse: true,
      note: 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

app.get('/api/v1/users/list', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Users list endpoint ready',
    data: {
      mockResponse: true,
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      },
      note: 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

// Mock Reports Routes
app.get('/api/v1/reports/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dashboard endpoint ready',
    data: {
      mockResponse: true,
      stats: {
        totalAgents: 0,
        totalAppointments: 0,
        totalRevenue: 0,
        activeAgents: 0
      },
      note: 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

app.get('/api/v1/reports/appointments', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Appointments report endpoint ready',
    data: {
      mockResponse: true,
      dateRange: {
        startDate: req.query.startDate || 'not provided',
        endDate: req.query.endDate || 'not provided'
      },
      note: 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong!',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      availableRoutes: [
        'GET /health',
        'GET /api/v1',
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/login',
        'GET /api/v1/users/profile',
        'GET /api/v1/users/list',
        'GET /api/v1/reports/dashboard',
        'GET /api/v1/reports/appointments'
      ]
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
🚀 eChanneling Corporate Agent Module API
📍 Server running on: http://localhost:${PORT}
📊 Health check: http://localhost:${PORT}/health
📋 API Info: http://localhost:${PORT}/api/v1
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔧 Mode: Testing (MongoDB temporarily disabled)

✅ Ready for API testing with Postman!
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;