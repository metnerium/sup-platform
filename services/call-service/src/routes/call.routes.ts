import { Router } from 'express';
import { CallController } from '../controllers/call.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Call management
router.post('/start', CallController.startCall);
router.post('/:callId/join', CallController.joinCall);
router.post('/:callId/end', CallController.endCall);
router.post('/:callId/token', CallController.getToken);

// Call information
router.get('/history', CallController.getHistory);
router.get('/active', CallController.getActiveCalls);
router.get('/stats', CallController.getStats);
router.get('/:callId', CallController.getCall);

// Participant management
router.patch('/:callId/participant', CallController.updateParticipant);

export default router;
