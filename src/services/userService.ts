import { Agent, IAgent } from '../models/Agent';
import { logger } from '../utils/logger';

export interface AgentUpdateData {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  paymentDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    branchCode?: string;
  };
  profileImage?: string;
}

export interface AgentSearchQuery {
  status?: 'pending' | 'active' | 'suspended' | 'inactive';
  isVerified?: boolean;
  city?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'companyName' | 'lastLogin';
  sortOrder?: 'asc' | 'desc';
}

export interface AgentListResponse {
  success: boolean;
  message: string;
  data?: {
    agents: Partial<IAgent>[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
}

class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get agent profile by agentId
   */
  public async getAgentProfile(agentId: string): Promise<{ success: boolean; message: string; data?: Partial<IAgent>; error?: string }> {
    try {
      const agent = await Agent.findOne({ agentId }).select('-password -refreshToken -passwordResetToken -emailVerificationToken');

      if (!agent) {
        return {
          success: false,
          message: 'Agent not found',
          error: 'AGENT_NOT_FOUND'
        };
      }

      return {
        success: true,
        message: 'Agent profile retrieved successfully',
        data: agent.toJSON()
      };

    } catch (error: any) {
      logger.error('Get agent profile error:', error);
      return {
        success: false,
        message: 'Failed to retrieve agent profile',
        error: 'PROFILE_RETRIEVAL_FAILED'
      };
    }
  }

  /**
   * Update agent profile
   */
  public async updateAgentProfile(agentId: string, updateData: AgentUpdateData): Promise<{ success: boolean; message: string; data?: Partial<IAgent>; error?: string }> {
    try {
      const agent = await Agent.findOne({ agentId });

      if (!agent) {
        return {
          success: false,
          message: 'Agent not found',
          error: 'AGENT_NOT_FOUND'
        };
      }

      // Update fields
      if (updateData.companyName) agent.companyName = updateData.companyName;
      if (updateData.contactPerson) agent.contactPerson = updateData.contactPerson;
      if (updateData.phone) agent.phone = updateData.phone;
      if (updateData.profileImage) agent.profileImage = updateData.profileImage;

      // Update address
      if (updateData.address) {
        agent.address = { ...agent.address, ...updateData.address };
      }

      // Update payment details
      if (updateData.paymentDetails) {
        agent.paymentDetails = { ...agent.paymentDetails, ...updateData.paymentDetails };
      }

      const updatedAgent = await agent.save();

      logger.info(`Agent profile updated: ${agentId}`);

      return {
        success: true,
        message: 'Agent profile updated successfully',
        data: updatedAgent.toJSON()
      };

    } catch (error: any) {
      logger.error('Update agent profile error:', error);
      return {
        success: false,
        message: 'Failed to update agent profile',
        error: 'PROFILE_UPDATE_FAILED'
      };
    }
  }

  /**
   * Get list of agents with search and filtering
   */
  public async getAgentsList(query: AgentSearchQuery): Promise<AgentListResponse> {
    try {
      const {
        status,
        isVerified,
        city,
        page = 1,
        limit = 20,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      // Build filter object
      const filter: any = {};

      if (status) filter.status = status;
      if (typeof isVerified === 'boolean') filter.isVerified = isVerified;
      if (city) filter['address.city'] = new RegExp(city, 'i');

      // Add search functionality
      if (search) {
        filter.$or = [
          { companyName: new RegExp(search, 'i') },
          { contactPerson: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { agentId: new RegExp(search, 'i') }
        ];
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query
      const [agents, total] = await Promise.all([
        Agent.find(filter)
          .select('-password -refreshToken -passwordResetToken -emailVerificationToken -documents')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Agent.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'Agents retrieved successfully',
        data: {
          agents,
          pagination: {
            page,
            limit,
            total,
            pages: totalPages
          }
        }
      };

    } catch (error: any) {
      logger.error('Get agents list error:', error);
      return {
        success: false,
        message: 'Failed to retrieve agents list',
        error: 'AGENTS_LIST_FAILED'
      };
    }
  }

  /**
   * Get agent statistics
   */
  public async getAgentStatistics(agentId?: string): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
    try {
      let matchFilter: any = {};
      
      if (agentId) {
        matchFilter.agentId = agentId;
      }

      const stats = await Agent.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalAgents: { $sum: 1 },
            activeAgents: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            pendingAgents: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            suspendedAgents: {
              $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
            },
            verifiedAgents: {
              $sum: { $cond: ['$isVerified', 1, 0] }
            },
            avgCommissionPercentage: { $avg: '$commission.percentage' }
          }
        }
      ]);

      const result = stats.length > 0 ? stats[0] : {
        totalAgents: 0,
        activeAgents: 0,
        pendingAgents: 0,
        suspendedAgents: 0,
        verifiedAgents: 0,
        avgCommissionPercentage: 0
      };

      // Remove the _id field
      delete result._id;

      return {
        success: true,
        message: 'Agent statistics retrieved successfully',
        data: result
      };

    } catch (error: any) {
      logger.error('Get agent statistics error:', error);
      return {
        success: false,
        message: 'Failed to retrieve agent statistics',
        error: 'STATISTICS_FAILED'
      };
    }
  }

