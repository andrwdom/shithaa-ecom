import express from 'express'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

// Load .env file from the correct path FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env');

console.log('🔧 Loading .env from:', envPath);
console.log('🔧 .env file exists:', existsSync(envPath));

// Load environment variables
dotenv.config({ path: envPath });

// Now import config (which also loads dotenv but won't conflict)
import { config } from './config.js'
import cors from 'cors';
import { trackRequest, trackMemoryUsage, getHealthStatus } from './utils/monitoring.js';
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import connectDB from './config/mongodb.js'
import mongoose from 'mongoose'
import userRouter from './routes/userRoute.js'
import productRouter from './routes/productRoute.js'
import cartRouter from './routes/cartRoute.js'
import orderRouter from './routes/orderRoute.js'
import paymentRouter from './routes/paymentRoute.js'
import checkoutRouter from './routes/checkoutRoute.js'
import couponRouter from './routes/couponRoutes.js'
import carouselRouter from './routes/carouselRoutes.js'
import categoryRouter from './routes/categoryRoute.js'
import contactRouter from './routes/contactRoute.js'
import wishlistRouter from './routes/wishlistRoutes.js'
import shippingRouter from './routes/shippingRoute.js'
import shippingRulesRouter from './routes/shippingRulesRoute.js'
import heroImagesRouter from './routes/heroImagesRoute.js'
import reservationRouter from './routes/reservationRoute.js'
import adminRouter from './routes/adminRoute.js'
import stockRouter from './routes/stockRoutes.js'
import admin from 'firebase-admin'
import orderModel from './models/orderModel.js'
import Category from './models/Category.js'
import productModel from './models/productModel.js'
import { randomBytes } from 'crypto'

// App Config
const app = express()
const PORT = config.port

// Environment variables validation (no secrets logged)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Environment Variables Debug:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('PHONEPE_MERCHANT_ID:', process.env.PHONEPE_MERCHANT_ID ? 'SET' : 'NOT SET');
  console.log('PHONEPE_API_KEY:', process.env.PHONEPE_API_KEY ? 'SET' : 'NOT SET');
  console.log('---');
}

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1)

// SECURITY: Configure CORS for Production
const allowedOrigins = [
    'https://shithaa.in',
    'https://www.shithaa.in',
    'https://admin.shithaa.in',  // Admin panel
    'http://localhost:3000',     // Frontend dev
    'http://localhost:5173',     // Admin dev
    'http://localhost:5174',     // Additional dev port
    'http://localhost:4173'      // Admin production preview
];

const corsOptions = {
    origin: (origin, callback) => {
        // Enhanced logging for debugging
        // // // console.log('CORS Check:', {
            origin: origin || 'undefined',
            referer: origin ? 'N/A' : 'No origin header',
            userAgent: 'N/A', // Will be filled by caller
            timestamp: new Date().toISOString()
        });
        
        // Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
        // Also allow all origins in development
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            console.log('Allowed origins:', allowedOrigins);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token', 'x-requested-with', 'Accept', 'Origin'],
    exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// CRITICAL: Handle CORS and preflight requests BEFORE any other middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Connect to MongoDB
