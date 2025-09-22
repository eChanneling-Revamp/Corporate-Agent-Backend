import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';
import { authenticateToken, requireVerified, canAccessResource } from '../middleware/auth';
import { apiRateLimit } from '../middleware/security';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting and authentication to all user routes
router.use(apiRateLimit);
router.use(authenticateToken);

/**
 * @route GET /api/v1/users/profile
 * @desc Get current agent profile
 * @access Private
 */
router.get('/profile', requireVerified, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const result = await userService.getAgentProfile(agentId);
    
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Get profile route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving profile',
      error: 'GET_PROFILE_ERROR'
    });
  }
});

/**
 * @route PUT /api/v1/users/profile
 * @desc Update agent profile
 * @access Private
 */
router.put('/profile', requireVerified, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const result = await userService.updateAgentProfile(agentId, req.body);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Update profile route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile',
      error: 'UPDATE_PROFILE_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/users/profile/:agentId
 * @desc Get specific agent profile (admin access)
 * @access Private (Admin)
 */
router.get('/profile/:agentId', requireVerified, canAccessResource('agent'), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const result = await userService.getAgentProfile(agentId);
    
    const statusCode = result.success ? 200 : 404;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Get agent profile route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving agent profile',
      error: 'GET_AGENT_PROFILE_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/users/list
 * @desc Get list of agents with filtering and pagination
 * @access Private
 */
router.get('/list', requireVerified, async (req: Request, res: Response) => {
  try {
    const result = await userService.getAgentsList(req.query as any);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Get agents list route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving agents list',
      error: 'GET_AGENTS_LIST_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/users/statistics
 * @desc Get agent statistics
 * @access Private
 */
router.get('/statistics', requireVerified, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const result = await userService.getAgentStatistics(agentId);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Get agent statistics route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving statistics',
      error: 'GET_STATISTICS_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/users/activities
 * @desc Get recent agent activities
 * @access Private
 */
router.get('/activities', requireVerified, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await userService.getRecentAgentActivities(agentId, limit);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Get agent activities route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving activities',
      error: 'GET_ACTIVITIES_ERROR'
    });
  }
});

/**
 * @route PUT /api/v1/users/status/:agentId
 * @desc Update agent status (admin only)
 * @access Private (Admin)
 */
router.put('/status/:agentId', requireVerified, canAccessResource('agent'), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { status, reason } = req.body;
    
    if (!status || !['pending', 'active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, active, suspended, or inactive',
        error: 'INVALID_STATUS'
      });
    }
    
    const result = await userService.updateAgentStatus(agentId, status, reason);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Update agent status route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating agent status',
      error: 'UPDATE_STATUS_ERROR'
    });
  }
});

/**
 * @route PUT /api/v1/users/permissions/:agentId
 * @desc Update agent permissions (admin only)
 * @access Private (Admin)
 */
router.put('/permissions/:agentId', requireVerified, canAccessResource('agent'), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions must be an array',
        error: 'INVALID_PERMISSIONS_FORMAT'
      });
    }
    
    const result = await userService.updateAgentPermissions(agentId, permissions);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Update agent permissions route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating permissions',
      error: 'UPDATE_PERMISSIONS_ERROR'
    });
  }
});

/**
 * @route DELETE /api/v1/users/:agentId
 * @desc Delete agent account (soft delete)
 * @access Private (Admin)
 */
router.delete('/:agentId', requireVerified, canAccessResource('agent'), async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const result = await userService.deleteAgent(agentId);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Delete agent route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting agent',
      error: 'DELETE_AGENT_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/users/search
 * @desc Search agents by various criteria
 * @access Private
 */
router.get('/search', requireVerified, async (req: Request, res: Response) => {
  try {
    const searchQuery = {
      ...req.query,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };
    
    const result = await userService.getAgentsList(searchQuery as any);
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error: any) {
    logger.error('Search agents route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while searching agents',
      error: 'SEARCH_AGENTS_ERROR'
    });
  }
});

/**
 * @route GET /api/v1/users/dashboard
 * @desc Get agent dashboard data
 * @access Private
 */
router.get('/dashboard', requireVerified, async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent.agentId;
    
    // Get profile and statistics
    const [profileResult, statsResult, activitiesResult] = await Promise.all([
      userService.getAgentProfile(agentId),
      userService.getAgentStatistics(agentId),
      userService.getRecentAgentActivities(agentId, 5)
    ]);
    
    res.status(200).json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        profile: profileResult.data,
        statistics: statsResult.data,
        recentActivities: activitiesResult.data
      }
    });
    
  } catch (error: any) {
    logger.error('Get dashboard route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving dashboard data',
      error: 'GET_DASHBOARD_ERROR'
    });
  }
});

export default router;