  /**
   * Update agent status (admin function)
   */
  public async updateAgentStatus(agentId: string, status: 'pending' | 'active' | 'suspended' | 'inactive', reason?: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const agent = await Agent.findOne({ agentId });

      if (!agent) {
        return {
          success: false,
          message: 'Agent not found',
          error: 'AGENT_NOT_FOUND'
        };
      }

      const oldStatus = agent.status;
      agent.status = status;

      // If suspending, clear refresh token to force logout
      if (status === 'suspended') {
        agent.refreshToken = undefined;
      }

      await agent.save();

      logger.info(`Agent status updated: ${agentId} from ${oldStatus} to ${status}${reason ? ` - Reason: ${reason}` : ''}`);

      return {
        success: true,
        message: `Agent status updated to ${status}`
      };

    } catch (error: any) {
      logger.error('Update agent status error:', error);
      return {
        success: false,
        message: 'Failed to update agent status',
        error: 'STATUS_UPDATE_FAILED'
      };
    }
  }

  /**
   * Delete agent account (soft delete)
   */
  public async deleteAgent(agentId: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const agent = await Agent.findOne({ agentId });

      if (!agent) {
        return {
          success: false,
          message: 'Agent not found',
          error: 'AGENT_NOT_FOUND'
        };
      }

      // Soft delete by updating status
      agent.status = 'inactive';
      agent.refreshToken = undefined;
      await agent.save();

      logger.info(`Agent account deleted (soft): ${agentId}`);

      return {
        success: true,
        message: 'Agent account deleted successfully'
      };

    } catch (error: any) {
      logger.error('Delete agent error:', error);
      return {
        success: false,
        message: 'Failed to delete agent account',
        error: 'DELETE_FAILED'
      };
    }
  }

  /**
   * Get recent agent activities
   */
  public async getRecentAgentActivities(agentId: string, limit: number = 10): Promise<{ success: boolean; message: string; data?: any[]; error?: string }> {
    try {
      const agent = await Agent.findOne({ agentId });

      if (!agent) {
        return {
          success: false,
          message: 'Agent not found',
          error: 'AGENT_NOT_FOUND'
        };
      }

      // Get recent activities from various collections
      const activities = [
        {
          type: 'registration',
          date: agent.createdAt,
          description: 'Agent account created'
        },
        {
          type: 'last_login',
          date: agent.lastLogin,
          description: 'Last login'
        }
      ];

      // Sort by date and limit
      const sortedActivities = activities
        .filter(activity => activity.date)
        .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
        .slice(0, limit);

      return {
        success: true,
        message: 'Recent activities retrieved successfully',
        data: sortedActivities
      };

    } catch (error: any) {
      logger.error('Get recent activities error:', error);
      return {
        success: false,
        message: 'Failed to retrieve recent activities',
        error: 'ACTIVITIES_FAILED'
      };
    }
  }

  /**
   * Update agent permissions
   */
  public async updateAgentPermissions(agentId: string, permissions: string[]): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const agent = await Agent.findOne({ agentId });

      if (!agent) {
        return {
          success: false,
          message: 'Agent not found',
          error: 'AGENT_NOT_FOUND'
        };
      }

      const validPermissions = [
        'basic_access',
        'book_appointments',
        'view_reports',
        'bulk_operations',
        'admin_access',
        'manage_agents',
        'financial_reports'
      ];

      // Validate permissions
      const invalidPermissions = permissions.filter(perm => !validPermissions.includes(perm));
      
      if (invalidPermissions.length > 0) {
        return {
          success: false,
          message: `Invalid permissions: ${invalidPermissions.join(', ')}`,
          error: 'INVALID_PERMISSIONS'
        };
      }

      agent.permissions = permissions;
      await agent.save();

      logger.info(`Agent permissions updated: ${agentId} - ${permissions.join(', ')}`);

      return {
        success: true,
        message: 'Agent permissions updated successfully'
      };

    } catch (error: any) {
      logger.error('Update permissions error:', error);
      return {
        success: false,
        message: 'Failed to update agent permissions',
        error: 'PERMISSIONS_UPDATE_FAILED'
      };
    }
  }
}

export const userService = UserService.getInstance();