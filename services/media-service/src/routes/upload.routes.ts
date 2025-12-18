import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authMiddleware, ownershipMiddleware } from '../middleware/auth.middleware';
import { uploadMiddleware, uploadMultipleMiddleware, handleMulterError } from '../middleware/upload.middleware';
import { uploadLimiter, downloadLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Upload routes
router.post(
  '/upload',
  authMiddleware,
  uploadLimiter,
  uploadMiddleware.single('file'),
  handleMulterError,
  uploadController.uploadFile.bind(uploadController)
);

router.post(
  '/upload/multiple',
  authMiddleware,
  uploadLimiter,
  uploadMultipleMiddleware.array('files', 10),
  handleMulterError,
  uploadController.uploadMultipleFiles.bind(uploadController)
);

// Chunked upload routes
router.post(
  '/upload/chunked/init',
  authMiddleware,
  uploadLimiter,
  uploadController.initChunkedUpload.bind(uploadController)
);

router.post(
  '/upload/chunked/:uploadId',
  authMiddleware,
  uploadLimiter,
  uploadMiddleware.single('chunk'),
  handleMulterError,
  uploadController.uploadChunk.bind(uploadController)
);

router.post(
  '/upload/chunked/:uploadId/complete',
  authMiddleware,
  uploadController.completeChunkedUpload.bind(uploadController)
);

router.delete(
  '/upload/chunked/:uploadId',
  authMiddleware,
  uploadController.abortChunkedUpload.bind(uploadController)
);

// Download routes
router.get(
  '/download/:s3Key(*)',
  authMiddleware,
  ownershipMiddleware,
  downloadLimiter,
  uploadController.getDownloadUrl.bind(uploadController)
);

// File management routes
router.delete(
  '/:s3Key(*)',
  authMiddleware,
  ownershipMiddleware,
  uploadController.deleteFile.bind(uploadController)
);

router.get(
  '/metadata/:s3Key(*)',
  authMiddleware,
  ownershipMiddleware,
  uploadController.getFileMetadata.bind(uploadController)
);

export default router;
