require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔧 Starting eChanneling Corporate Agent Module...');

// Optional MongoDB connection (non-blocking)
const connectDB = async () => {
  try {
    const mongoose = require('mongoose');
    console.log('Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Continuing with mock API responses...');
    return false;
  }
};

// Try to connect to MongoDB (don't block server startup)
let mongoConnected = false;
connectDB().then(connected => {
  mongoConnected = connected;
}).catch(() => {
  mongoConnected = false;
});

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
        status: mongoConnected ? 'connected' : 'disconnected',
        message: mongoConnected ? 'MongoDB Atlas connected' : 'Running with mock responses'
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
        status: mongoConnected ? 'connected' : 'disconnected',
        message: mongoConnected ? 'Full functionality available' : 'Mock responses active'
      }
    }
  });
});

// Mock Authentication Routes
app.post('/api/v1/auth/register', (req, res) => {
  if (mongoConnected) {
    res.status(503).json({
      success: false,
      error: {
        code: 'FEATURE_NOT_IMPLEMENTED',
        message: 'Full registration requires TypeScript models. Use npm run dev:ts for full functionality.'
      }
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'Registration endpoint ready',
      data: {
        mockResponse: true,
        requiredFields: ['companyName', 'contactPerson', 'email', 'password', 'phone', 'address'],
        note: 'Mock response - connect MongoDB for full functionality.'
      }
    });
  }
});

app.post('/api/v1/auth/login', (req, res) => {
  if (mongoConnected) {
    res.status(503).json({
      success: false,
      error: {
        code: 'FEATURE_NOT_IMPLEMENTED',
        message: 'Full login requires TypeScript models. Use npm run dev:ts for full functionality.'
      }
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'Login endpoint ready',
      data: {
        mockResponse: true,
        requiredFields: ['email', 'password'],
        note: 'Mock response - connect MongoDB for full functionality.'
      }
    });
  }
});

// Mock User Routes
app.get('/api/v1/users/profile', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile endpoint ready',
    data: {
      mockResponse: true,
      note: 'Mock response - use TypeScript version for full functionality.'
    }
  });
});

app.get('/api/v1/users/list', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Users list endpoint ready',
    data: {
      mockResponse: true,
      pagination: { page: 1, limit: 20, total: 0 },
      note: 'Mock response - use TypeScript version for full functionality.'
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
      stats: { totalAgents: 0, totalAppointments: 0, totalRevenue: 0, activeAgents: 0 },
      note: 'Mock response - use TypeScript version for full functionality.'
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
      note: 'Mock response - use TypeScript version for full functionality.'
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
${mongoConnected ? '🔗 MongoDB: Connected' : '🔧 Mode: Testing (Mock responses)'}

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
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔧 Starting eChanneling Corporate Agent Module...');

// Optional MongoDB connection (non-blocking)
const connectDB = async () => {
  try {
    const mongoose = require('mongoose');
    console.log('Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('⚠️  Continuing with mock API responses...');
    return false;
  }
};

// Try to connect to MongoDB (don't block server startup)
let mongoConnected = false;
connectDB().then(connected => {
  mongoConnected = connected;
}).catch(() => {
  mongoConnected = false;
});

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
app.use('/api', limiter);

// Body parsing middleware
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
        status: mongoConnected ? 'connected' : 'disconnected',
        message: mongoConnected ? 'MongoDB Atlas connected' : 'Running with mock responses'
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
        status: mongoConnected ? 'connected' : 'disconnected',
        message: mongoConnected ? 'Full functionality available' : 'Mock responses active'
      }
    }
  });
});

// Mock Authentication Routes
app.post('/api/v1/auth/register', (req, res) => {
  if (mongoConnected) {
    // TODO: Implement full registration logic
    res.status(503).json({
      success: false,
      error: {
        code: 'FEATURE_NOT_IMPLEMENTED',
        message: 'Full registration with database not yet implemented'
      }
    });
  } else {
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
  }
});

app.post('/api/v1/auth/login', (req, res) => {
  if (mongoConnected) {
    // TODO: Implement full login logic
    res.status(503).json({
      success: false,
      error: {
        code: 'FEATURE_NOT_IMPLEMENTED',
        message: 'Full login with database not yet implemented'
      }
    });
  } else {
    res.status(200).json({
      success: true,
      message: 'Login endpoint ready (MongoDB connection required for full functionality)',
      data: {
        mockResponse: true,
        requiredFields: ['email', 'password'],
        note: 'This is a mock response. Connect MongoDB for full functionality.'
      }
    });
  }
});

// Mock User Routes
app.get('/api/v1/users/profile', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Profile endpoint ready',
    data: {
      mockResponse: !mongoConnected,
      note: mongoConnected ? 'Database connected but endpoint needs implementation' : 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

app.get('/api/v1/users/list', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Users list endpoint ready',
    data: {
      mockResponse: !mongoConnected,
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      },
      note: mongoConnected ? 'Database connected but endpoint needs implementation' : 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

// Mock Reports Routes
app.get('/api/v1/reports/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dashboard endpoint ready',
    data: {
      mockResponse: !mongoConnected,
      stats: {
        totalAgents: 0,
        totalAppointments: 0,
        totalRevenue: 0,
        activeAgents: 0
      },
      note: mongoConnected ? 'Database connected but endpoint needs implementation' : 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});

app.get('/api/v1/reports/appointments', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Appointments report endpoint ready',
    data: {
      mockResponse: !mongoConnected,
      dateRange: {
        startDate: req.query.startDate || 'not provided',
        endDate: req.query.endDate || 'not provided'
      },
      note: mongoConnected ? 'Database connected but endpoint needs implementation' : 'This is a mock response. Connect MongoDB for full functionality.'
    }
  });
});
    }
  });
});

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'eChanneling Corporate Agent Module API',
    data: {
      version: '1.0.0',
      description: 'REST API for Corporate Agent Module',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        reports: '/api/v1/reports'
      },
      documentation: '/api/v1/docs'
    }
  });
});

// API routes (placeholder for now)
app.use('/api/v1/auth', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authentication endpoints available',
    data: {
      endpoints: [
        'POST /register',
        'POST /login',
        'POST /refresh',
        'GET /me',
        'POST /logout'
      ]
    }
  });
});

app.use('/api/v1/users', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User management endpoints available',
    data: {
      endpoints: [
        'GET /profile',
        'PUT /profile',
        'GET /list',
        'GET /search'
      ]
    }
  });
});

app.use('/api/v1/reports', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Reporting endpoints available',
    data: {
      endpoints: [
        'GET /appointments',
        'GET /revenue',
        'GET /agents',
        'GET /dashboard'
      ]
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📱 Environment: ${process.env.NODE_ENV || 'development'}
🌐 API URL: http://localhost:${PORT}
📚 Health Check: http://localhost:${PORT}/health
🔗 API Info: http://localhost:${PORT}/api/v1
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

module.exports = app;