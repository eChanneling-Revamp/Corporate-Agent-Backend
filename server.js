require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('Starting eChanneling Corporate Agent Module...');

// Optional MongoDB connection (non-blocking)
const connectDB = async () => {
  const maxRetries = 3;
  let currentTry = 0;
  
  while (currentTry < maxRetries) {
    try {
      const mongoose = require('mongoose');
      console.log(`Attempting to connect to MongoDB Atlas... (Attempt ${currentTry + 1}/${maxRetries})`);
      
      // Enhanced connection options for better connectivity
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 30000, // Increased timeout
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        family: 4, // Force IPv4
        retryWrites: true,
        w: 'majority',
        authSource: 'admin',
        ssl: true
      };
      
      await mongoose.connect(process.env.MONGODB_URI, options);
      console.log('MongoDB connected successfully');
      console.log('Database name:', mongoose.connection.db.databaseName);
      console.log('Connection host:', mongoose.connection.host);
      return true;
      
    } catch (error) {
      currentTry++;
      console.error(`MongoDB connection failed (Attempt ${currentTry}/${maxRetries}):`, error.message);
      
      if (error.code === 'ENOTFOUND') {
        console.error('DNS resolution failed. This could be due to:');
        console.error('- Network connectivity issues');
        console.error('- DNS server problems');
        console.error('- Firewall blocking MongoDB connections');
        console.error('- ISP blocking MongoDB Atlas ports');
      }
      
      if (currentTry < maxRetries) {
        console.log(`Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('Error details:', {
          code: error.code,
          codeName: error.codeName,
          name: error.name
        });
        console.log('All connection attempts failed. Continuing with mock API responses...');
      }
    }
  }
  
  return false;
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
eChanneling Corporate Agent Module API
Server running on: http://localhost:${PORT}
Health check: http://localhost:${PORT}/health
API Info: http://localhost:${PORT}/api/v1
Environment: ${process.env.NODE_ENV || 'development'}
${mongoConnected ? 'MongoDB: Connected' : 'Mode: Testing (Mock responses)'}

Ready for API testing with Postman!
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