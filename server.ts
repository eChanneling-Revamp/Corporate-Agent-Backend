import express from 'express';
import dotenv from 'dotenv';
import { database } from './src/utils/database';
import { logger } from './src/utils/logger';
import {
  corsConfig,
  generalRateLimit,
  securityHeaders,
  requestLogger,
  compressionMiddleware,
  errorHandler,
  notFoundHandler,
  requestTimeout,
  healthCheck
} from './src/middleware/security';

// Load environment variables
dotenv.config();

// Import route modules (we'll create these)
import authRoutes from './src/routes/auth';
import userRoutes from './src/routes/users';
import reportRoutes from './src/routes/reports';

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(corsConfig);
app.use(requestTimeout(30000)); // 30 seconds timeout
app.use(compressionMiddleware);

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);

// API documentation endpoint
app.get(`/api/${API_VERSION}`, (req, res) => {
  res.json({
    success: true,
    message: 'eChanneling Corporate Agent Module API',
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `/api/${API_VERSION}/auth`,
      users: `/api/${API_VERSION}/users`,
      reports: `/api/${API_VERSION}/reports`,
      health: '/health'
    },
    documentation: {
      postman: '/api/postman-collection',
      swagger: '/api/docs'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection and server startup
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();
    logger.info('Database connected successfully');

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API Version: ${API_VERSION}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

export default app;