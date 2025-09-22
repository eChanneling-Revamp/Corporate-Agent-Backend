import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IAgent } from '../models/Agent';

export interface JWTPayload {
  agentId: string;
  email: string;
  status: string;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class AuthUtils {
  private static instance: AuthUtils;
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

  private constructor() {}

  public static getInstance(): AuthUtils {
    if (!AuthUtils.instance) {
      AuthUtils.instance = new AuthUtils();
    }
    return AuthUtils.instance;
  }

  /**
   * Hash password using bcrypt
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.BCRYPT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare password with hash
   */
  public async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Generate JWT access token
   */
  public generateAccessToken(payload: JWTPayload): string {
    try {
      return jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: this.JWT_EXPIRES_IN,
        issuer: 'corporate-agent-module',
        audience: 'echanneling-agents'
      });
    } catch (error) {
      throw new Error('Access token generation failed');
    }
  }

  /**
   * Generate JWT refresh token
   */
  public generateRefreshToken(payload: JWTPayload): string {
    try {
      return jwt.sign(payload, this.JWT_REFRESH_SECRET, {
        expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        issuer: 'corporate-agent-module',
        audience: 'echanneling-agents'
      });
    } catch (error) {
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  public generateTokenPair(agent: IAgent): TokenPair {
    const payload: JWTPayload = {
      agentId: agent.agentId,
      email: agent.email,
      status: agent.status,
      permissions: agent.permissions
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify JWT access token
   */
  public verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'corporate-agent-module',
        audience: 'echanneling-agents'
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw new Error('Access token verification failed');
    }
  }

  /**
   * Verify JWT refresh token
   */
  public verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_REFRESH_SECRET, {
        issuer: 'corporate-agent-module',
        audience: 'echanneling-agents'
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw new Error('Refresh token verification failed');
    }
  }

  /**
   * Generate password reset token
   */
  public generatePasswordResetToken(): { token: string; expires: Date } {
    const token = jwt.sign(
      { purpose: 'password-reset', timestamp: Date.now() },
      this.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);
    
    return { token, expires };
  }

  /**
   * Verify password reset token
   */
  public verifyPasswordResetToken(token: string): boolean {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      return decoded.purpose === 'password-reset';
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate email verification token
   */
  public generateEmailVerificationToken(email: string): { token: string; expires: Date } {
    const token = jwt.sign(
      { email, purpose: 'email-verification', timestamp: Date.now() },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    
    return { token, expires };
  }

  /**
   * Verify email verification token
   */
  public verifyEmailVerificationToken(token: string): { valid: boolean; email?: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      if (decoded.purpose === 'email-verification') {
        return { valid: true, email: decoded.email };
      }
      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Extract token from Authorization header
   */
  public extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate random string for various purposes
   */
  public generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const authUtils = AuthUtils.getInstance();