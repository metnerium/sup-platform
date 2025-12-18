import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/health', healthController.healthCheck.bind(healthController));
router.get('/ready', healthController.readinessCheck.bind(healthController));

export default router;
