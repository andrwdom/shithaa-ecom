import express from 'express';
import { manualExpiryTrigger, getReservationStats } from '../controllers/reservationExpiryWorker.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/reservations/stats - Get reservation statistics (admin only)
router.get('/stats', authMiddleware, getReservationStats);

// POST /api/reservations/expire - Manually trigger reservation expiry (admin only)
router.post('/expire', authMiddleware, manualExpiryTrigger);

export default router;
