import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/auth.middleware';
import { storyController } from './story.controller';
import {
  validate,
  createStorySchema,
  storyIdParamSchema,
} from './story.validator';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

/**
 * POST /stories - Create a new story
 */
router.post(
  '/',
  validate(createStorySchema),
  asyncHandler(storyController.createStory.bind(storyController))
);

/**
 * GET /stories - Get my stories
 */
router.get(
  '/',
  asyncHandler(storyController.getMyStories.bind(storyController))
);

/**
 * GET /stories/feed - Get friends stories feed
 * NOTE: This must be defined before /:id to avoid route conflicts
 */
router.get(
  '/feed',
  asyncHandler(storyController.getFriendsStories.bind(storyController))
);

/**
 * GET /stories/:id - Get a specific story
 */
router.get(
  '/:id',
  validate(storyIdParamSchema),
  asyncHandler(storyController.getStory.bind(storyController))
);

/**
 * DELETE /stories/:id - Delete a story
 */
router.delete(
  '/:id',
  validate(storyIdParamSchema),
  asyncHandler(storyController.deleteStory.bind(storyController))
);

/**
 * POST /stories/:id/view - View a story
 */
router.post(
  '/:id/view',
  validate(storyIdParamSchema),
  asyncHandler(storyController.viewStory.bind(storyController))
);

/**
 * GET /stories/:id/views - Get story viewers
 */
router.get(
  '/:id/views',
  validate(storyIdParamSchema),
  asyncHandler(storyController.getStoryViews.bind(storyController))
);

export default router;
