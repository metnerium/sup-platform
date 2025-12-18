import { db } from '../../config/database';
import { AppError } from '../../common/middleware/error.middleware';
import { logger } from '../../common/utils/logger';
import {
  Story,
  StoryView,
  StoryWithViews,
  StoryFeedItem,
  StoryViewerInfo,
  StoryPrivacy,
} from '@sup/types';

export class StoryService {
  /**
   * Create a new story
   */
  async createStory(
    userId: string,
    mediaType: 'image' | 'video' | 'text',
    s3Key: string,
    captionEncrypted: string | undefined,
    privacy: StoryPrivacy,
    allowedUserIds?: string[]
  ): Promise<Story> {
    try {
      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create story
      const story = await db.one(
        `INSERT INTO stories (user_id, media_type, s3_key, caption_encrypted, privacy, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, media_type, s3_key, caption_encrypted, privacy, expires_at, created_at`,
        [userId, mediaType, s3Key, captionEncrypted, privacy, expiresAt]
      );

      // If privacy is 'selected', insert allowed users
      if (privacy === 'selected' && allowedUserIds && allowedUserIds.length > 0) {
        const values = allowedUserIds
          .map((allowedUserId, index) => `($1, $${index + 2})`)
          .join(', ');
        const params = [story.id, ...allowedUserIds];

        await db.none(
          `INSERT INTO story_privacy_lists (story_id, allowed_user_id)
           VALUES ${values}`,
          params
        );
      }

      logger.info('Story created', { storyId: story.id, userId });

      return this.mapStoryFromDb(story);
    } catch (error) {
      logger.error('Error creating story:', { userId, error });
      throw error;
    }
  }

  /**
   * Get my stories (stories created by the user)
   */
  async getMyStories(userId: string): Promise<StoryWithViews[]> {
    try {
      const stories = await db.any(
        `SELECT
          s.id,
          s.user_id,
          s.media_type,
          s.s3_key,
          s.caption_encrypted,
          s.privacy,
          s.expires_at,
          s.created_at,
          COUNT(DISTINCT sv.viewer_id) as views_count
         FROM stories s
         LEFT JOIN story_views sv ON s.id = sv.story_id
         WHERE s.user_id = $1 AND s.expires_at > NOW()
         GROUP BY s.id
         ORDER BY s.created_at DESC`,
        [userId]
      );

      return stories.map((s) => ({
        ...this.mapStoryFromDb(s),
        viewsCount: parseInt(s.views_count) || 0,
      }));
    } catch (error) {
      logger.error('Error getting my stories:', { userId, error });
      throw error;
    }
  }

  /**
   * Get stories from user's contacts (friends stories feed)
   */
  async getFriendsStories(userId: string): Promise<StoryFeedItem[]> {
    try {
      // Get stories from contacts that the user can see
      const stories = await db.any(
        `SELECT
          s.id,
          s.user_id,
          s.media_type,
          s.s3_key,
          s.caption_encrypted,
          s.privacy,
          s.expires_at,
          s.created_at,
          u.username,
          u.avatar_url,
          COUNT(DISTINCT sv.viewer_id) as views_count,
          EXISTS(SELECT 1 FROM story_views WHERE story_id = s.id AND viewer_id = $1) as has_viewed
         FROM stories s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN story_views sv ON s.id = sv.story_id
         WHERE s.expires_at > NOW()
         AND s.user_id != $1
         AND s.user_id IN (SELECT contact_user_id FROM contacts WHERE user_id = $1)
         AND (
           s.privacy = 'all'
           OR (s.privacy = 'contacts' AND EXISTS(SELECT 1 FROM contacts WHERE user_id = s.user_id AND contact_user_id = $1))
           OR (s.privacy = 'selected' AND EXISTS(SELECT 1 FROM story_privacy_lists WHERE story_id = s.id AND allowed_user_id = $1))
         )
         GROUP BY s.id, u.username, u.avatar_url
         ORDER BY s.created_at DESC`,
        [userId]
      );

      // Group stories by user
      const storyMap = new Map<string, StoryFeedItem>();

      for (const story of stories) {
        if (!storyMap.has(story.user_id)) {
          storyMap.set(story.user_id, {
            userId: story.user_id,
            username: story.username,
            avatarUrl: story.avatar_url,
            stories: [],
            hasUnviewed: false,
          });
        }

        const feedItem = storyMap.get(story.user_id)!;
        feedItem.stories.push({
          ...this.mapStoryFromDb(story),
          viewsCount: parseInt(story.views_count) || 0,
          hasViewed: story.has_viewed,
        });

        if (!story.has_viewed) {
          feedItem.hasUnviewed = true;
        }
      }

      return Array.from(storyMap.values());
    } catch (error) {
      logger.error('Error getting friends stories:', { userId, error });
      throw error;
    }
  }

