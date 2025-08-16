import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'
import { environment } from '../config/environment.js'

const verifyToken = async (req, res, next) => {
    try {
        // SECURITY: Check for token in HttpOnly cookies first, then headers for backward compatibility
        let token = req.cookies?.token;
        
        // Fallback to headers for backward compatibility
        if (!token && req.headers.token) {
            token = req.headers.token;
        }
        
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Remove 'Bearer ' prefix
            }
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, environment.jwtSecret);
        
        // SECURITY: Check if token is expired
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        const user = await userModel.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        req.user = user;
        req.user.id = user._id.toString();
        next();
    } catch (error) {
        console.error('Auth middleware - Error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

const isAdmin = async (req, res, next) => {
    // Check for token in both formats
    let token = req.headers.token;
    
    // If not found in token header, check Authorization header
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not Authorized - No token provided' 
        });
    }

    try {
        const decoded = jwt.verify(token, environment.jwtSecret);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Not Authorized - Admin access required' 
            });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.log('Admin Auth Error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Not Authorized - Invalid token' 
        });
    }
}

const optionalVerifyToken = async (req, res, next) => {
    try {
        // Check for token in both formats
        let token = req.headers.token;
        
        // If not found in token header, check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Remove 'Bearer ' prefix
            }
        }
        
        if (!token) {
            req.user = null;
            return next();
        }
        const decoded = jwt.verify(token, environment.jwtSecret);
        const user = await userModel.findById(decoded.id);
        req.user = user || null;
        if (req.user) req.user.id = req.user._id.toString();
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

export { verifyToken, isAdmin, optionalVerifyToken }