import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { authRateLimit } from '../middleware/security';
import {
  validateAgentRegistration,
  validateAgentLogin,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordReset
} from '../middleware/validation';
import { authenticateToken, validateRefreshToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting to auth routes
router.use(authRateLimit);

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new agent
 * @access Public
 */
router.post('/register', validateAgentRegistration, async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Registration route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: 'REGISTRATION_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/login
 * @desc Login agent
 * @access Public
 */
router.post('/login', validateAgentLogin, async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    
    const statusCode = result.success ? 200 : 401;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Login route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: 'LOGIN_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', validateRefreshToken, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    
    const statusCode = result.success ? 200 : 401;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Token refresh route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh',
      error: 'TOKEN_REFRESH_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout agent
 * @access Private
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const result = await authService.logout(agentId);
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.error('Logout route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
      error: 'LOGOUT_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change agent password
 * @access Private
 */
router.post('/change-password', authenticateToken, validatePasswordChange, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const result = await authService.changePassword(agentId, req.body);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Change password route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password change',
      error: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', validatePasswordResetRequest, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    
    // Always return 200 for security (don't reveal if email exists)
    res.status(200).json({
      success: true,
      message: result.message
    });
    
  } catch (error: any) {
    logger.error('Forgot password route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password reset request',
      error: 'FORGOT_PASSWORD_ERROR'
    });
  }
});

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', validatePasswordReset, async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Reset password route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password reset',
      error: 'RESET_PASSWORD_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/auth/verify-email/:token
 * @desc Verify agent email
 * @access Public
 */
router.get('/verify-email/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const result = await authService.verifyEmail(token);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Email verification route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification',
      error: 'EMAIL_VERIFICATION_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/auth/me
 * @desc Get current agent info
 * @access Private
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const agent = (req as any).agent;
    
    res.status(200).json({
      success: true,
      message: 'Agent information retrieved successfully',
      data: {
        agentId: agent.agentId,
        email: agent.email,
        status: agent.status,
        permissions: agent.permissions
      }
    });
    
  } catch (error: any) {
    logger.error('Get me route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving agent info',
      error: 'GET_ME_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/auth/validate-token
 * @desc Validate access token
 * @access Private
 */
router.get('/validate-token', authenticateToken, async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        valid: true,
        agent: (req as any).agent
      }
    });
    
  } catch (error: any) {
    logger.error('Validate token route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token validation',
      error: 'TOKEN_VALIDATION_ERROR'
    });
  }
});

export default router;