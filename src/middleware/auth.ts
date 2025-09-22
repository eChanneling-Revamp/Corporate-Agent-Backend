import { Request, Response, NextFunction } from 'express';
import { authUtils } from '../utils/auth';
import { Agent } from '../models/Agent';
import { logger } from '../utils/logger';

// Extend Request interface to include agent
declare global {
  namespace Express {
    interface Request {
      agent?: any;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  agent: {
    agentId: string;
    email: string;
    status: string;
    permissions: string[];
  };
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    // Verify the token
    const decoded = authUtils.verifyAccessToken(token);

    // Check if agent exists and is active
    const agent = await Agent.findOne({ 
      agentId: decoded.agentId,
      status: { $in: ['active', 'pending'] }
    });

    if (!agent) {
      res.status(401).json({
        success: false,
        message: 'Agent not found or inactive',
        error: 'INVALID_AGENT'
      });
      return;
    }

    // Attach agent info to request
    req.agent = {
      agentId: decoded.agentId,
      email: decoded.email,
      status: decoded.status,
      permissions: decoded.permissions
    };

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);

    if (error.message === 'Access token expired') {
      res.status(401).json({
        success: false,
        message: 'Access token expired',
        error: 'TOKEN_EXPIRED'
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid access token',
      error: 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware to check if agent is verified
 */
export const requireVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.agent.status !== 'active') {
    res.status(403).json({
      success: false,
      message: 'Agent account is not verified or active',
      error: 'ACCOUNT_NOT_VERIFIED'
    });
    return;
  }
  next();
};

/**
 * Middleware to check permissions
 */
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const hasPermission = requiredPermissions.every(permission =>
      req.agent.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
        current: req.agent.permissions
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = authUtils.verifyAccessToken(token);
      const agent = await Agent.findOne({ agentId: decoded.agentId });

      if (agent) {
        req.agent = {
          agentId: decoded.agentId,
          email: decoded.email,
          status: decoded.status,
          permissions: decoded.permissions
        };
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Middleware to validate refresh token
 */
export const validateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        error: 'MISSING_REFRESH_TOKEN'
      });
      return;
    }

    // Verify refresh token
    const decoded = authUtils.verifyRefreshToken(refreshToken);

    // Check if agent exists and has this refresh token
    const agent = await Agent.findOne({
      agentId: decoded.agentId,
      refreshToken: refreshToken
    });

    if (!agent) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
      return;
    }

    req.agent = {
      agentId: decoded.agentId,
      email: decoded.email,
      status: decoded.status,
      permissions: decoded.permissions
    };

    next();
  } catch (error: any) {
    logger.error('Refresh token validation error:', error);

    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      error: 'INVALID_REFRESH_TOKEN'
    });
  }
};

/**
 * Middleware to check if agent can access specific resources
 */
export const canAccessResource = (resourceType: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { agentId } = req.agent;
      const resourceId = req.params.id || req.params.agentId;

      // Check if agent is accessing their own resources
      if (resourceType === 'agent' && resourceId !== agentId) {
        const hasAdminPermission = req.agent.permissions.includes('admin_access');
        
        if (!hasAdminPermission) {
          res.status(403).json({
            success: false,
            message: 'Cannot access other agent resources',
            error: 'ACCESS_DENIED'
          });
          return;
        }
      }

      next();
    } catch (error) {
      logger.error('Resource access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking resource access',
        error: 'ACCESS_CHECK_FAILED'
      });
    }
  };
};