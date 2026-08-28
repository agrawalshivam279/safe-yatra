/**
 * Safe Yatra — Backend Spatial Server
 * User Profile Management Service.
 */

import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { UserPublicProfile } from '../auth/auth.types';
import { UpdateProfileInput } from '../volunteer/volunteer.types';

export class UserService {
  /**
   * Retrieves a user profile by ID.
   */
  public async getUserById(userId: string): Promise<UserPublicProfile> {
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
   * Updates a user's editable profile fields.
   */
  public async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<UserPublicProfile> {
    // If phone is being updated, verify uniqueness
    if (input.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: input.phone },
      });
      if (existingPhone && existingPhone.id !== userId) {
        throw new AppError(
          'An account with this phone number already exists',
          409,
          'PHONE_EXISTS'
        );
      }
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.profileImageUrl !== undefined
            ? { profileImageUrl: input.profileImageUrl }
            : {}),
        },
        include: {
          volunteerProfile: true,
        },
      });

      return this.toPublicProfile(updatedUser);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Failed to update profile', 400, 'UPDATE_FAILED');
    }
  }

  /**
   * Deactivates a user account.
   */
  public async deleteAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  /**
   * Strips sensitive properties from user object.
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

export const userService = new UserService();
export default userService;
