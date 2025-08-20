import express from 'express';
import { 
    register, 
    login, 
    getProfile, 
    updateProfile, 
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerificationEmail
} from '../controllers/userController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';

const userRouter = express.Router();

// Public routes
userRouter.post('/register', register);
userRouter.post('/login', login);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPassword);
userRouter.get('/verify-email/:token', verifyEmail);
userRouter.post('/resend-verification', resendVerificationEmail);

// Protected routes (optional auth for guest users)
userRouter.get('/auth/profile', optionalAuth, getProfile); // GET /api/auth/profile

// Fully protected routes
userRouter.put('/profile', verifyToken, updateProfile);
userRouter.put('/change-password', verifyToken, changePassword);

export default userRouter;