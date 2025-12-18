import { db } from '../../config/database';
import { redisClient } from '../../config/redis';
import { AppError } from '../../common/middleware/error.middleware';
import { logger } from '../../common/utils/logger';

interface SearchUser {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  status: string;
}

interface SearchChat {
  id: string;
  type: string;
  name?: string;
  description?: string;
  avatarUrl?: string;
  lastMessageAt?: Date;
  membersCount?: number;
}

interface SearchMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderUsername: string;
  type: string;
  createdAt: Date;
  chatName?: string;
  snippet?: string;
}

interface GlobalSearchResult {
  users: SearchUser[];
  chats: SearchChat[];
  messages: SearchMessage[];
  total: number;
}

export class SearchService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'search:';

  /**
   * Search users by username
   * Full-text search with PostgreSQL tsvector
   */
  async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<{ users: SearchUser[]; total: number }> {
    try {
      // Validate query length
      if (query.length < 2) {
        throw new AppError(400, 'Search query must be at least 2 characters');
      }

      // Check cache
      const cacheKey = `${this.CACHE_PREFIX}users:${query}:${limit}:${offset}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug('Search users cache hit', { query, limit, offset });
        return JSON.parse(cached);
      }

      // Search users using full-text search
      const users = await db.manyOrNone(
        `SELECT
          id,
          username,
          email,
          avatar_url,
          bio,
          status,
          ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
        FROM users
        WHERE
          deleted_at IS NULL AND
          search_vector @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC, username ASC
        LIMIT $2 OFFSET $3`,
        [query, limit, offset]
      );

      // Get total count
      const countResult = await db.one(
        `SELECT COUNT(*) as total
        FROM users
        WHERE
          deleted_at IS NULL AND
          search_vector @@ plainto_tsquery('english', $1)`,
        [query]
      );

      const result = {
        users: users.map((user) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          status: user.status,
        })),
        total: parseInt(countResult.total),
      };

      // Cache result
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));

      logger.info('Users searched', { query, resultsCount: result.users.length, total: result.total });

      return result;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Search chats for a specific user
   * Searches in chat names and descriptions
   */
  async searchChats(userId: string, query: string, limit: number = 20): Promise<{ chats: SearchChat[]; total: number }> {
    try {
      // Validate query length
      if (query.length < 2) {
        throw new AppError(400, 'Search query must be at least 2 characters');
      }

      // Check cache
      const cacheKey = `${this.CACHE_PREFIX}chats:${userId}:${query}:${limit}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug('Search chats cache hit', { userId, query, limit });
        return JSON.parse(cached);
      }

      // Search chats where user is a member
      const chats = await db.manyOrNone(
        `SELECT
          c.id,
          c.type,
          c.name,
          c.description,
          c.avatar_url,
          MAX(m.created_at) as last_message_at,
          COUNT(DISTINCT cm2.user_id) as members_count,
          ts_rank(c.search_vector, plainto_tsquery('english', $2)) as rank
        FROM chats c
        INNER JOIN chat_members cm ON c.id = cm.chat_id
        LEFT JOIN messages m ON c.id = m.chat_id AND m.deleted_at IS NULL
        LEFT JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.left_at IS NULL
        WHERE
          cm.user_id = $1 AND
          cm.left_at IS NULL AND
          c.deleted_at IS NULL AND
          c.search_vector @@ plainto_tsquery('english', $2)
        GROUP BY c.id
        ORDER BY rank DESC, last_message_at DESC NULLS LAST
        LIMIT $3`,
        [userId, query, limit]
      );

      // Get total count
      const countResult = await db.one(
        `SELECT COUNT(DISTINCT c.id) as total
        FROM chats c
        INNER JOIN chat_members cm ON c.id = cm.chat_id
        WHERE
          cm.user_id = $1 AND
          cm.left_at IS NULL AND
          c.deleted_at IS NULL AND
          c.search_vector @@ plainto_tsquery('english', $2)`,
        [userId, query]
      );

      const result = {
        chats: chats.map((chat) => ({
          id: chat.id,
          type: chat.type,
          name: chat.name,
          description: chat.description,
          avatarUrl: chat.avatar_url,
          lastMessageAt: chat.last_message_at,
          membersCount: parseInt(chat.members_count),
        })),
        total: parseInt(countResult.total),
      };

      // Cache result
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));

      logger.info('Chats searched', { userId, query, resultsCount: result.chats.length, total: result.total });

      return result;
    } catch (error) {
      logger.error('Error searching chats:', error);
      throw error;
    }
  }

  /**
   * Search messages for a specific user
   * IMPORTANT: Only searches in unencrypted metadata, not encrypted_content
   * Searches in sender username and chat name
   */
  async searchMessages(
    userId: string,
    query: string,
    chatId?: string,
    limit: number = 50
  ): Promise<{ messages: SearchMessage[]; total: number }> {
    try {
      // Validate query length
      if (query.length < 2) {
        throw new AppError(400, 'Search query must be at least 2 characters');
      }

      // Check cache
      const cacheKey = `${this.CACHE_PREFIX}messages:${userId}:${query}:${chatId || 'all'}:${limit}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug('Search messages cache hit', { userId, query, chatId, limit });
        return JSON.parse(cached);
      }

      // Build query based on chatId
      let searchQuery: string;
      let params: any[];

      if (chatId) {
        // Search in specific chat
        searchQuery = `
          SELECT
            m.id,
            m.chat_id,
            m.sender_id,
            m.type,
            m.created_at,
            u.username as sender_username,
            c.name as chat_name
          FROM messages m
          INNER JOIN users u ON m.sender_id = u.id
          INNER JOIN chats c ON m.chat_id = c.id
          INNER JOIN chat_members cm ON c.id = cm.chat_id
          WHERE
            cm.user_id = $1 AND
            cm.left_at IS NULL AND
            m.chat_id = $2 AND
            m.deleted_at IS NULL AND
            (
              u.username ILIKE $3 OR
              c.name ILIKE $3
            )
          ORDER BY m.created_at DESC
          LIMIT $4
        `;
        params = [userId, chatId, `%${query}%`, limit];
      } else {
        // Search across all user's chats
        searchQuery = `
          SELECT
            m.id,
            m.chat_id,
            m.sender_id,
            m.type,
            m.created_at,
            u.username as sender_username,
            c.name as chat_name
          FROM messages m
          INNER JOIN users u ON m.sender_id = u.id
          INNER JOIN chats c ON m.chat_id = c.id
          INNER JOIN chat_members cm ON c.id = cm.chat_id
          WHERE
            cm.user_id = $1 AND
            cm.left_at IS NULL AND
            m.deleted_at IS NULL AND
            (
              u.username ILIKE $2 OR
              c.name ILIKE $2
            )
          ORDER BY m.created_at DESC
          LIMIT $3
        `;
        params = [userId, `%${query}%`, limit];
      }

      const messages = await db.manyOrNone(searchQuery, params);

      // Get total count
      let countQuery: string;
      let countParams: any[];

      if (chatId) {
        countQuery = `
          SELECT COUNT(*) as total
          FROM messages m
          INNER JOIN users u ON m.sender_id = u.id
          INNER JOIN chats c ON m.chat_id = c.id
          INNER JOIN chat_members cm ON c.id = cm.chat_id
          WHERE
            cm.user_id = $1 AND
            cm.left_at IS NULL AND
            m.chat_id = $2 AND
            m.deleted_at IS NULL AND
            (
              u.username ILIKE $3 OR
              c.name ILIKE $3
            )
        `;
        countParams = [userId, chatId, `%${query}%`];
      } else {
        countQuery = `
          SELECT COUNT(*) as total
          FROM messages m
          INNER JOIN users u ON m.sender_id = u.id
          INNER JOIN chats c ON m.chat_id = c.id
          INNER JOIN chat_members cm ON c.id = cm.chat_id
          WHERE
            cm.user_id = $1 AND
            cm.left_at IS NULL AND
            m.deleted_at IS NULL AND
            (
              u.username ILIKE $2 OR
              c.name ILIKE $2
            )
        `;
        countParams = [userId, `%${query}%`];
      }

      const countResult = await db.one(countQuery, countParams);

      const result = {
        messages: messages.map((msg) => ({
          id: msg.id,
          chatId: msg.chat_id,
          senderId: msg.sender_id,
          senderUsername: msg.sender_username,
          type: msg.type,
          createdAt: msg.created_at,
          chatName: msg.chat_name,
        })),
        total: parseInt(countResult.total),
      };

      // Cache result
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));

      logger.info('Messages searched', {
        userId,
        query,
        chatId,
        resultsCount: result.messages.length,
        total: result.total
      });

      return result;
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Global search - combined search across users, chats, and messages
   * Optional type filter: 'users', 'chats', 'messages', or undefined for all
   */
  async globalSearch(
    userId: string,
    query: string,
    type?: 'users' | 'chats' | 'messages',
    limit: number = 10
  ): Promise<GlobalSearchResult> {
    try {
      // Validate query length
      if (query.length < 2) {
        throw new AppError(400, 'Search query must be at least 2 characters');
      }

      // Check cache
      const cacheKey = `${this.CACHE_PREFIX}global:${userId}:${query}:${type || 'all'}:${limit}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.debug('Global search cache hit', { userId, query, type, limit });
        return JSON.parse(cached);
      }

      const result: GlobalSearchResult = {
        users: [],
        chats: [],
        messages: [],
        total: 0,
      };

      // Search users if type is undefined or 'users'
      if (!type || type === 'users') {
        const usersResult = await this.searchUsers(query, limit, 0);
        result.users = usersResult.users;
        result.total += usersResult.total;
      }

      // Search chats if type is undefined or 'chats'
      if (!type || type === 'chats') {
        const chatsResult = await this.searchChats(userId, query, limit);
        result.chats = chatsResult.chats;
        result.total += chatsResult.total;
      }

      // Search messages if type is undefined or 'messages'
      if (!type || type === 'messages') {
        const messagesResult = await this.searchMessages(userId, query, undefined, limit);
        result.messages = messagesResult.messages;
        result.total += messagesResult.total;
      }

      // Cache result
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));

      logger.info('Global search completed', {
        userId,
        query,
        type,
        usersCount: result.users.length,
        chatsCount: result.chats.length,
        messagesCount: result.messages.length,
        total: result.total
      });

      return result;
    } catch (error) {
      logger.error('Error in global search:', error);
      throw error;
    }
  }

  /**
   * Clear search cache for a specific user
   * Useful after user updates or chat changes
   */
  async clearSearchCache(userId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}*${userId}*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info('Search cache cleared', { userId, keysCleared: keys.length });
      }
    } catch (error) {
      logger.error('Error clearing search cache:', error);
      // Don't throw - cache clearing is not critical
    }
  }

  /**
   * Clear all search cache
   * Useful for maintenance or after bulk updates
   */
  async clearAllSearchCache(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info('All search cache cleared', { keysCleared: keys.length });
      }
    } catch (error) {
      logger.error('Error clearing all search cache:', error);
      // Don't throw - cache clearing is not critical
    }
  }
}

export const searchService = new SearchService();
