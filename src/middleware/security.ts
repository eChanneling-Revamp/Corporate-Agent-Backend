import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { logger, stream } from '../utils/logger';

/**
 * CORS configuration
 */
export const corsConfig = cors({
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080'
    ];

    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  maxAge: 86400 // 24 hours
});

/**
 * Rate limiting configurations
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      error: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`General rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      error: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute for API endpoints
  message: {
    success: false,
    message: 'API rate limit exceeded. Please slow down your requests.',
    error: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(`API rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'API rate limit exceeded. Please slow down your requests.',
      error: 'API_RATE_LIMIT_EXCEEDED'
    });
  }
});

/**
 * Security headers configuration using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * Request logging middleware
 */
export const requestLogger = morgan(
  process.env.LOG_FORMAT || 'combined',
  { stream }
);

/**
 * Compression middleware
 */
export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
});

/**
 * Security middleware for API key validation (for third-party integrations)
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: 'API key is required',
      error: 'MISSING_API_KEY'
    });
    return;
  }

  // TODO: Implement proper API key validation logic
  // For now, we'll accept any API key for development
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (validApiKeys.length > 0 && !validApiKeys.includes(apiKey)) {
    res.status(401).json({
      success: false,
      message: 'Invalid API key',
      error: 'INVALID_API_KEY'
    });
    return;
  }

  next();
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (sizeLimit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeLimitBytes = parseSize(sizeLimit);
      const requestSizeBytes = parseInt(contentLength);
      
      if (requestSizeBytes > sizeLimitBytes) {
        res.status(413).json({
          success: false,
          message: `Request size exceeds limit of ${sizeLimit}`,
          error: 'REQUEST_TOO_LARGE'
        });
        return;
      }
    }
    
    next();
  };
};

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
}

/**
 * Error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: isDevelopment ? error.details : undefined
    });
    return;
  }

  if (error.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid data format',
      error: 'INVALID_DATA_FORMAT'
    });
    return;
  }

  if (error.code === 11000) {
    res.status(409).json({
      success: false,
      message: 'Duplicate data found',
      error: 'DUPLICATE_DATA'
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR',
    details: isDevelopment ? error.message : undefined
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    error: 'ROUTE_NOT_FOUND'
  });
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          error: 'REQUEST_TIMEOUT'
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Health check endpoint middleware
 */
export const healthCheck = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
};

/**
 * IP whitelist middleware (for admin endpoints)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn(`Unauthorized IP access attempt: ${clientIP} on ${req.originalUrl}`);
      res.status(403).json({
        success: false,
        message: 'Access denied from this IP address',
        error: 'IP_NOT_ALLOWED'
      });
      return;
    }
    
    next();
  };
};