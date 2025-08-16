import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

export const environment = {
  // Server Configuration
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB Configuration
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha-maternity',
  mongodbUser: process.env.MONGODB_USER,
  mongodbPassword: process.env.MONGODB_PASSWORD,
  
  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'shitha-maternity-jwt-secret-key-2024',
  
  // VPS Configuration
  vpsBaseUrl: process.env.VPS_BASE_URL || 'https://shithaa.in',
  baseUrl: process.env.BASE_URL || 'https://shithaa.in',
  
  // Email Configuration
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  emailSecure: process.env.EMAIL_SECURE === 'true',
  
  // Firebase Configuration
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'maternity-test',
  
  // PhonePe Payment Configuration
  phonepeMerchantId: process.env.PHONEPE_MERCHANT_ID,
  phonepeApiKey: process.env.PHONEPE_API_KEY,
  phonepeSaltIndex: parseInt(process.env.PHONEPE_SALT_INDEX) || 1,
  phonepeEnv: process.env.PHONEPE_ENV === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX',
  phonepeCallbackUsername: process.env.PHONEPE_CALLBACK_USERNAME,
  phonepeCallbackPassword: process.env.PHONEPE_CALLBACK_PASSWORD,
  
  // Frontend URLs
  frontendUrl: process.env.FRONTEND_URL || 'https://shithaa.com',
  corsOrigin: process.env.CORS_ORIGIN || 'https://shithaa.com',
  
  // File Upload Configuration
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  
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

// Validate required environment variables
export const validateEnvironment = () => {
  const required = ['JWT_SECRET']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.warn('⚠️  Missing required environment variables:', missing.join(', '))
    console.warn('⚠️  Using default values - this may cause security issues in production')
  }
  
  return missing.length === 0
}

// Log configuration on startup
console.log('Environment Configuration:', {
  port: environment.port,
  nodeEnv: environment.nodeEnv,
  vpsBaseUrl: environment.vpsBaseUrl,
  baseUrl: environment.baseUrl,
  jwtSecret: environment.jwtSecret ? '***SET***' : '***MISSING***',
  phonepeMerchantId: environment.phonepeMerchantId ? '***SET***' : '***MISSING***'
})
