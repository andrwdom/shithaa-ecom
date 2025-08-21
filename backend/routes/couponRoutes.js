import express from 'express';
import { validateCoupon } from '../controllers/couponController.js';

const router = express.Router();

// Public route for coupon validation only
router.post('/validate', validateCoupon);

export default router; 