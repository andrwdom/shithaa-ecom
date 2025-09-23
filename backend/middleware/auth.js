import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/response.js';
import { config } from '../config.js'; // Import the centralized config
import User from '../models/User.js';

const JWT_SECRET = config.jwt_secret;

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1] || req.headers.token;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });
    }

    // console.log('Auth middleware - Request authentication:', {
    //   hasCookieToken: !!req.cookies?.token,
    //   hasAuthHeader: !!req.headers.authorization,
    //   hasTokenHeader: !!req.headers.token,
    //   tokenFound: !!token,
    //   method: req.method,
    //   url: req.url
    // });

    if (!token) {
      // console.log("token: [REDACTED]");
      return errorResponse(res, 401, 'Access token required. Please log in to continue.');
    }

    // console.log("Auth middleware - Token found, length: [REDACTED]");

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      // console.log("Auth middleware - Token verified successfully for user: [REDACTED]");
      next();
    } catch (jwtError) {
      // console.log("Auth middleware - JWT verification failed: [REDACTED]");

      if (jwtError.name === 'TokenExpiredError') {
        // console.log('Auth middleware - Token expired:', {
        //   expiredAt: jwtError.expiredAt,
        //   currentTime: new Date(),
        //   timeDifference: new Date() - jwtError.expiredAt
        // });

        // Return a specific error for expired tokens
        return errorResponse(res, 401, 'Your session has expired. Please log in again to continue.', {
          errorType: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt,
          message: 'Please log out and log back in to refresh your session.'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        // console.log("token: [REDACTED]");
        return errorResponse(res, 401, 'Invalid token format. Please log in again.');
      } else {
        // // // console.log('Auth middleware - JWT verification failed:', jwtError.message);
        return errorResponse(res, 401, 'Invalid token. Please log in again.');
      }
    }
  } catch (error) {
    console.error('Auth middleware - Unexpected error:', error);
    return errorResponse(res, 500, 'Authentication error. Please try again.');
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    // Check for token in HttpOnly cookies first
    let token = req.cookies?.token;
    
    // Check Authorization header for backward compatibility
    if (!token) {
      token = req.headers.authorization?.split(' ')[1] || req.headers.token;
    }
    
    if (!token) {
      // console.log("token: [REDACTED]");
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      // console.log("Optional auth middleware - Token verified for user: [REDACTED]");
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        // console.log("token: [REDACTED]");
        req.user = null;
        return next();
      } else {
        // console.log("token: [REDACTED]");
        req.user = null;
        return next();
      }
    }
  } catch (error) {
    console.error('Optional auth middleware - Error, proceeding as guest:', error);
    req.user = null;
    next();
  }
};