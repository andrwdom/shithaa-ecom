import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import rateLimit from 'express-rate-limit'
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

// App Config
const app = express()
const PORT = config.port

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

// Security headers
app.use((req, res, next) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Update CSP to allow admin domain and new frontend
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "img-src 'self' data: https: http:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
        "style-src 'self' 'unsafe-inline' https:; " +
        "connect-src 'self' https://shithaa.in https://admin.shithaa.in https://shitha-frontend.vercel.app https://admin.shithaa.com https://shithaa.com http://localhost:5173 http://localhost:5174 http://localhost:3000 http://localhost:3001;"
    );
    next();
});

// --- CORS CONFIGURATION ---
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://shithaa.in',
    'https://admin.shithaa.in',
    'https://shitha-frontend.vercel.app',
    'https://admin.shithaa.com',
    'https://shithaa.com',
    // Add any additional domains that might be needed
    'https://www.shithaa.in',
    'https://www.admin.shithaa.in'
];

// TEMPORARY EMERGENCY FIX - Allow all origins for debugging
const corsOptions = {
    origin: true, // Allow all origins temporarily
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'token',
        'x-requested-with',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Cache-Control'
    ],
    exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'X-Total-Count'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
};

// Apply CORS middleware only once
app.use(cors(corsOptions));

// Add a fallback CORS handler for any missed requests
app.use((req, res, next) => {
    // Set CORS headers for all responses
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, token, x-requested-with, Accept, Origin, X-Requested-With, Cache-Control');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});

// middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static('uploads'))
app.use('/images', express.static('/var/www/shithaa-ecom/uploads'));

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
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('Firebase Admin SDK initialized with service account');
    } else if (process.env.NODE_ENV === 'development') {
      // For development, try to initialize with project ID only
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'maternity-test',
      });
      console.log('Firebase Admin SDK initialized with project ID only (development mode)');
    } else {
      console.error('FATAL: GOOGLE_APPLICATION_CREDENTIALS is not set. Firebase Admin SDK cannot verify tokens in production.');
      process.exit(1);
    }
  }
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error.message);
  console.log('Firebase Admin SDK will not be available for token verification');
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    app.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(0);
    });
});

const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on port ${PORT} (localhost only)`);
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