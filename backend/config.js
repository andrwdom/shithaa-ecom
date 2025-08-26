// backend/config.js

// Load environment variables at the very beginning
import dotenv from 'dotenv';
dotenv.config();

// CRITICAL: Read the JWT_SECRET once and export it for consistency.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in the environment variables. The application cannot start.");
    process.exit(1);
}

export const config = {
    // Server Configuration
    port: process.env.PORT || 4000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // MongoDB Configuration
    mongodb_uri: process.env.MONGODB_URI,
    
    // Base URL for image paths, etc.
    vpsBaseUrl: process.env.VPS_BASE_URL || 'http://localhost:4000',
    
    // JWT Configuration
    jwt_secret: JWT_SECRET,
    
    // SMTP Configuration for Nodemailer
    smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from_name: process.env.SMTP_FROM_NAME || 'Shithaa',
        from_email: process.env.SMTP_FROM_EMAIL || 'noreply@shithaa.in',
        support_email: process.env.SUPPORT_EMAIL || 'info.shithaa@gmail.com'
    },
    
    // File Upload Configuration
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB in bytes
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    
    // Image Optimization Configuration
    imageOptimization: {
      quality: parseInt(process.env.IMAGE_QUALITY) || 80,
      maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH) || 800,
      maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT) || 800,
      variants: process.env.IMAGE_VARIANTS ? process.env.IMAGE_VARIANTS.split(',') : ['original', 'webp'],
      skipOptimization: process.env.SKIP_IMAGE_OPTIMIZATION === 'true' || false,
      compressionLevel: parseInt(process.env.IMAGE_COMPRESSION_LEVEL) || 6
    },
    
    // CORS Configuration
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    
    // Hero Images Configuration (THIS WAS THE MISSING PIECE CAUSING THE CRASH)
    heroImages: {
      maxDesktop: parseInt(process.env.MAX_DESKTOP) || 6,
      maxMobile: parseInt(process.env.MAX_MOBILE) || 4,
      mobileThumbSize: parseInt(process.env.MOBILE_THUMB_SIZE) || 480,
      desktopThumbSize: parseInt(process.env.DESKTOP_THUMB_SIZE) || 800,
      lqipSize: parseInt(process.env.LQIP_SIZE) || 20,
      cacheSize: parseInt(process.env.THUMBNAIL_CACHE_SIZE) || 100
    },
  
    // Admin credentials from .env
    admin_email: process.env.ADMIN_EMAIL,
    admin_password: process.env.ADMIN_PASSWORD,
  
    // PhonePe settings from .env
    phonepe: {
        env: process.env.PHONEPE_ENV || 'SANDBOX',
        merchant_id: process.env.PHONEPE_MERCHANT_ID || '123456789',
        api_key: process.env.PHONEPE_API_KEY || 'test_api_key',
        salt_index: parseInt(process.env.PHONEPE_SALT_INDEX || '1', 10),
        redirect_url: process.env.PHONEPE_REDIRECT_URL || 'https://shithaa.in/payment/phonepe/callback',
        callback_url: process.env.PHONEPE_CALLBACK_URL || 'https://shithaa.in/api/payment/phonepe/webhook',
    },
  
    // Frontend URL for emails
    frontend_url: process.env.FRONTEND_URL,
};

// Log configuration on startup
console.log('Backend Configuration:', {
  port: config.port,
  nodeEnv: config.nodeEnv,
  vpsBaseUrl: config.vpsBaseUrl,
  heroImages: config.heroImages
}) 