  /**
   * Get a specific story with privacy checks
   */
  async getStory(storyId: string, userId: string): Promise<StoryWithViews> {
    try {
      const story = await db.oneOrNone(
        `SELECT
          s.id,
          s.user_id,
          s.media_type,
          s.s3_key,
          s.caption_encrypted,
          s.privacy,
          s.expires_at,
          s.created_at,
          COUNT(DISTINCT sv.viewer_id) as views_count,
          EXISTS(SELECT 1 FROM story_views WHERE story_id = s.id AND viewer_id = $2) as has_viewed
         FROM stories s
         LEFT JOIN story_views sv ON s.id = sv.story_id
         WHERE s.id = $1 AND s.expires_at > NOW()
         GROUP BY s.id`,
        [storyId, userId]
      );

      if (!story) {
        throw new AppError(404, 'Story not found or expired');
      }

      // Check privacy settings
      if (story.user_id !== userId) {
        const canView = await this.canViewStory(storyId, story.user_id, story.privacy, userId);
        if (!canView) {
          throw new AppError(403, 'You do not have permission to view this story');
        }
      }

      return {
        ...this.mapStoryFromDb(story),
        viewsCount: parseInt(story.views_count) || 0,
        hasViewed: story.has_viewed,
      };
    } catch (error) {
      logger.error('Error getting story:', { storyId, userId, error });
      throw error;
    }
  }

  /**
   * Delete a story (only owner can delete)
   */
  async deleteStory(storyId: string, userId: string): Promise<void> {
    try {
      // Check if story exists and belongs to user
      const story = await db.oneOrNone(
        'SELECT user_id FROM stories WHERE id = $1',
        [storyId]
      );

      if (!story) {
        throw new AppError(404, 'Story not found');
      }

      if (story.user_id !== userId) {
        throw new AppError(403, 'You can only delete your own stories');
      }

      // Delete story (cascade will delete views and privacy lists)
      await db.none('DELETE FROM stories WHERE id = $1', [storyId]);

      logger.info('Story deleted', { storyId, userId });
    } catch (error) {
      logger.error('Error deleting story:', { storyId, userId, error });
      throw error;
    }
  }

  /**
   * View a story (record view)
   */
  async viewStory(storyId: string, viewerId: string): Promise<void> {
    try {
      // Check if story exists and is not expired
      const story = await db.oneOrNone(
        'SELECT id, user_id, privacy FROM stories WHERE id = $1 AND expires_at > NOW()',
        [storyId]
      );

      if (!story) {
        throw new AppError(404, 'Story not found or expired');
      }

      // Check privacy settings (owner can always view their own story)
      if (story.user_id !== viewerId) {
        const canView = await this.canViewStory(storyId, story.user_id, story.privacy, viewerId);
        if (!canView) {
          throw new AppError(403, 'You do not have permission to view this story');
        }
      }

      // Record view (use INSERT ... ON CONFLICT to avoid duplicate views)
      await db.none(
        `INSERT INTO story_views (story_id, viewer_id)
         VALUES ($1, $2)
         ON CONFLICT (story_id, viewer_id) DO UPDATE SET viewed_at = NOW()`,
        [storyId, viewerId]
      );

      logger.info('Story viewed', { storyId, viewerId });
    } catch (error) {
      logger.error('Error viewing story:', { storyId, viewerId, error });
      throw error;
    }
  }

