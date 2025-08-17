import express from 'express'
import 'dotenv/config'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the correct path
import dotenv from 'dotenv';
const envPath = join(__dirname, '.env');
console.log('🔧 Loading .env from:', envPath);
console.log('🔧 .env file exists:', existsSync(envPath));
dotenv.config({ path: envPath });
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import connectDB from './config/mongodb.js'
import { config } from './config.js'
import userRouter from './routes/userRoute.js'
import productRouter from './routes/productRoute.js'
import cartRouter from './routes/cartRoute.js'
import orderRouter from './routes/orderRoute.js'
import paymentRouter from './routes/paymentRoute.js'
import couponRouter from './routes/couponRoutes.js'
import carouselRouter from './routes/carouselRoutes.js'
import categoryRouter from './routes/categoryRoute.js'
import contactRouter from './routes/contactRoute.js'
import wishlistRouter from './routes/wishlistRoutes.js'
import shippingRouter from './routes/shippingRoute.js'
import shippingRulesRouter from './routes/shippingRulesRoute.js'
import heroImagesRouter from './routes/heroImagesRoute.js'
import admin from 'firebase-admin'
import orderModel from './models/orderModel.js'
import Category from './models/Category.js'
import productModel from './models/productModel.js'
import { randomBytes } from 'crypto'

// App Config
const app = express()
const PORT = config.port

// Debug environment variables
console.log('🔧 Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
console.log('JWT_SECRET preview:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'N/A');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'NOT SET');
console.log('---');

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1)

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
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per windowMs
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

// Apply rate limiting to all routes
app.use(limiter);

// Apply rate limiting to auth routes with higher limits
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 attempts per hour
    message: 'Too many login attempts, please try again later',
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

// Apply auth rate limiting only to specific routes
app.use('/api/user/login', authLimiter);
app.use('/api/user/admin', authLimiter);

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

// CORS is completely handled by nginx - no backend configuration needed

// CORS is completely handled by nginx - no backend CORS configuration needed

// CORS is completely handled by nginx - no backend CORS middleware needed
// This prevents duplicate CORS headers that cause browser errors

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static('uploads'))
app.use('/images', express.static('/var/www/shithaa-ecom/uploads'));
app.use('/gallery', express.static('/var/www/shithaa-ecom/uploads'));

// api endpoints
app.use('/api/user', userRouter)
app.use('/api/products', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/orders', orderRouter)
app.use('/api/payment', paymentRouter)
app.use('/api/coupons', couponRouter)
app.use('/api/carousel', carouselRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/contact', contactRouter)
app.use('/api/wishlist', wishlistRouter)
app.use('/api/shipping', shippingRouter)
app.use('/api/shipping-rules', shippingRulesRouter)
app.use('/api/hero-images', heroImagesRouter)

// Legacy routes for backward compatibility
app.use('/api/product', productRouter)
// Removed duplicate order route registration to fix /api/orders/phonepe endpoint
// app.use('/api/order', orderRouter)

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
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

// General error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack)
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
})

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

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    app.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (all interfaces)`);
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please choose a different port or stop the running process.`);
    } else {
        console.error('Server error:', error);
    }
});

console.log('Backend server started - latest code loaded');
console.log('DEBUG: Loaded PHONEPE_MERCHANT_ID:', process.env.PHONEPE_MERCHANT_ID);