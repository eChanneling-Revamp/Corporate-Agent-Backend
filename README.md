# eChanneling Corporate Agent Module - API Documentation

## Overview
Complete backend system for the eChanneling Corporate Agent Module featuring authentication, user management, reporting, and comprehensive API endpoints.

## Features
- **JWT Authentication** - Secure token-based authentication with refresh tokens
- **User Management** - Complete agent profile and permission management
- **Reporting System** - Comprehensive reporting with CSV export capabilities
- **Security** - Rate limiting, CORS, helmet security headers, input validation
- **Docker Support** - Full containerization with development and production configurations
- **API Testing** - Complete Postman collection with automated token management

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account or local MongoDB
- Git

### Development Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd "Coparate Agent Module"
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start development server:**
```bash
npm run dev
```

### Docker Development

1. **Start with Docker Compose:**
```bash
# Development environment with hot reload
docker-compose -f docker-compose.dev.yml up -d

# Production environment
docker-compose up -d
```

2. **Access services:**
- API: http://localhost:5000
- MongoDB Express: http://localhost:8081
- Redis Commander: http://localhost:8082

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new agent
- `POST /api/v1/auth/login` - Agent login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current agent info
- `GET /api/v1/auth/validate-token` - Validate token
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `GET /api/v1/auth/verify-email/:token` - Verify email
- `POST /api/v1/auth/logout` - Logout

### User Management
- `GET /api/v1/users/profile` - Get my profile
- `PUT /api/v1/users/profile` - Update my profile
- `GET /api/v1/users/profile/:id` - Get agent profile by ID
- `GET /api/v1/users/list` - Get agents list (paginated)
- `GET /api/v1/users/search` - Search agents
- `GET /api/v1/users/statistics` - Get agent statistics
- `GET /api/v1/users/activities` - Get agent activities
- `GET /api/v1/users/dashboard` - Get dashboard data
- `PUT /api/v1/users/status/:id` - Update agent status (Admin)
- `PUT /api/v1/users/permissions/:id` - Update agent permissions (Admin)
- `DELETE /api/v1/users/:id` - Delete agent (Admin)

### Reports
- `GET /api/v1/reports/appointments` - Generate appointment report
- `GET /api/v1/reports/revenue` - Generate revenue report
- `GET /api/v1/reports/agents` - Generate agent report (Admin)
- `GET /api/v1/reports/doctors` - Generate doctor report
- `GET /api/v1/reports/dashboard` - Get dashboard statistics
- `GET /api/v1/reports/summary` - Get summary statistics
- `GET /api/v1/reports/export/appointments` - Export appointment report (CSV)
- `GET /api/v1/reports/export/revenue` - Export revenue report (CSV)

## Postman Collection

### Import Collection
1. Import `postman-collection.json` into Postman
2. Import environment files from `postman-environments/`
3. Select appropriate environment (development/production)

### Authentication Flow
1. **Register Agent** - Creates new agent and auto-sets tokens
2. **Login Agent** - Authenticates and auto-sets tokens
3. **Use Protected Endpoints** - Tokens automatically included

### Auto-Token Management
- Access tokens automatically extracted and stored
- Refresh tokens handled automatically
- Environment variables updated on authentication

## Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/echanneling_dev
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
EMAIL_FROM=noreply@echanneling.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Security
CORS_ORIGIN=http://localhost:3000
API_RATE_LIMIT=100
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info
```

## Docker Services

### Development Stack
- **Backend**: Node.js API with hot reload
- **MongoDB**: Database with persistent volumes
- **Redis**: Caching and session storage
- **MongoDB Express**: Database management UI
- **Redis Commander**: Redis management UI

### Production Stack
- **Backend**: Optimized Node.js API
- **MongoDB**: Production database
- **Redis**: Production cache
- **Nginx**: Reverse proxy and load balancer

## Security Features

- **Rate Limiting**: Configurable API rate limits
- **CORS Protection**: Cross-origin request security
- **Helmet Security**: Security headers middleware
- **Input Validation**: Comprehensive request validation
- **Password Hashing**: bcrypt with configurable rounds
- **JWT Security**: Secure token implementation
- **Environment Isolation**: Separate dev/prod configurations

## Database Models

### Agent Model
- Company information and contact details
- Authentication credentials
- Business registration and tax information
- Payment details and commission structure
- Document management
- Status and permissions

### Appointment Model
- Patient and doctor information
- Scheduling and status tracking
- Payment and commission tracking
- Agent association

### Doctor Model
- Professional information
- Specialization and qualifications
- Availability and scheduling
- Performance metrics

## Monitoring and Logging

- **Winston Logging**: Structured logging with multiple transports
- **Health Checks**: Built-in health monitoring endpoints
- **Error Tracking**: Comprehensive error handling and logging
- **Performance Monitoring**: Request timing and metrics

## Development Tools

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start           # Start production server
npm run test        # Run test suite
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```

### Docker Commands
```bash
# Development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml logs -f backend

# Production
docker-compose up -d
docker-compose logs -f

# Management
docker-compose down
docker-compose restart backend
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "req-123456789"
  }
}
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request