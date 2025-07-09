import validator from "validator";
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import userModel from "../models/userModel.js";
import { successResponse, errorResponse } from '../utils/response.js'
import admin from 'firebase-admin';

const createToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// GET /api/auth/profile - Get current user profile
export const getProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id).select('-password');
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }
        successResponse(res, user, 'Profile fetched successfully');
    } catch (error) {
        console.error('Get Profile Error:', error);
        errorResponse(res, error.message);
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
                return errorResponse(res, 'Please enter a valid email', 400);
            }
            // Check if email is already taken by another user
            const existingUser = await userModel.findOne({ email, _id: { $ne: req.user.id } });
            if (existingUser) {
                return errorResponse(res, 'Email is already taken', 400);
            }
            updateData.email = email;
        }
        
        const user = await userModel.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }
        
        successResponse(res, user, 'Profile updated successfully');
    } catch (error) {
        console.error('Update Profile Error:', error);
        errorResponse(res, error.message);
    }
};

// Route for user login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User doesn't exists" })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = createToken({ 
                id: user._id,
                email: user.email,
                role: 'user'
            });
            
            // Return user data along with token
            const userData = { ...user.toObject() };
            delete userData.password;
            
            res.json({ 
                success: true, 
                data: { user: userData, token },
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
const registerUser = async (req, res) => {
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

        const token = createToken({ 
            id: user._id,
            email: user.email,
            role: 'user'
        });

        // Return user data along with token
        const userData = { ...user.toObject() };
        delete userData.password;

        res.json({ 
            success: true, 
            data: { user: userData, token },
            message: 'Registration successful'
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Route for admin login
const adminLogin = async (req, res) => {
    try {
        const {email, password} = req.body

        if (!email || !password) {
            return res.status(400).json({
                success: false, 
                message: "Email and password are required"
            });
        }

        // Change default admin credentials
        if (email === 'admin@gmail.com' && password === 'admin123') {
            const token = createToken({
                email: email,
                role: 'admin',
                id: 'admin' // Adding an ID for consistency
            });
            return res.status(200).json({
                success: true, 
                data: { 
                    user: { email, role: 'admin' }, 
                    token 
                },
                message: 'Admin login successful'
            });
        } else {
            return res.status(401).json({
                success: false, 
                message: "Invalid credentials"
            });
        }

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
      // Try to verify Firebase ID token
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseError) {
      console.error('Firebase token verification failed:', firebaseError.message);
      
      // For development, create a mock user if Firebase Admin isn't available
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Creating mock user for testing');
        
        // Create a test user for development
        let user = await userModel.findOne({ email: 'test@example.com' });
        if (!user) {
          user = await userModel.create({
            name: 'Test User',
            email: 'test@example.com',
            password: '',
          });
        }
        
        const token = createToken({ id: user._id, email: user.email, role: 'user' });
        return res.json({ 
          success: true, 
          data: { user, token }, 
          message: 'Development login successful (Firebase Admin not configured)' 
        });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
      }
    }

    if (!decoded || !decoded.email) {
      return res.status(401).json({ success: false, message: 'Invalid Firebase token' });
    }

    // Find or create user in your DB
    let user = await userModel.findOne({ email: decoded.email });
    if (!user) {
      user = await userModel.create({
        name: decoded.name || '',
        email: decoded.email,
        password: '', // Not used for Firebase users
      });
    } else if (decoded.name && decoded.name !== user.name) {
      // Always sync Google display name to user model if changed
      user.name = decoded.name;
      await user.save();
    }

    // Create app JWT
    const token = createToken({ id: user._id, email: user.email, role: 'user' });
    res.json({ success: true, data: { user, token }, message: 'Login successful' });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(500).json({ success: false, message: 'Firebase login failed: ' + error.message });
  }
};

export { loginUser, registerUser, adminLogin }