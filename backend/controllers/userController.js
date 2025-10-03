import validator from "validator";
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import userModel from "../models/userModel.js";
import { successResponse, errorResponse } from '../utils/response.js'
import admin from 'firebase-admin';
import { config } from '../config.js'; // Import the centralized config
import { getCookieOptions } from '../utils/instagramBrowserUtils.js';

const JWT_SECRET = config.jwt_secret;

const createToken = (payload, expiresIn = '24h') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// GET /api/auth/profile - Get current user profile
export const getProfile = async (req, res) => {
    try {
        // If no user is authenticated, return 200 with no data
        if (!req.user) {
            return res.status(200).json({
                success: true,
                data: null,
                message: 'No user authenticated'
            });
        }
        
        const user = await userModel.findById(req.user.id).select('-password');
        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }
        successResponse(res, user, 'Profile fetched successfully');
    } catch (error) {
        console.error('Get Profile Error:', error);
        errorResponse(res, 500, error.message);
    }
};

// PUT /api/auth/profile - Update user profile
export const updateProfile = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        const updateData = {};
        
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (email) {
            // Validate email format
            if (!validator.isEmail(email)) {
                return errorResponse(res, 400, 'Please enter a valid email');
            }
            // Check if email is already taken by another user
            const existingUser = await userModel.findOne({ email, _id: { $ne: req.user.id } });
            if (existingUser) {
                return errorResponse(res, 400, 'Email is already taken');
            }
            updateData.email = email;
        }
        
        const user = await userModel.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }
        
        successResponse(res, user, 'Profile updated successfully');
    } catch (error) {
        console.error('Update Profile Error:', error);
        errorResponse(res, 500, error.message);
    }
};

// Route for user login
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User doesn't exists" })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // SECURITY: Create access and refresh tokens
            const accessToken = createToken({ 
                id: user._id,
                email: user.email,
                role: 'user'
            }, '24h');
            
            const refreshToken = createToken({ 
                id: user._id,
                email: user.email,
                role: 'user',
                type: 'refresh'
            }, '7d');
            
            // SECURITY: Set HttpOnly cookies for secure token storage with Instagram browser support
            res.cookie('token', accessToken, getCookieOptions(req, {
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }));
            
            res.cookie('refresh_token', refreshToken, getCookieOptions(req, {
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            }));
            
            // Return user data without token (now stored in HttpOnly cookies)
            const userData = { ...user.toObject() };
            delete userData.password;
            
            res.json({ 
                success: true, 
                data: { user: userData },
                message: 'Login successful'
            });
        }
        else {
            res.json({ success: false, message: 'Invalid credentials' })
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Route for user register
export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // checking user already exists or not
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "User already exists" })
        }

        // validating email format & strong password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword
        })

        const user = await newUser.save()

        // SECURITY: Create access and refresh tokens
        const accessToken = createToken({ 
            id: user._id,
            email: user.email,
            role: 'user'
        }, '24h');
        
        const refreshToken = createToken({ 
            id: user._id,
            email: user.email,
            role: 'user',
            type: 'refresh'
        }, '7d');
        
        // SECURITY: Set HttpOnly cookies for secure token storage
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/'
        });
        
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        });

        // Return user data without token (now stored in HttpOnly cookies)
        const userData = { ...user.toObject() };
        delete userData.password;

        res.json({ 
            success: true, 
            data: { user: userData },
            message: 'Registration successful'
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Route for admin login
export const adminLogin = async (req, res) => {
    try {
        const {email, password} = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false, 
                message: "Email and password are required"
            });
        }

        // SECURITY: Check admin credentials from database instead of hardcoded values
        const adminUser = await userModel.findOne({ email, role: 'admin' });
        if (!adminUser) {
            return res.status(401).json({
                success: false, 
                message: "Invalid credentials"
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false, 
                message: "Invalid credentials"
            });
        }

        // SECURITY: Create access and refresh tokens for admin
        const accessToken = createToken({
            id: adminUser._id,
            email: adminUser.email,
            role: 'admin'
        }, '24h');
        
        const refreshToken = createToken({
            id: adminUser._id,
            email: adminUser.email,
            role: 'admin',
            type: 'refresh'
        }, '7d');

        // SECURITY: Set HttpOnly cookies for secure token storage with Instagram browser support
        res.cookie('token', accessToken, getCookieOptions(req, {
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }));

        // For admin panel, we'll also return the token in the body for immediate use
        const userData = { ...adminUser.toObject() };
        delete userData.password;

        return res.status(200).json({
            success: true, 
            data: { 
                user: userData,
                token: accessToken
            },
            message: 'Admin login successful'
        });

    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
}