connectDB().then(async () => {
  // Auto-seed default categories if none exist
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.create([
      { name: 'Maternity feeding wear', slug: 'maternity-feeding-wear', description: 'Feeding-friendly maternity wear for mothers.' },
      { name: 'Zipless feeding lounge wear', slug: 'zipless-feeding-lounge-wear', description: 'Lounge wear for feeding without zips.' },
      { name: 'Non feeding lounge wear', slug: 'non-feeding-lounge-wear', description: 'Lounge wear for non-feeding mothers.' }
    ]);
    console.log('Default categories seeded!');
  }
  else {
    console.log('Categories already exist, skipping seeding.');
  }
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Debug logging middleware
// Logging middleware - PRODUCTION OPTIMIZED
app.use((req, res, next) => {
    // Only log in development or for errors in production
    if (process.env.NODE_ENV === 'development') {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    
    // Add request ID for tracking
    req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log slow requests in production
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) { // Log requests taking more than 1 second
            console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.url} took ${duration}ms - ${req.ip}`);
        }
    });
    
    next();
});

// Rate limiting - PRODUCTION OPTIMIZED FOR E-COMMERCE
// Different rate limits for different types of requests

// Very lenient rate limiting for product browsing (most common requests)
const browseLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // 2000 requests per 15 minutes for browsing
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for local dev and OPTIONS requests
        return (
            req.headers.origin === 'http://localhost:5174' ||
            req.headers.origin === 'http://localhost:5173' ||
            req.headers.origin === 'http://localhost:3000' ||
            req.headers.origin === 'http://localhost:3001' ||
            req.method === 'OPTIONS'
        );
    }
});

// General API rate limiting (moderate for cart operations)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes for general API calls
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for local dev and OPTIONS requests
        return (
            req.headers.origin === 'http://localhost:5174' ||
            req.headers.origin === 'http://localhost:5173' ||
            req.headers.origin === 'http://localhost:3000' ||
            req.headers.origin === 'http://localhost:3001' ||
            req.method === 'OPTIONS'
        );
    }
});

// Stricter rate limiting for sensitive operations (auth, payments, etc.)
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes for sensitive operations
    message: 'Too many requests for this operation, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for local dev and OPTIONS requests
        return (
            req.headers.origin === 'http://localhost:5174' ||
            req.headers.origin === 'http://localhost:5173' ||
            req.headers.origin === 'http://localhost:3000' ||
            req.headers.origin === 'http://localhost:3001' ||
            req.method === 'OPTIONS'
        );
    }
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// SECURITY: Helmet for comprehensive security headers
app.use(helmet({
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "img-src": ["'self'", "data:", "blob:", "https:", "http:"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "connect-src": ["'self'", "https://shithaa.in", "https://admin.shithaa.in", "https://shitha-frontend.vercel.app", "https://admin.shithaa.com", "https://shithaa.com", "http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://localhost:3001"],
            "frame-ancestors": ["'none'"],
        },
    }
}));

// SECURITY: Cookie parser for HttpOnly cookies
app.use(cookieParser());

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// PRODUCTION MONITORING: Request tracking middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Track memory usage
    trackMemoryUsage();
    
    // Override res.end to track response time
    const originalEnd = res.end;
    res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        
        // Track request metrics
        trackRequest(responseTime, isError);
        
        // Call original end
        originalEnd.apply(this, args);
    };
    
    next();
});

// Performance optimization middleware
app.use((req, res, next) => {
    // Add performance headers for API responses
    if (req.path.startsWith('/api/')) {
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
    }
    next();
});

// Static file serving with caching headers for better performance
app.use('/uploads', express.static('uploads', {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true
}))
app.use('/images', express.static('/var/www/shithaa-ecom/uploads', {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true
}));
app.use('/gallery', express.static('/var/www/shithaa-ecom/uploads', {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true
}));

// api endpoints
// Apply strict rate limiting to sensitive routes
app.use('/api/user', strictLimiter, userRouter)
app.use('/api/payment', strictLimiter, paymentRouter)
app.use('/api/checkout', strictLimiter, checkoutRouter)
app.use('/api/orders', strictLimiter, orderRouter)

// Apply browse rate limiting to product browsing (most common requests)
app.use('/api/products', browseLimiter, productRouter)
app.use('/api/categories', browseLimiter, categoryRouter)
app.use('/api/carousel', browseLimiter, carouselRouter)
app.use('/api/hero-images', browseLimiter, heroImagesRouter)

// Apply general rate limiting to other routes
app.use('/api/cart', cartRouter)
app.use('/api/coupons', couponRouter)
app.use('/api/contact', contactRouter)
app.use('/api/wishlist', wishlistRouter)
app.use('/api/shipping', shippingRouter)
app.use('/api/shipping-rules', shippingRulesRouter)
app.use('/api/reservations', reservationRouter)
app.use('/api/admin', adminRouter)
app.use('/api/stock', stockRouter)

// Legacy routes for backward compatibility
app.use('/api/product', productRouter)

// Public orders debug route (before any middleware)
app.get('/api/orders/public-list', async (req, res) => {
  try {
    const orders = await orderModel.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('CORS test endpoint hit');
  console.log('Origin:', req.headers.origin);
  console.log('Referer:', req.headers.referer);
  res.json({ 
    success: true, 
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint - PRODUCTION OPTIMIZED WITH MONITORING
app.get('/api/health', async (req, res) => {
  // Check MongoDB connection
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  // Get comprehensive health status
  const healthStatus = await getHealthStatus();
  
  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  const status = healthStatus && healthStatus.healthScore && healthStatus.healthScore >= 90 ? 'ok' : 'warning';

  res.json({ 
    status: status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    memory: memUsageMB,
    environment: process.env.NODE_ENV || 'development',
    monitoring: healthStatus,
  });
});

// Cart system health check endpoint
app.get('/api/cart/health', (req, res) => {
  res.json({ 
    status: 'ok',
    cartSystem: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /api/cart/calculate-total': 'public - no auth required',
      'POST /api/cart/get-items': 'public - no auth required',
      'POST /api/cart/get': 'protected - requires auth',
      'POST /api/cart/add': 'protected - requires auth',
      'POST /api/cart/update': 'protected - requires auth',
      'POST /api/cart/remove': 'protected - requires auth'
    }
  });
});

// Debug endpoint for troubleshooting checkout flow issues
app.get('/api/debug/checkout-flow', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Checkout flow debug endpoint',
    timestamp: new Date().toISOString(),
    frontendEndpoints: {
      'GET /checkout': 'Cart checkout (default)',
      'GET /checkout?mode=buynow': 'Buy now checkout',
      'GET /checkout?mode=cart': 'Cart checkout (explicit)'
    },
    backendEndpoints: {
      'POST /api/cart/calculate-total': 'Calculate cart total with offers',
      'POST /api/cart/get-items': 'Get cart items by userId (public)',
      'POST /api/cart/get': 'Get cart data (protected)'
    },
    storageKeys: {
      frontend: [
        'buyNowItem',
        'buyNowCheckoutData', 
        'buyNowCheckoutFlow',
        'buyNowCheckoutItems',
        'cartItems',
        'cartCheckoutData',
        'cartCheckoutFlow',
        'cartCheckoutItems'
      ]
    }
  });
});

// SECURITY: CSRF token endpoint for state-changing operations
app.get('/api/csrf-token', (req, res) => {
  try {
    // SECURITY: Generate CSRF token for form protection
    const csrfToken = randomBytes(32).toString('hex');
    
    // SECURITY: Set CSRF token in HttpOnly cookie
    res.cookie('csrf-token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
      path: '/'
    });
    
    res.json({ 
      success: true, 
      csrfToken,
      message: 'CSRF token generated successfully'
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate CSRF token' 
    });
  }
});

// CORS error handler - simplified
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        console.error('CORS Error Details:', {
            origin: req.headers.origin,
            method: req.method,
            path: req.path,
            headers: req.headers,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
        
        res.status(403).json({
            success: false,
            message: 'CORS: Origin not allowed',
            origin: req.headers.origin,
            allowedOrigins: allowedOrigins
        });
    } else {
        next(err);
    }
});

// General error handling middleware - PRODUCTION OPTIMIZED
app.use((err, req, res, next) => {
    // Log error with context for production monitoring
    console.error('🚨 PRODUCTION ERROR:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
    
    // Don't expose internal errors to clients in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        success: false,
        message: isDevelopment ? 'Internal Server Error' : 'Something went wrong. Please try again later.',
        error: isDevelopment ? err.message : undefined,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      console.log('🔧 Firebase credentials path:', serviceAccountPath);
      
      // Check if file exists
      if (existsSync(serviceAccountPath)) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        console.log('✅ Firebase Admin SDK initialized with service account');
      } else {
        console.error('❌ Firebase credentials file not found:', serviceAccountPath);
        console.log('Server will continue without Firebase Admin SDK');
      }
    } else if (process.env.NODE_ENV === 'development') {
      // For development, try to initialize with project ID only
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'maternity-test',
      });
      console.log('Firebase Admin SDK initialized with project ID only (development mode)');
    } else {
      console.warn('WARNING: GOOGLE_APPLICATION_CREDENTIALS is not set. Firebase Admin SDK will not be available for token verification.');
      console.log('Server will continue without Firebase Admin SDK');
    }
  }
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
  console.log('Server will continue without Firebase Admin SDK');
}

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT} (all interfaces)`);
    console.log(`✅ Environment: ${process.env.NODE_ENV}`);
    console.log(`✅ MongoDB: ${process.env.MONGODB_URI ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`✅ JWT: ${process.env.JWT_SECRET ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`✅ PhonePe: ${process.env.PHONEPE_MERCHANT_ID ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please choose a different port or stop the running process.`);
    } else {
        console.error('❌ Server error:', error);
    }
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Performing graceful shutdown...`);
    server.close(() => {
        console.log('✅ Server closed. Exiting process.');
        process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.log('⚠️ Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log('🚀 Backend server started successfully!');