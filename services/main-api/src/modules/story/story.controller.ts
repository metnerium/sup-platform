import { Response } from 'express';
import { storyService } from './story.service';
import { AuthRequest } from '../../common/middleware/auth.middleware';
import { logger } from '../../common/utils/logger';
import { CreateStoryInput, ViewStoryInput } from './story.validator';

export class StoryController {
  /**
   * POST /stories - Create a new story
   */
  async createStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const {
        mediaType,
        s3Key,
        captionEncrypted,
        privacy,
        allowedUserIds,
      }: CreateStoryInput = req.body;

      const story = await storyService.createStory(
        userId,
        mediaType,
        s3Key,
        captionEncrypted,
        privacy,
        allowedUserIds
      );

      res.status(201).json({
        success: true,
        data: story,
      });
    } catch (error) {
      logger.error('Error creating story:', { error });
      throw error;
    }
  }

  /**
   * GET /stories - Get my stories
   */
  async getMyStories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const stories = await storyService.getMyStories(userId);

      res.json({
        success: true,
        data: stories,
      });
    } catch (error) {
      logger.error('Error getting my stories:', { error });
      throw error;
    }
  }

  /**
   * GET /stories/feed - Get friends stories feed
   */
  async getFriendsStories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const feed = await storyService.getFriendsStories(userId);

      res.json({
        success: true,
        data: feed,
      });
    } catch (error) {
      logger.error('Error getting friends stories:', { error });
      throw error;
    }
  }

  /**
   * GET /stories/:id - Get a specific story
   */
  async getStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const story = await storyService.getStory(id, userId);

      res.json({
        success: true,
        data: story,
      });
    } catch (error) {
      logger.error('Error getting story:', { error });
      throw error;
    }
  }

  /**
   * DELETE /stories/:id - Delete a story
   */
  async deleteStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await storyService.deleteStory(id, userId);

      res.json({
        success: true,
        data: { message: 'Story deleted successfully' },
      });
    } catch (error) {
      logger.error('Error deleting story:', { error });
      throw error;
    }
  }

  /**
   * POST /stories/:id/view - View a story
   */
  async viewStory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await storyService.viewStory(id, userId);

      res.json({
        success: true,
        data: { message: 'Story viewed successfully' },
      });
    } catch (error) {
      logger.error('Error viewing story:', { error });
      throw error;
    }
  }

  /**
   * GET /stories/:id/views - Get story viewers
   */
  async getStoryViews(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const views = await storyService.getStoryViews(id, userId);

      res.json({
        success: true,
        data: views,
      });
    } catch (error) {
      logger.error('Error getting story views:', { error });
      throw error;
    }
  }
}

export const storyController = new StoryController();
