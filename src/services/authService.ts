import { Agent, IAgent } from '../models/Agent';
import { authUtils } from '../utils/auth';
import { logger } from '../utils/logger';

export interface AgentRegistrationData {
  companyName: string;
  contactPerson: string;
  email: string;
  password: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  businessRegistrationNumber: string;
  taxId: string;
  paymentDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
  };
  documents: {
    businessLicense: string;
    taxCertificate: string;
    bankStatement: string;
  };
  commission?: {
    percentage: number;
    minimumAmount: number;
  };
}

export interface AgentLoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    agent: Partial<IAgent>;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  error?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new agent
   */
  public async register(registrationData: AgentRegistrationData): Promise<AuthResponse> {
    try {
      // Check if agent already exists
      const existingAgent = await Agent.findOne({
        $or: [
          { email: registrationData.email },
          { businessRegistrationNumber: registrationData.businessRegistrationNumber },
          { taxId: registrationData.taxId }
        ]
      });

      if (existingAgent) {
        return {
          success: false,
          message: 'Agent already exists with this email, business registration number, or tax ID',
          error: 'AGENT_EXISTS'
        };
      }

      // Hash password
      const hashedPassword = await authUtils.hashPassword(registrationData.password);

      // Generate email verification token
      const { token: emailToken, expires: emailExpires } = authUtils.generateEmailVerificationToken(registrationData.email);

      // Create new agent
      const newAgent = new Agent({
        ...registrationData,
        password: hashedPassword,
        address: {
          ...registrationData.address,
          country: registrationData.address.country || 'Sri Lanka'
        },
        commission: registrationData.commission || {
          percentage: 5,
          minimumAmount: 0
        },
        status: 'pending',
        isVerified: false,
        emailVerificationToken: emailToken,
        emailVerificationExpires: emailExpires,
        permissions: ['basic_access', 'book_appointments', 'view_reports']
      });

      const savedAgent = await newAgent.save();

      logger.info(`New agent registered: ${savedAgent.agentId} - ${savedAgent.email}`);

      // Generate tokens
      const tokens = authUtils.generateTokenPair(savedAgent);

      // Save refresh token
      savedAgent.refreshToken = tokens.refreshToken;
      await savedAgent.save();

      return {
        success: true,
        message: 'Agent registration successful. Please verify your email.',
        data: {
          agent: savedAgent.toJSON(),
          tokens
        }
      };

    } catch (error: any) {
      logger.error('Agent registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.',
        error: 'REGISTRATION_FAILED'
      };
    }
  }

  /**
   * Login agent
   */
  public async login(loginData: AgentLoginData): Promise<AuthResponse> {
    try {
      // Find agent by email
      const agent = await Agent.findOne({ email: loginData.email });

      if (!agent) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS'
        };
      }

      // Check password
      const isPasswordValid = await authUtils.comparePassword(loginData.password, agent.password);

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS'
        };
      }

      // Check if agent is suspended
      if (agent.status === 'suspended') {
        return {
          success: false,
          message: 'Your account has been suspended. Please contact support.',
          error: 'ACCOUNT_SUSPENDED'
        };
      }

      // Generate new tokens
      const tokens = authUtils.generateTokenPair(agent);

      // Update last login and refresh token
      agent.lastLogin = new Date();
      agent.refreshToken = tokens.refreshToken;
      await agent.save();

      logger.info(`Agent logged in: ${agent.agentId} - ${agent.email}`);

      return {
        success: true,
        message: 'Login successful',
        data: {
          agent: agent.toJSON(),
          tokens
        }
      };

    } catch (error: any) {
      logger.error('Agent login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.',
        error: 'LOGIN_FAILED'
      };
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = authUtils.verifyRefreshToken(refreshToken);

      // Find agent with this refresh token
      const agent = await Agent.findOne({
        agentId: decoded.agentId,
        refreshToken: refreshToken
      });

      if (!agent) {
        return {
          success: false,
          message: 'Invalid refresh token',
          error: 'INVALID_REFRESH_TOKEN'
        };
      }

      // Generate new tokens
      const newTokens = authUtils.generateTokenPair(agent);

      // Update refresh token
      agent.refreshToken = newTokens.refreshToken;
      await agent.save();

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          agent: agent.toJSON(),
          tokens: newTokens
        }
      };

    } catch (error: any) {
      logger.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Token refresh failed',
        error: 'TOKEN_REFRESH_FAILED'
      };
    }
  }

  /**
   * Logout agent
   */
  public async logout(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const agent = await Agent.findOne({ agentId });

      if (agent) {
        agent.refreshToken = undefined;
        await agent.save();
        logger.info(`Agent logged out: ${agentId}`);
      }

      return {
        success: true,
        message: 'Logout successful'
      };

    } catch (error: any) {
      logger.error('Agent logout error:', error);
      return {
        success: false,
        message: 'Logout failed'
      };
    }
  }

  /**
   * Change password
   */
  public async changePassword(agentId: string, passwordData: PasswordChangeData): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const agent = await Agent.findOne({ agentId });

      if (!agent) {
        return {
          success: false,
          message: 'Agent not found',
          error: 'AGENT_NOT_FOUND'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await authUtils.comparePassword(passwordData.currentPassword, agent.password);

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          message: 'Current password is incorrect',
          error: 'INVALID_CURRENT_PASSWORD'
        };
      }

      // Hash new password
      const hashedNewPassword = await authUtils.hashPassword(passwordData.newPassword);

      // Update password and clear refresh token
      agent.password = hashedNewPassword;
      agent.refreshToken = undefined;
      await agent.save();

      logger.info(`Password changed for agent: ${agentId}`);

      return {
        success: true,
        message: 'Password changed successfully. Please login again.'
      };

    } catch (error: any) {
      logger.error('Password change error:', error);
      return {
        success: false,
        message: 'Password change failed',
        error: 'PASSWORD_CHANGE_FAILED'
      };
    }
  }

  /**
   * Request password reset
   */
  public async requestPasswordReset(email: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const agent = await Agent.findOne({ email });

      if (!agent) {
        // Return success even if agent not found for security
        return {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        };
      }

      // Generate password reset token
      const { token, expires } = authUtils.generatePasswordResetToken();

      // Save reset token
      agent.passwordResetToken = token;
      agent.passwordResetExpires = expires;
      await agent.save();

      logger.info(`Password reset requested for agent: ${agent.agentId}`);

      // TODO: Send email with reset link
      // await emailService.sendPasswordResetEmail(agent.email, token);

      return {
        success: true,
        message: 'Password reset link has been sent to your email.'
      };

    } catch (error: any) {
      logger.error('Password reset request error:', error);
      return {
        success: false,
        message: 'Password reset request failed',
        error: 'PASSWORD_RESET_REQUEST_FAILED'
      };
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Find agent with valid reset token
      const agent = await Agent.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!agent) {
        return {
          success: false,
          message: 'Invalid or expired reset token',
          error: 'INVALID_RESET_TOKEN'
        };
      }

      // Verify token
      const isTokenValid = authUtils.verifyPasswordResetToken(token);

      if (!isTokenValid) {
        return {
          success: false,
          message: 'Invalid reset token',
          error: 'INVALID_RESET_TOKEN'
        };
      }

      // Hash new password
      const hashedPassword = await authUtils.hashPassword(newPassword);

      // Update password and clear reset token
      agent.password = hashedPassword;
      agent.passwordResetToken = undefined;
      agent.passwordResetExpires = undefined;
      agent.refreshToken = undefined; // Force re-login
      await agent.save();

      logger.info(`Password reset completed for agent: ${agent.agentId}`);

      return {
        success: true,
        message: 'Password reset successful. Please login with your new password.'
      };

    } catch (error: any) {
      logger.error('Password reset error:', error);
      return {
        success: false,
        message: 'Password reset failed',
        error: 'PASSWORD_RESET_FAILED'
      };
    }
  }

  /**
   * Verify email
   */
  public async verifyEmail(token: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Verify token
      const { valid, email } = authUtils.verifyEmailVerificationToken(token);

      if (!valid || !email) {
        return {
          success: false,
          message: 'Invalid verification token',
          error: 'INVALID_VERIFICATION_TOKEN'
        };
      }

      // Find agent with this token
      const agent = await Agent.findOne({
        email,
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      });

      if (!agent) {
        return {
          success: false,
          message: 'Invalid or expired verification token',
          error: 'INVALID_VERIFICATION_TOKEN'
        };
      }

      // Mark as verified
      agent.isVerified = true;
      agent.status = 'active'; // Activate upon email verification
      agent.emailVerificationToken = undefined;
      agent.emailVerificationExpires = undefined;
      await agent.save();

      logger.info(`Email verified for agent: ${agent.agentId}`);

      return {
        success: true,
        message: 'Email verified successfully. Your account is now active.'
      };

    } catch (error: any) {
      logger.error('Email verification error:', error);
      return {
        success: false,
        message: 'Email verification failed',
        error: 'EMAIL_VERIFICATION_FAILED'
      };
    }
  }
}

export const authService = AuthService.getInstance();