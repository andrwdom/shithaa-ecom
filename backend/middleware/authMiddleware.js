// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const JWT_SECRET = config.jwt_secret;

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Access token required" 
      });
    }

    // SECURITY: Proper JWT verification
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: "Token expired. Please log in again." 
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token. Please log in again." 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: "Authentication failed" 
    });
  }
};
