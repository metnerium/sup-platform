import { Router } from 'express';
import { downloadController } from '../controllers/download.controller';
import { authMiddleware, ownershipMiddleware } from '../middleware/auth.middleware';
import { downloadLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Download file with presigned URL
router.get(
  '/download/:s3Key(*)',
  authMiddleware,
  ownershipMiddleware,
  downloadLimiter,
  downloadController.getDownloadUrl.bind(downloadController)
);

// Get thumbnail
router.get(
  '/thumbnail/:s3Key(*)',
  authMiddleware,
  ownershipMiddleware,
  downloadLimiter,
  downloadController.getThumbnail.bind(downloadController)
);

// Stream file directly (for large files)
router.get(
  '/stream/:s3Key(*)',
  authMiddleware,
  ownershipMiddleware,
  downloadLimiter,
  downloadController.streamFile.bind(downloadController)
);

// Get file info/metadata
router.get(
  '/file/:fileId/info',
  authMiddleware,
  downloadController.getFileInfo.bind(downloadController)
);

export default router;
