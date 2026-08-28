/**
 * Safe Yatra — Backend Spatial Server
 * Authentication Service (Password hashing, JWT issuance & User lifecycle).
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/response';
import {
  AuthResponseData,
  AuthTokens,
  JwtPayload,
  UserPublicProfile,
} from './auth.types';
import { RegisterInput, LoginInput } from './auth.validation';

const BCRYPT_SALT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export class AuthService {
  /**
   * Hashes a plain-text password using bcrypt.
   */
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Compares a plain-text password with a bcrypt hash.
   */
  public async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates symmetric access and refresh JWT token pairs.
   */
  public generateTokens(user: {
    id: string;
    email: string;
    role: UserRole;
  }): AuthTokens {
    const accessPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(refreshPayload, env.JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }

  /**
   * Verifies a JWT token and validates its expected claim type.
   */
  public verifyToken(
    token: string,
    expectedType: 'access' | 'refresh' = 'access'
  ): JwtPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      if (!decoded || typeof decoded !== 'object') {
        throw new AppError('Invalid token format', 401, 'INVALID_TOKEN');
      }

      if (decoded.type !== expectedType) {
        throw new AppError(
          `Invalid token type. Expected ${expectedType} token.`,
          401,
          'INVALID_TOKEN_TYPE'
        );
      }

      return decoded;
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid or corrupted token', 401, 'INVALID_TOKEN');
    }
  }

  /**
   * Registers a new user with optional role profile provisioning.
   */
  public async register(input: RegisterInput): Promise<AuthResponseData> {
    // 1. Check for duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw new AppError(
        'An account with this email address already exists',
        409,
        'EMAIL_EXISTS'
      );
    }

    // 2. Check for duplicate phone
    const existingPhone = await prisma.user.findUnique({
      where: { phone: input.phone },
    });
    if (existingPhone) {
      throw new AppError(
        'An account with this phone number already exists',
        409,
        'PHONE_EXISTS'
      );
    }

    // 3. Hash password
    const passwordHash = await this.hashPassword(input.password);

    // 4. Create user record (and volunteer profile if YAATRI_MITRA)
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: input.role as UserRole,
        profileImageUrl: input.profileImageUrl,
        isActive: true,
        ...(input.role === 'YAATRI_MITRA'
          ? {
              volunteerProfile: {
                create: {
                  verificationStatus: 'PENDING',
                  isOnDuty: false,
                },
              },
            }
          : {}),
      },
      include: {
        volunteerProfile: true,
      },
    });

    const tokens = this.generateTokens(user);
    return {
      user: this.toPublicProfile(user),
      tokens,
    };
  }

  /**
   * Authenticates user credentials and issues tokens.
   */
  public async login(input: LoginInput): Promise<AuthResponseData> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        volunteerProfile: true,
      },
    });

    if (!user) {
      throw new AppError(
        'Invalid email or password',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const isPasswordValid = await this.comparePassword(
      input.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError(
        'Invalid email or password',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    if (!user.isActive) {
      throw new AppError(
        'Account is inactive or suspended. Please contact support.',
        403,
        'ACCOUNT_INACTIVE'
      );
    }

    const tokens = this.generateTokens(user);
    return {
      user: this.toPublicProfile(user),
      tokens,
    };
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   */
  public async refreshToken(
    refreshTokenStr: string
  ): Promise<{ accessToken: string; expiresIn: string }> {
    const decoded = this.verifyToken(refreshTokenStr, 'refresh');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive or suspended', 403, 'ACCOUNT_INACTIVE');
    }

    const accessPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return {
      accessToken,
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }

  /**
   * Fetches the sanitized public profile for a user.
   */
  public async getUserProfile(userId: string): Promise<UserPublicProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        volunteerProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return this.toPublicProfile(user);
  }

  /**
   * Strips passwordHash and returns public profile shape.
   */
  private toPublicProfile(user: any): UserPublicProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      profileImageUrl: user.profileImageUrl ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      volunteerProfile: user.volunteerProfile ?? null,
    };
  }
}

export const authService = new AuthService();
export default authService;
