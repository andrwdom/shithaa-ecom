import express from 'express';
import { 
    getProductById, 
    getAllProducts, 
    getCategories, 
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    getProductStats,
    clearProductCaches
} from '../controllers/productControllerCached.js';

import {
    addToCart,
    getUserCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    calculateCartTotal,
    getCartItems,
    clearAllCartCaches
} from '../controllers/cartControllerCached.js';

import {
    registerUser,
    loginUser,
    firebaseLogin,
    getUserProfile,
    updateUserProfile,
    logoutUser,
    refreshToken,
    getUserSession,
    clearAllUserCaches,
    getUserStats
} from '../controllers/userControllerCached.js';

import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Product routes with caching
router.get('/products/:id', getProductById);
router.get('/products', getAllProducts);
router.get('/products/categories', getCategories);
router.get('/products/category/:category', getProductsByCategory);
router.get('/products/search', searchProducts);
router.get('/products/stats', getProductStats);
router.post('/products', verifyToken, createProduct);
router.put('/products/:id', verifyToken, updateProduct);
router.delete('/products/:id', verifyToken, deleteProduct);
router.post('/products/clear-cache', verifyToken, clearProductCaches);

// Cart routes with caching
router.post('/cart/add', verifyToken, addToCart);
router.post('/cart/get', verifyToken, getUserCart);
router.post('/cart/update', verifyToken, updateCartItem);
router.post('/cart/remove', verifyToken, removeFromCart);
router.post('/cart/clear', verifyToken, clearCart);
router.post('/cart/calculate-total', calculateCartTotal);
router.post('/cart/get-items', getCartItems);
router.post('/cart/clear-cache', verifyToken, clearAllCartCaches);

// User routes with caching
router.post('/user/register', registerUser);
router.post('/user/login', loginUser);
router.post('/user/firebase-login', firebaseLogin);
router.get('/user/profile', verifyToken, getUserProfile);
router.put('/user/profile', verifyToken, updateUserProfile);
router.post('/user/logout', verifyToken, logoutUser);
router.post('/user/refresh-token', verifyToken, refreshToken);
router.get('/user/session', verifyToken, getUserSession);
router.get('/user/stats', verifyToken, getUserStats);
router.post('/user/clear-cache', verifyToken, clearAllUserCaches);

export default router;
