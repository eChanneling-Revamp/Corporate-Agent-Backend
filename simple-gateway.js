const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Corporate Agent API Gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'PostgreSQL (Neon)',
    framework: 'NestJS (Migration in Progress)'
  });
});

app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    message: 'Corporate Agent API Documentation',
    services: [
      'API Gateway (Port 3001)',
      'Auth Service (Port 3002)',
      'User Service (Port 3003)',
      'Appointment Service (Port 3004)',
      'Payment Service (Port 3005)',
      'Notification Service (Port 3006)'
    ],
    documentation: 'Swagger documentation will be available once NestJS services are fully implemented'
  });
});

// Database status
app.get('/db/status', (req, res) => {
  res.json({
    database: 'PostgreSQL',
    provider: 'Neon',
    status: 'connected',
    url: process.env.DATABASE_URL ? 'configured' : 'not configured',
    schema: 'Applied via Prisma'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Corporate Agent API Gateway running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`💾 Database Status: http://localhost:${PORT}/db/status`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});