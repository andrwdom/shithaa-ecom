import express from 'express';
import { 
    getProfile, 
    updateProfile, 
    getUserInfo,
    getPublicProfile,
    firebaseLogin,
    refreshToken,
    logout
} from '../controllers/userController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';

const userRouter = express.Router();

// Public routes
userRouter.post('/register', async (req, res) => {
    // Import and use the function dynamically since it's not exported
    try {
        const { registerUser } = await import('../controllers/userController.js');
        return registerUser(req, res);
    } catch (error) {
        console.error('Failed to import registerUser:', error);
        return res.status(500).json({ success: false, message: 'Registration service unavailable' });
    }
});

userRouter.post('/login', async (req, res) => {
    // Import and use the function dynamically since it's not exported
    try {
        const { loginUser } = await import('../controllers/userController.js');
        return loginUser(req, res);
    } catch (error) {
        console.error('Failed to import loginUser:', error);
        return res.status(500).json({ success: false, message: 'Login service unavailable' });
    }
});

userRouter.post('/admin', async (req, res) => {
    // Import and use the function dynamically since it's not exported
    try {
        const { adminLogin } = await import('../controllers/userController.js');
        return adminLogin(req, res);
    } catch (error) {
        console.error('Failed to import adminLogin:', error);
        return res.status(500).json({ success: false, message: 'Admin login service unavailable' });
    }
});

// Protected routes (optional auth for guest users)
userRouter.get('/auth/profile', optionalAuth, getProfile); // GET /api/auth/profile
userRouter.get('/info', verifyToken, getUserInfo); // GET /api/user/info
userRouter.get('/public-profile', getPublicProfile); // GET /api/user/public-profile

// Fully protected routes
userRouter.put('/auth/profile', verifyToken, updateProfile); // PUT /api/user/auth/profile
userRouter.post('/firebase-login', firebaseLogin); // POST /api/user/firebase-login
userRouter.post('/refresh-token', refreshToken); // POST /api/user/refresh-token
userRouter.post('/logout', logout); // POST /api/user/logout

export default userRouter;