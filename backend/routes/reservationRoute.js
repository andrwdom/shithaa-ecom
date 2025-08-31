import express from 'express';
import { 
    createReservation, 
    getReservation, 
    cancelReservation 
} from '../controllers/reservationController.js';
import { verifyToken } from '../middleware/auth.js';

const reservationRouter = express.Router();

// Create reservation (requires authentication)
reservationRouter.post('/reserve', verifyToken, createReservation);

// Get reservation by ID (requires authentication)
reservationRouter.get('/reservation/:id', verifyToken, getReservation);

// Cancel reservation (requires authentication)
reservationRouter.post('/reservation/:id/cancel', verifyToken, cancelReservation);

export default reservationRouter;
