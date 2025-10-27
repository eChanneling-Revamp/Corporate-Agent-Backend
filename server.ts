import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { database, prisma } from './src/utils/database';
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

// Import route modules
import authRoutes from './src/routes/auth';
import userRoutes from './src/routes/users';
import reportRoutes from './src/routes/reports';
import ticketsRoutes from './src/routes/tickets';
import customersRoutes from './src/routes/customers';
import followUpsRoutes from './src/routes/followUps';
import approvalsRoutes from './src/routes/approvals';
import bulkBookingRoutes from './src/routes/bulkBooking';
import patientHistoryRoutes from './src/routes/patientHistory';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Initialize Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/'
});

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

// WebSocket Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const agent = await prisma.agent.findUnique({
      where: { id: decoded.agentId },
      select: { id: true, email: true, name: true, role: true, isActive: true }
    });

    if (!agent || !agent.isActive) {
      return next(new Error('Invalid or inactive agent'));
    }

    (socket as any).agentId = agent.id;
    (socket as any).agentRole = agent.role;
    (socket as any).agentEmail = agent.email;

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// WebSocket Connection Handling
io.on('connection', (socket) => {
  const agentId = (socket as any).agentId;
  const agentRole = (socket as any).agentRole;
  
  logger.info(`Agent ${agentId} (${agentRole}) connected via WebSocket`);

  // Join agent-specific room
  socket.join(`agent:${agentId}`);
  
  // Join role-specific room
  socket.join(`role:${agentRole}`);
  
  // Join general notifications room
  socket.join('notifications');

  // Handle appointment updates
  socket.on('appointment:update', async (data: { 
    appointmentId: string; 
    status: string; 
    notes?: string 
  }) => {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: data.appointmentId },
        include: { agent: true, doctor: true, hospital: true }
      });

      if (!appointment || (appointment.agentId !== agentId && agentRole !== 'ADMIN')) {
        socket.emit('error', { message: 'Unauthorized access' });
        return;
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { 
          status: data.status as any,
          notes: data.notes,
          updatedAt: new Date()
        },
        include: { doctor: true, hospital: true, agent: true }
      });

      // Broadcast update to relevant parties
      io.to(`agent:${appointment.agentId}`).emit('appointment:updated', updatedAppointment);
      io.to('role:ADMIN').to('role:SUPERVISOR').emit('appointment:status_changed', {
        appointmentId: data.appointmentId,
        oldStatus: appointment.status,
        newStatus: data.status,
        updatedBy: agentId
      });

      socket.emit('appointment:update_success', { appointmentId: data.appointmentId });
      
    } catch (error) {
      logger.error('Error updating appointment:', error);
      socket.emit('error', { message: 'Failed to update appointment' });
    }
  });

  // Handle real-time notifications
  socket.on('notification:mark_read', async (notificationId: string) => {
    try {
      await prisma.activityLog.create({
        data: {
          agentId,
          action: 'NOTIFICATION_READ',
          entityType: 'Notification',
          entityId: notificationId,
          details: { timestamp: new Date() }
        }
      });
      
      socket.emit('notification:marked_read', { notificationId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });

  // Handle dashboard subscriptions
  socket.on('dashboard:subscribe', () => {
    socket.join('dashboard_updates');
    socket.emit('dashboard:subscribed');
  });

  socket.on('dashboard:unsubscribe', () => {
    socket.leave('dashboard_updates');
    socket.emit('dashboard:unsubscribed');
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info(`Agent ${agentId} disconnected: ${reason}`);
  });
});

// Health check endpoint
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);
app.use(`/api/${API_VERSION}/tickets`, ticketsRoutes);
app.use(`/api/${API_VERSION}/customers`, customersRoutes);
app.use(`/api/${API_VERSION}/follow-ups`, followUpsRoutes);
app.use(`/api/${API_VERSION}/approvals`, approvalsRoutes);
app.use(`/api/${API_VERSION}/bulk-booking`, bulkBookingRoutes);
app.use(`/api/${API_VERSION}/patient-history`, patientHistoryRoutes);

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
      tickets: `/api/${API_VERSION}/tickets`,
      customers: `/api/${API_VERSION}/customers`,
      followUps: `/api/${API_VERSION}/follow-ups`,
      approvals: `/api/${API_VERSION}/approvals`,
      bulkBooking: `/api/${API_VERSION}/bulk-booking`,
      patientHistory: `/api/${API_VERSION}/patient-history`,
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
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API Version: ${API_VERSION}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
      logger.info(`WebSocket server initialized on port ${PORT}`);
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