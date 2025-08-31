import express from 'express';
import { 
    getProfile, 
    updateProfile, 
    getUserInfo,
    getPublicProfile,
    firebaseLogin,
    refreshToken,
    logout,
    adminLogin
} from '../controllers/userController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';

const userRouter = express.Router();

// Firebase auth routes
userRouter.post('/firebase-login', firebaseLogin); // POST /api/user/firebase-login
userRouter.post('/refresh-token', refreshToken); // POST /api/user/refresh-token
userRouter.post('/logout', logout); // POST /api/user/logout

// Admin routes
userRouter.post('/admin', adminLogin); // POST /api/user/admin

// Profile routes - 🔧 FIX: Corrected route path to match frontend expectations
userRouter.get('/auth/profile', optionalAuth, getProfile); // GET /api/user/auth/profile
userRouter.put('/auth/profile', verifyToken, updateProfile); // PUT /api/user/auth/profile
userRouter.get('/info', verifyToken, getUserInfo); // GET /api/user/info
userRouter.get('/public-profile', getPublicProfile); // GET /api/user/public-profile

export default userRouter;