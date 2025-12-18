import { Router, Request, Response } from 'express';
import { monitoringService } from '../services/monitoring.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Metrics endpoint (Prometheus format could be added)
router.get(
  '/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const metrics = await monitoringService.getMetrics();
    res.json(metrics);
  })
);

// Health check endpoint
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const health = await monitoringService.getHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  })
);

export default router;
