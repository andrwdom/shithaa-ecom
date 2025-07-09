import express from 'express';
import { 
    loginUser, 
    registerUser, 
    adminLogin, 
    getUserInfo,
    getProfile,
    updateProfile,
    firebaseLogin,
    getPublicProfile
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';

const userRouter = express.Router();

// Auth routes
userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/admin', adminLogin)
userRouter.post('/firebase-login', firebaseLogin)

// Profile routes
userRouter.get('/auth/profile', verifyToken, getProfile); // GET /api/auth/profile
userRouter.put('/auth/profile', verifyToken, updateProfile); // PUT /api/auth/profile

// Legacy route for backward compatibility
userRouter.get('/info', verifyToken, getUserInfo);

// Public profile route for admin panel and others
userRouter.get('/public-profile', getPublicProfile);

export default userRouter;