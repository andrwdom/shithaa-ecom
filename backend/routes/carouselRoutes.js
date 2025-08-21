import express from 'express';
import { getCarouselBanners, createCarouselBanner, updateCarouselBanner, deleteCarouselBanner, updateBannerOrder } from '../controllers/carouselController.js';
import { verifyToken } from '../middleware/auth.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Public route to get all active banners (for frontend)
router.get('/', getCarouselBanners);

// Admin route to get all banners (including inactive ones)
router.get('/admin', verifyToken, getCarouselBanners);

// Admin routes
router.post('/', verifyToken, upload.single('image'), createCarouselBanner);
router.put('/:id', verifyToken, upload.single('image'), updateCarouselBanner);
router.delete('/:id', verifyToken, deleteCarouselBanner);
router.post('/order', verifyToken, updateBannerOrder);

export default router; 