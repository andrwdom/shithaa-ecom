import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'

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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
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
    // Debug logging
    console.log('=== ADMIN AUTH DEBUG ===');
    console.log('Request headers:', req.headers);
    console.log('Token header:', req.headers.token);
    console.log('Authorization header:', req.headers.authorization);
    
    // Check for token in both formats
    let token = req.headers.token;
    
    // If not found in token header, check Authorization header
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    console.log('Final token being used:', token);
    console.log('Token type:', typeof token);
    console.log('Token length:', token ? token.length : 0);

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ 
            success: false, 
            message: 'Not Authorized - No token provided' 
        });
    }

    try {
        console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
        console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded successfully:', { id: decoded.id, email: decoded.email, role: decoded.role });
        
        if (decoded.role !== 'admin') {
            console.log('❌ User role is not admin:', decoded.role);
            return res.status(403).json({ 
                success: false, 
                message: 'Not Authorized - Admin access required' 
            });
        }

        console.log('✅ Admin authentication successful');
        req.user = decoded;
        next();
    } catch (error) {
        console.log('❌ JWT verification failed:', error.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Not Authorized - Invalid token' 
        });
    }
}

const optionalVerifyToken = async (req, res, next) => {
    try {
        // Check for token in cookies first, then headers for backward compatibility
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
            req.user = null;
            return next();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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