  /**
   * Get story viewers (only story owner can see)
   */
  async getStoryViews(storyId: string, userId: string): Promise<StoryViewerInfo[]> {
    try {
      // Check if story exists and belongs to user
      const story = await db.oneOrNone(
        'SELECT user_id FROM stories WHERE id = $1',
        [storyId]
      );

      if (!story) {
        throw new AppError(404, 'Story not found');
      }

      if (story.user_id !== userId) {
        throw new AppError(403, 'You can only view your own story views');
      }

      // Get viewers
      const viewers = await db.any(
        `SELECT
          sv.viewer_id,
          sv.viewed_at,
          u.username,
          u.avatar_url
         FROM story_views sv
         JOIN users u ON sv.viewer_id = u.id
         WHERE sv.story_id = $1
         ORDER BY sv.viewed_at DESC`,
        [storyId]
      );

      return viewers.map((v) => ({
        viewerId: v.viewer_id,
        username: v.username,
        avatarUrl: v.avatar_url,
        viewedAt: v.viewed_at,
      }));
    } catch (error) {
      logger.error('Error getting story views:', { storyId, userId, error });
      throw error;
    }
  }

  /**
   * Get active stories for a user (not expired)
   */
  async getActiveStories(userId: string): Promise<StoryWithViews[]> {
    try {
      const stories = await db.any(
        `SELECT
          s.id,
          s.user_id,
          s.media_type,
          s.s3_key,
          s.caption_encrypted,
          s.privacy,
          s.expires_at,
          s.created_at,
          COUNT(DISTINCT sv.viewer_id) as views_count
         FROM stories s
         LEFT JOIN story_views sv ON s.id = sv.story_id
         WHERE s.user_id = $1 AND s.expires_at > NOW()
         GROUP BY s.id
         ORDER BY s.created_at DESC`,
        [userId]
      );

      return stories.map((s) => ({
        ...this.mapStoryFromDb(s),
        viewsCount: parseInt(s.views_count) || 0,
      }));
    } catch (error) {
      logger.error('Error getting active stories:', { userId, error });
      throw error;
    }
  }

  /**
   * Check if a user can view a story based on privacy settings
   */
  private async canViewStory(
    storyId: string,
    storyOwnerId: string,
    privacy: StoryPrivacy,
    viewerId: string
  ): Promise<boolean> {
    // Check if viewer is blocked
    const isBlocked = await db.oneOrNone(
      `SELECT 1 FROM blocked_users
       WHERE (user_id = $1 AND blocked_user_id = $2)
       OR (user_id = $2 AND blocked_user_id = $1)`,
      [storyOwnerId, viewerId]
    );

    if (isBlocked) {
      return false;
    }

    if (privacy === 'all') {
      return true;
    }

    if (privacy === 'contacts') {
      // Check if viewer is in story owner's contacts
      const isContact = await db.oneOrNone(
        'SELECT 1 FROM contacts WHERE user_id = $1 AND contact_user_id = $2',
        [storyOwnerId, viewerId]
      );
      return !!isContact;
    }

    if (privacy === 'selected') {
      // Check if viewer is in the privacy list
      const isAllowed = await db.oneOrNone(
        'SELECT 1 FROM story_privacy_lists WHERE story_id = $1 AND allowed_user_id = $2',
        [storyId, viewerId]
      );
      return !!isAllowed;
    }

    return false;
  }

  /**
   * Map database story to Story type
   */
  private mapStoryFromDb(dbStory: any): Story {
    return {
      id: dbStory.id,
      userId: dbStory.user_id,
      mediaType: dbStory.media_type,
      s3Key: dbStory.s3_key,
      captionEncrypted: dbStory.caption_encrypted,
      privacy: dbStory.privacy,
      expiresAt: dbStory.expires_at,
      createdAt: dbStory.created_at,
    };
  }
}

export const storyService = new StoryService();