export const getUserInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId).select('name email');
    if (!user) {
      return res.json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// GET /api/users/public-profile?email=... or ?userId=...
export const getPublicProfile = async (req, res) => {
  try {
    const { email, userId } = req.query;
    let user;
    if (email) {
      user = await userModel.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
    } else if (userId) {
      user = await userModel.findById(userId);
    } else {
      return res.status(400).json({ success: false, message: 'Email or userId required' });
    }
    if (!user) {
      // Always return a profile object, even if user not found
      return res.json({ success: true, profile: { name: 'Unknown User', email } });
    }
    res.json({ success: true, profile: { name: user.name || user.displayName || 'Unknown User', email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// POST /api/auth/firebase-login - Exchange Firebase ID token for app JWT
export const firebaseLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'No Firebase ID token provided' });
    }

    let decoded;
    try {
      // Ensure Firebase Admin is initialized before trying to verify a token
      if (!admin.apps.length) {
          console.error('CRITICAL: Firebase Admin SDK is not initialized. Cannot verify ID token.');
          throw new Error('Firebase Admin SDK not initialized');
      }
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.error('Firebase token verification failed:', err);

      // SECURITY: Always fail securely - no authentication bypasses
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed. Please try again or contact support.' 
      });
    }

    if (!decoded || !decoded.email) {
      return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
    }

    // Find or create user in your DB
    let user = await userModel.findOne({ email: decoded.email });
    if (!user) {
      // SECURITY: Create user with proper validation - no empty passwords
      const hashedPassword = await bcrypt.hash(decoded.uid + Date.now(), 10); // Generate secure password
      user = await userModel.create({
        name: decoded.name || '',
        email: decoded.email,
        password: hashedPassword, // Secure password for Firebase users
      });
    } else if (decoded.name && decoded.name !== user.name) {
      // Always sync Google display name to user model if changed
      user.name = decoded.name;
      await user.save();
    }

    // Create app JWT and refresh token
    const accessToken = createToken({ id: user._id, email: user.email, role: 'user' }, '24h');
    const refreshToken = createToken({ 
        id: user._id, 
        email: user.email, 
        role: 'user', 
        type: 'refresh' 
    }, '7d');
    
    // SECURITY: Set HttpOnly cookies for secure token storage with Instagram browser support
    res.cookie('token', accessToken, getCookieOptions(req, {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }));
    
    res.cookie('refresh_token', refreshToken, getCookieOptions(req, {
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }));
    
    // Return user data with token for backward compatibility
    res.json({ success: true, data: { user, token: accessToken }, message: 'Login successful' });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(500).json({ success: false, message: 'Firebase login failed: ' + error.message });
  }
};

// SECURITY: Refresh token endpoint for token rotation
export const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'No refresh token provided'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        // Check if user still exists
        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate new access token
        const newAccessToken = createToken({
            id: user._id,
            email: user.email,
            role: user.role
        }, '24h');

        // Set new access token in HttpOnly cookie with Instagram browser support
        res.cookie('token', newAccessToken, getCookieOptions(req, {
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }));

        res.json({
            success: true,
            data: { token: newAccessToken }, // Include token for admin panel
            message: 'Token refreshed successfully'
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

// SECURITY: Logout endpoint to clear cookies
export const logout = async (req, res) => {
    try {
        // Clear auth cookies
        res.clearCookie('token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/' });
        
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};

