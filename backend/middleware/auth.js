import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/response.js';
import { config } from '../config.js'; // Import the centralized config

const JWT_SECRET = config.jwt_secret;

export const verifyToken = async (req, res, next) => {
  try {
    // For admin routes, check token header first
    let token = req.headers.token;
    
    // For other routes, check cookies
    if (!token) {
      token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    }

    console.log('Auth middleware - Request authentication:', {
      hasCookieToken: !!req.cookies?.token,
      hasAuthHeader: !!req.headers.authorization,
      hasTokenHeader: !!req.headers.token,
      tokenFound: !!token,
      method: req.method,
      url: req.url
    });

    if (!token) {
      console.log('Auth middleware - No token provided in cookies or headers');
      return errorResponse(res, 401, 'Access token required. Please log in to continue.');
    }

    console.log('Auth middleware - Token found, length:', token.length);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      console.log('Auth middleware - Token verified successfully for user:', decoded.email);
      next();
    } catch (jwtError) {
      console.log('Auth middleware - JWT verification failed:', {
        error: jwtError.name,
        message: jwtError.message,
        tokenLength: token.length,
        tokenStart: token.substring(0, 20) + '...',
        currentTime: new Date()
      });

      if (jwtError.name === 'TokenExpiredError') {
        console.log('Auth middleware - Token expired:', {
          expiredAt: jwtError.expiredAt,
          currentTime: new Date(),
          timeDifference: new Date() - jwtError.expiredAt
        });

        // Return a specific error for expired tokens
        return errorResponse(res, 401, 'Your session has expired. Please log in again to continue.', {
          errorType: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt,
          message: 'Please log out and log back in to refresh your session.'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        console.log('Auth middleware - Invalid token format');
        return errorResponse(res, 401, 'Invalid token format. Please log in again.');
      } else {
        console.log('Auth middleware - JWT verification failed:', jwtError.message);
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
    
    // Fallback to Authorization header for backward compatibility
    if (!token) {
      token = req.headers.authorization?.split(' ')[1] || req.headers.token;
    }
    
    if (!token) {
      console.log('Optional auth middleware - No token provided, proceeding as guest');
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      console.log('Optional auth middleware - Token verified for user:', decoded.email);
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        console.log('Optional auth middleware - Token expired, proceeding as guest');
        req.user = null;
        return next();
      } else {
        console.log('Optional auth middleware - Invalid token, proceeding as guest');
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