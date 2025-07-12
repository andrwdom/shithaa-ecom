import express from 'express';
import { getCarouselBanners, createCarouselBanner, updateCarouselBanner, deleteCarouselBanner, updateBannerOrder } from '../controllers/carouselController.js';
import { isAdmin } from '../middleware/auth.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Public route to get all active banners
router.get('/', getCarouselBanners);

// Admin routes
router.post('/', isAdmin, upload.single('image'), createCarouselBanner);
router.put('/:id', isAdmin, upload.single('image'), updateCarouselBanner);
router.delete('/:id', isAdmin, deleteCarouselBanner);
router.post('/order', isAdmin, updateBannerOrder);

export default router; 