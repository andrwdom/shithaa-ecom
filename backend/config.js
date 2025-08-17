import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export const config = {
  // Server Configuration
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB Configuration
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha-maternity',
  
  // VPS Configuration for Hero Images
  vpsBaseUrl: process.env.VPS_BASE_URL || 'http://localhost:4000',
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key-here',
  
  // Email Configuration
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  
  // File Upload Configuration
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB in bytes
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  
  // Image Optimization Configuration
  imageOptimization: {
    quality: parseInt(process.env.IMAGE_QUALITY) || 80, // Reduce from default 90 for faster processing
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH) || 800, // Reduce max dimensions
    maxHeight: parseInt(process.env.IMAGE_MAX_HEIGHT) || 800,
    variants: process.env.IMAGE_VARIANTS ? process.env.IMAGE_VARIANTS.split(',') : ['original', 'webp'], // Reduce variants
    skipOptimization: process.env.SKIP_IMAGE_OPTIMIZATION === 'true' || false,
    compressionLevel: parseInt(process.env.IMAGE_COMPRESSION_LEVEL) || 6 // WebP compression level (0-6, lower = faster)
  },
  
  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Hero Images Configuration
  heroImages: {
    maxDesktop: parseInt(process.env.MAX_DESKTOP) || 6,
    maxMobile: parseInt(process.env.MAX_MOBILE) || 4,
    mobileThumbSize: parseInt(process.env.MOBILE_THUMB_SIZE) || 480,
    desktopThumbSize: parseInt(process.env.DESKTOP_THUMB_SIZE) || 800,
    lqipSize: parseInt(process.env.LQIP_SIZE) || 20,
    cacheSize: parseInt(process.env.THUMBNAIL_CACHE_SIZE) || 100
  }
}

// Log configuration on startup
console.log('Backend Configuration:', {
  port: config.port,
  nodeEnv: config.nodeEnv,
  vpsBaseUrl: config.vpsBaseUrl,
  heroImages: config.heroImages
}) 