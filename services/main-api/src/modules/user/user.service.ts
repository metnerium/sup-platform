import { db } from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import { logger } from '../../common/utils/logger';
import {
  User,
  UserProfile,
  UpdateUserRequest,
  Contact,
  UserStatus,
} from '@sup/types';

export class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await db.oneOrNone(
        `SELECT
          id,
          username,
          email,
          phone,
          avatar_url,
          bio,
          status,
          last_seen,
          email_verified,
          phone_verified,
          two_factor_enabled,
          created_at,
          updated_at
         FROM users
         WHERE id = $1 AND deleted_at IS NULL`,
        [userId]
      );

      if (!user) {
        return null;
      }

      return this.mapUserFromDb(user);
    } catch (error) {
      logger.error('Error getting user by ID:', { userId, error });
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await db.oneOrNone(
        `SELECT
          id,
          username,
          email,
          phone,
          avatar_url,
          bio,
          status,
          last_seen,
          email_verified,
          phone_verified,
          two_factor_enabled,
          created_at,
          updated_at
         FROM users
         WHERE username = $1 AND deleted_at IS NULL`,
        [username]
      );

      if (!user) {
        return null;
      }

      return this.mapUserFromDb(user);
    } catch (error) {
      logger.error('Error getting user by username:', { username, error });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
    try {
      const { username, email, phone, bio, avatarUrl } = data;

      // Check if user exists
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        throw new AppError(404, 'User not found');
      }

      // Check if username is taken (if changing)
      if (username && username !== existingUser.username) {
        const usernameExists = await db.oneOrNone(
          'SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL',
          [username]
        );

        if (usernameExists) {
          throw new AppError(409, 'Username already taken');
        }
      }

      // Check if email is taken (if changing)
      if (email && email !== existingUser.email) {
        const emailExists = await db.oneOrNone(
          'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
          [email]
        );

        if (emailExists) {
          throw new AppError(409, 'Email already taken');
        }
      }

      // Check if phone is taken (if changing)
      if (phone && phone !== existingUser.phone) {
        const phoneExists = await db.oneOrNone(
          'SELECT id FROM users WHERE phone = $1 AND deleted_at IS NULL',
          [phone]
        );

        if (phoneExists) {
          throw new AppError(409, 'Phone number already taken');
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        values.push(username);
      }

      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
        // Reset email verification if email changes
        if (email !== existingUser.email) {
          updates.push(`email_verified = FALSE`);
        }
      }

      if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
        // Reset phone verification if phone changes
        if (phone !== existingUser.phone) {
          updates.push(`phone_verified = FALSE`);
        }
      }

      if (bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        values.push(bio);
      }

      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl);
      }

      if (updates.length === 0) {
        // No updates to make, return existing user
        return existingUser;
      }

      values.push(userId);

      const updatedUser = await db.one(
        `UPDATE users
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramIndex}
         RETURNING
          id,
          username,
          email,
          phone,
          avatar_url,
          bio,
          status,
          last_seen,
          email_verified,
          phone_verified,
          two_factor_enabled,
          created_at,
          updated_at`,
        values
      );

      logger.info('User profile updated', { userId });

      return this.mapUserFromDb(updatedUser);
    } catch (error) {
      logger.error('Error updating user:', { userId, error });
      throw error;
    }
  }

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    try {
      const user = await db.one(
        `UPDATE users
         SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND deleted_at IS NULL
         RETURNING
          id,
          username,
          email,
          phone,
          avatar_url,
          bio,
          status,
          last_seen,
          email_verified,
          phone_verified,
          two_factor_enabled,
          created_at,
          updated_at`,
        [avatarUrl, userId]
      );

      logger.info('User avatar updated', { userId });

      return this.mapUserFromDb(user);
    } catch (error) {
      logger.error('Error updating avatar:', { userId, error });
      if (error instanceof Error && error.message?.includes('No data returned')) {
        throw new AppError(404, 'User not found');
      }
      throw error;
    }
  }

  /**
   * Search users by username
   */
  async searchUsers(
    query: string,
    requesterId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ users: UserProfile[]; total: number }> {
    try {
      // Search only by username, exclude blocked users and users who blocked the requester
      const users = await db.any(
        `SELECT
          u.id,
          u.username,
          u.avatar_url,
          u.bio,
          u.status,
          u.last_seen
         FROM users u
         WHERE u.deleted_at IS NULL
         AND u.username ILIKE $1
         AND u.id != $2
         AND NOT EXISTS (
           SELECT 1 FROM blocked_users
           WHERE (user_id = $2 AND blocked_user_id = u.id)
           OR (user_id = u.id AND blocked_user_id = $2)
         )
         ORDER BY
           CASE WHEN u.username ILIKE $3 THEN 0 ELSE 1 END,
           u.username
         LIMIT $4 OFFSET $5`,
        [`%${query}%`, requesterId, `${query}%`, limit, offset]
      );

      // Get total count
      const { count } = await db.one(
        `SELECT COUNT(*) as count
         FROM users u
         WHERE u.deleted_at IS NULL
         AND u.username ILIKE $1
         AND u.id != $2
         AND NOT EXISTS (
           SELECT 1 FROM blocked_users
           WHERE (user_id = $2 AND blocked_user_id = u.id)
           OR (user_id = u.id AND blocked_user_id = $2)
         )`,
        [`%${query}%`, requesterId]
      );

      return {
        users: users.map(this.mapUserProfileFromDb),
        total: parseInt(count),
      };
    } catch (error) {
      logger.error('Error searching users:', { query, requesterId, error });
      throw error;
    }
  }

  /**
   * Update user status (online/offline/away)
   */
  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      await db.none(
        `UPDATE users
         SET status = $1, last_seen = CURRENT_TIMESTAMP
         WHERE id = $2 AND deleted_at IS NULL`,
        [status, userId]
      );

      logger.info('User status updated', { userId, status });
    } catch (error) {
      logger.error('Error updating status:', { userId, status, error });
      throw error;
    }
  }

  /**
   * Get user contacts
   */
  async getContacts(userId: string): Promise<Contact[]> {
    try {
      const contacts = await db.any(
        `SELECT
          c.user_id,
          c.contact_user_id,
          c.display_name,
          c.added_at,
          u.username,
          u.avatar_url,
          u.bio,
          u.status,
          u.last_seen
         FROM contacts c
         JOIN users u ON c.contact_user_id = u.id
         WHERE c.user_id = $1 AND u.deleted_at IS NULL
         ORDER BY c.added_at DESC`,
        [userId]
      );

      return contacts.map((c) => ({
        userId: c.user_id,
        contactUserId: c.contact_user_id,
        displayName: c.display_name,
        addedAt: c.added_at,
      }));
    } catch (error) {
      logger.error('Error getting contacts:', { userId, error });
      throw error;
    }
  }

  /**
   * Add contact
   */
  async addContact(
    userId: string,
    contactUserId: string,
    displayName?: string
  ): Promise<Contact> {
    try {
      // Validate users exist
      if (userId === contactUserId) {
        throw new AppError(400, 'Cannot add yourself as a contact');
      }

      const contactUser = await this.getUserById(contactUserId);
      if (!contactUser) {
        throw new AppError(404, 'Contact user not found');
      }

      // Check if blocked
      const isBlocked = await this.isBlocked(userId, contactUserId);
      if (isBlocked) {
        throw new AppError(403, 'Cannot add this user as a contact');
      }

      // Check if already a contact
      const existing = await db.oneOrNone(
        'SELECT * FROM contacts WHERE user_id = $1 AND contact_user_id = $2',
        [userId, contactUserId]
      );

      if (existing) {
        throw new AppError(409, 'User is already in your contacts');
      }

      // Add contact
      const contact = await db.one(
        `INSERT INTO contacts (user_id, contact_user_id, display_name)
         VALUES ($1, $2, $3)
         RETURNING user_id, contact_user_id, display_name, added_at`,
        [userId, contactUserId, displayName]
      );

      logger.info('Contact added', { userId, contactUserId });

      return {
        userId: contact.user_id,
        contactUserId: contact.contact_user_id,
        displayName: contact.display_name,
        addedAt: contact.added_at,
      };
    } catch (error) {
      logger.error('Error adding contact:', { userId, contactUserId, error });
      throw error;
    }
  }

  /**
   * Remove contact
   */
  async removeContact(userId: string, contactUserId: string): Promise<void> {
    try {
      const result = await db.result(
        'DELETE FROM contacts WHERE user_id = $1 AND contact_user_id = $2',
        [userId, contactUserId]
      );

      if (result.rowCount === 0) {
        throw new AppError(404, 'Contact not found');
      }

      logger.info('Contact removed', { userId, contactUserId });
    } catch (error) {
      logger.error('Error removing contact:', { userId, contactUserId, error });
      throw error;
    }
  }

  /**
   * Block user
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    try {
      if (userId === blockedUserId) {
        throw new AppError(400, 'Cannot block yourself');
      }

      const blockedUser = await this.getUserById(blockedUserId);
      if (!blockedUser) {
        throw new AppError(404, 'User not found');
      }

      // Check if already blocked
      const existing = await db.oneOrNone(
        'SELECT * FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
        [userId, blockedUserId]
      );

      if (existing) {
        throw new AppError(409, 'User is already blocked');
      }

      // Block user
      await db.none(
        `INSERT INTO blocked_users (user_id, blocked_user_id)
         VALUES ($1, $2)`,
        [userId, blockedUserId]
      );

      // Remove from contacts if present
      await db.none(
        'DELETE FROM contacts WHERE user_id = $1 AND contact_user_id = $2',
        [userId, blockedUserId]
      );

      logger.info('User blocked', { userId, blockedUserId });
    } catch (error) {
      logger.error('Error blocking user:', { userId, blockedUserId, error });
      throw error;
    }
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    try {
      const result = await db.result(
        'DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
        [userId, blockedUserId]
      );

      if (result.rowCount === 0) {
        throw new AppError(404, 'User is not blocked');
      }

      logger.info('User unblocked', { userId, blockedUserId });
    } catch (error) {
      logger.error('Error unblocking user:', { userId, blockedUserId, error });
      throw error;
    }
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: string): Promise<UserProfile[]> {
    try {
      const blockedUsers = await db.any(
        `SELECT
          u.id,
          u.username,
          u.avatar_url,
          u.bio,
          u.status,
          u.last_seen
         FROM blocked_users b
         JOIN users u ON b.blocked_user_id = u.id
         WHERE b.user_id = $1 AND u.deleted_at IS NULL
         ORDER BY b.blocked_at DESC`,
        [userId]
      );

      return blockedUsers.map(this.mapUserProfileFromDb);
    } catch (error) {
      logger.error('Error getting blocked users:', { userId, error });
      throw error;
    }
  }

  /**
   * Get user profile (public view with privacy checks)
   */
  async getUserProfile(
    userId: string,
    requesterId: string
  ): Promise<UserProfile | null> {
    try {
      // Check if blocked
      const isBlocked = await this.isBlocked(requesterId, userId);
      if (isBlocked) {
        throw new AppError(403, 'Cannot view this user profile');
      }

      const user = await db.oneOrNone(
        `SELECT
          id,
          username,
          avatar_url,
          bio,
          status,
          last_seen
         FROM users
         WHERE id = $1 AND deleted_at IS NULL`,
        [userId]
      );

      if (!user) {
        return null;
      }

      return this.mapUserProfileFromDb(user);
    } catch (error) {
      logger.error('Error getting user profile:', { userId, requesterId, error });
      throw error;
    }
  }

  /**
   * Check if user is blocked (either direction)
   */
  private async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const blocked = await db.oneOrNone(
      `SELECT 1 FROM blocked_users
       WHERE (user_id = $1 AND blocked_user_id = $2)
       OR (user_id = $2 AND blocked_user_id = $1)`,
      [userId, targetUserId]
    );

    return !!blocked;
  }

  /**
   * Map database user to User type
   */
  private mapUserFromDb(dbUser: any): User {
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      phone: dbUser.phone,
      avatarUrl: dbUser.avatar_url,
      bio: dbUser.bio,
      status: dbUser.status,
      lastSeen: dbUser.last_seen,
      emailVerified: dbUser.email_verified,
      phoneVerified: dbUser.phone_verified,
      twoFactorEnabled: dbUser.two_factor_enabled,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };
  }

  /**
   * Map database user to UserProfile type
   */
  private mapUserProfileFromDb(dbUser: any): UserProfile {
    return {
      id: dbUser.id,
      username: dbUser.username,
      avatarUrl: dbUser.avatar_url,
      bio: dbUser.bio,
      status: dbUser.status,
      lastSeen: dbUser.last_seen,
    };
  }
}

export const userService = new UserService();
