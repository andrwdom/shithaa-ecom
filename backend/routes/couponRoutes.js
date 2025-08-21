import express from 'express';
import { createCoupon, getAllCoupons, getCoupon, updateCoupon, deleteCoupon, validateCoupon } from '../controllers/couponController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Admin routes
router.post('/', verifyToken, createCoupon);
router.get('/', verifyToken, getAllCoupons);
router.get('/:id', verifyToken, getCoupon);
router.put('/:id', verifyToken, updateCoupon);
router.delete('/:id', verifyToken, deleteCoupon);

// Public route for coupon validation
router.post('/validate', validateCoupon);

export default router; 