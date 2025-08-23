import express from 'express';
import { addProduct, removeProduct, updateProduct, reorderProducts, moveProduct } from '../controllers/productController.js';
import { verifyToken } from '../middleware/auth.js';
import multer from '../middleware/multer.js';

const adminProductRouter = express.Router();

// Admin routes with authentication and file upload middleware
adminProductRouter.post('/', verifyToken, multer.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), addProduct);

adminProductRouter.delete('/:id', verifyToken, removeProduct);
adminProductRouter.put('/:id', verifyToken, multer.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), updateProduct);

// Product ordering routes
adminProductRouter.post('/reorder', verifyToken, reorderProducts);
adminProductRouter.post('/move', verifyToken, moveProduct);

export default adminProductRouter;
