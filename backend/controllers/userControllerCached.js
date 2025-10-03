import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from '../config.js';
import redisService from '../services/redisService.js';
import admin from 'firebase-admin';
import { getCookieOptions } from '../utils/instagramBrowserUtils.js';

/**
 * Enhanced User Controller with Redis Caching
 * Provides significant performance improvements for authentication and user operations
 */

// Cache key generators
const generateUserKey = (userId) => `user:${userId}`;
const generateUserByEmailKey = (email) => `user:email:${email}`;
const generateSessionKey = (userId) => `session:${userId}`;
const generateTokenKey = (token) => `token:${token}`;

/**
 * POST /api/user/register - Register user with caching
 */
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists with this email' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = new userModel({
            name,
            email,
            password: hashedPassword,
            cart: []
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            config.jwt_secret,
            { expiresIn: '24h' }
        );

        // Cache user data
        const userCacheKey = generateUserKey(user._id);
        const userByEmailKey = generateUserByEmailKey(user.email);
        
        await redisService.set(userCacheKey, user, config.redis.ttl.user);
        await redisService.set(userByEmailKey, user, config.redis.ttl.user);

        // Cache session
        const sessionData = {
            userId: user._id,
            email: user.email,
            name: user.name,
            createdAt: new Date(),
            lastActivity: new Date()
        };
        
        const sessionKey = generateSessionKey(user._id);
        await redisService.set(sessionKey, sessionData, config.redis.ttl.sessions);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                },
                token
            }
        });

    } catch (error) {
        console.error('Register User Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * POST /api/user/login - Login user with caching
 */
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Try to get user from cache first
        const userByEmailKey = generateUserByEmailKey(email);
        let user = await redisService.get(userByEmailKey);
        
        if (!user) {
            // Fetch from database if not in cache
            user = await userModel.findOne({ email });
            if (user) {
                // Cache user data
                const userCacheKey = generateUserKey(user._id);
                await redisService.set(userCacheKey, user, config.redis.ttl.user);
                await redisService.set(userByEmailKey, user, config.redis.ttl.user);
            }
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            config.jwt_secret,
            { expiresIn: '24h' }
        );

        // Cache session
        const sessionData = {
            userId: user._id,
            email: user.email,
            name: user.name,
            createdAt: new Date(),
            lastActivity: new Date()
        };
        
        const sessionKey = generateSessionKey(user._id);
        await redisService.set(sessionKey, sessionData, config.redis.ttl.sessions);

        // Cache token
        const tokenKey = generateTokenKey(token);
        await redisService.set(tokenKey, { userId: user._id, email: user.email }, config.redis.ttl.sessions);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                },
                token
            }
        });

    } catch (error) {
        console.error('Login User Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * POST /api/user/firebase-login - Firebase login with caching
 */
export const firebaseLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'Firebase ID token is required' 
            });
        }

        // Verify Firebase token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            console.error('Firebase token verification failed:', error);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid Firebase token' 
            });
        }

        const { uid, email, name, picture } = decodedToken;

        // Try to get user from cache first
        const userByEmailKey = generateUserByEmailKey(email);
        let user = await redisService.get(userByEmailKey);
        
        if (!user) {
            // Check if user exists in database
            user = await userModel.findOne({ email });
            
            if (!user) {
                // Create new user
                user = new userModel({
                    name: name || 'User',
                    email: email,
                    firebaseUid: uid,
                    profilePicture: picture,
                    cart: []
                });
                await user.save();
                console.log('✅ New user created from Firebase login');
            } else {
                // Update existing user with Firebase UID if not set
                if (!user.firebaseUid) {
                    user.firebaseUid = uid;
                    user.profilePicture = picture;
                    await user.save();
                }
            }

            // Cache user data
            const userCacheKey = generateUserKey(user._id);
            await redisService.set(userCacheKey, user, config.redis.ttl.user);
            await redisService.set(userByEmailKey, user, config.redis.ttl.user);
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            config.jwt_secret,
            { expiresIn: '24h' }
        );

        // Cache session
        const sessionData = {
            userId: user._id,
            email: user.email,
            name: user.name,
            firebaseUid: uid,
            createdAt: new Date(),
            lastActivity: new Date()
        };
        
        const sessionKey = generateSessionKey(user._id);
        await redisService.set(sessionKey, sessionData, config.redis.ttl.sessions);

        // Cache token
        const tokenKey = generateTokenKey(token);
        await redisService.set(tokenKey, { userId: user._id, email: user.email }, config.redis.ttl.sessions);

        res.json({
            success: true,
            message: 'Firebase login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    profilePicture: user.profilePicture
                },
                token
            }
        });

    } catch (error) {
        console.error('Firebase Login Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * GET /api/user/profile - Get user profile with caching
 */
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        // Try to get user from cache first
        const userCacheKey = generateUserKey(userId);
        let user = await redisService.get(userCacheKey);
        
        if (!user) {
            // Fetch from database if not in cache
            user = await userModel.findById(userId).select('-password');
            if (user) {
                // Cache user data
                await redisService.set(userCacheKey, user, config.redis.ttl.user);
            }
        }

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Remove sensitive data
        const userProfile = {
            id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt,
            cart: user.cart || []
        };

        res.json({
            success: true,
            data: userProfile
        });

    } catch (error) {
        console.error('Get User Profile Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * PUT /api/user/profile - Update user profile with cache invalidation
 */
export const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, profilePicture } = req.body;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        // Update user in database
        const updateData = {};
        if (name) updateData.name = name;
        if (profilePicture) updateData.profilePicture = profilePicture;

        const user = await userModel.findByIdAndUpdate(
            userId, 
            updateData, 
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Invalidate user caches
        await invalidateUserCaches(userId, user.email);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture
            }
        });

    } catch (error) {
        console.error('Update User Profile Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * POST /api/user/logout - Logout user with cache cleanup
 */
export const logoutUser = async (req, res) => {
    try {
        const userId = req.user?.id;
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        if (userId) {
            // Clear session cache
            const sessionKey = generateSessionKey(userId);
            await redisService.del(sessionKey);
        }

        if (token) {
            // Clear token cache
            const tokenKey = generateTokenKey(token);
            await redisService.del(tokenKey);
        }

        // Clear HTTP-only cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout User Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * POST /api/user/refresh-token - Refresh JWT token with caching
 */
export const refreshToken = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        // Get user from cache or database
        const userCacheKey = generateUserKey(userId);
        let user = await redisService.get(userCacheKey);
        
        if (!user) {
            user = await userModel.findById(userId).select('-password');
            if (user) {
                await redisService.set(userCacheKey, user, config.redis.ttl.user);
            }
        }

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Generate new JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            config.jwt_secret,
            { expiresIn: '24h' }
        );

        // Cache new token
        const tokenKey = generateTokenKey(token);
        await redisService.set(tokenKey, { userId: user._id, email: user.email }, config.redis.ttl.sessions);

        // Update session
        const sessionData = {
            userId: user._id,
            email: user.email,
            name: user.name,
            createdAt: new Date(),
            lastActivity: new Date()
        };
        
        const sessionKey = generateSessionKey(user._id);
        await redisService.set(sessionKey, sessionData, config.redis.ttl.sessions);

        // Set HTTP-only cookie with Instagram browser support
        res.cookie('token', token, getCookieOptions(req, {
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }));

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                },
                token
            }
        });

    } catch (error) {
        console.error('Refresh Token Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * GET /api/user/session - Get user session with caching
 */
export const getUserSession = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        // Try to get session from cache
        const sessionKey = generateSessionKey(userId);
        let session = await redisService.get(sessionKey);
        
        if (!session) {
            // Get user from database
            const user = await userModel.findById(userId).select('-password');
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            // Create new session
            session = {
                userId: user._id,
                email: user.email,
                name: user.name,
                createdAt: new Date(),
                lastActivity: new Date()
            };
            
            await redisService.set(sessionKey, session, config.redis.ttl.sessions);
        }

        res.json({
            success: true,
            data: session
        });

    } catch (error) {
        console.error('Get User Session Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

/**
 * Invalidate all user-related caches
 */
async function invalidateUserCaches(userId, email) {
    try {
        const patterns = [
            `user:${userId}`,
            `user:email:${email}`,
            `session:${userId}`,
            `cart:${userId}`,
            `cart:total:${userId}:*`
        ];
        
        for (const pattern of patterns) {
            await redisService.delPattern(pattern);
        }
        
        console.log(`🗑️ User caches invalidated for user ${userId}`);
    } catch (error) {
        console.error('❌ Error invalidating user caches:', error);
    }
}

/**
 * Clear all user caches (Admin endpoint)
 */
export const clearAllUserCaches = async (req, res) => {
    try {
        await redisService.delPattern('user:*');
        await redisService.delPattern('session:*');
        await redisService.delPattern('token:*');
        
        res.status(200).json({ 
            message: 'All user caches cleared successfully' 
        });
    } catch (error) {
        console.error('Clear User Caches Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/user/stats - Get user statistics with caching
 */
export const getUserStats = async (req, res) => {
    try {
        const cacheKey = 'user:stats';
        
        // Try to get from cache
        const cachedStats = await redisService.get(cacheKey);
        if (cachedStats) {
            console.log('📦 Cache HIT: User stats found in Redis');
            return res.json({ stats: cachedStats });
        }

        console.log('📭 Cache MISS: Calculating user stats from database');

        // Calculate stats
        const [
            totalUsers,
            activeUsers,
            newUsersToday,
            newUsersThisWeek
        ] = await Promise.all([
            userModel.countDocuments(),
            userModel.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
            userModel.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
            userModel.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
        ]);

        const stats = {
            totalUsers,
            activeUsers,
            newUsersToday,
            newUsersThisWeek,
            lastUpdated: new Date().toISOString()
        };

        // Cache the result
        await redisService.set(cacheKey, stats, config.redis.ttl.static);

        res.json({ stats });
    } catch (error) {
        console.error('Get User Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
};
