// backend/config.js

// Load environment variables at the very beginning
import dotenv from 'dotenv';
dotenv.config();

// CRITICAL: Read the JWT_SECRET once and export it for consistency.
// This prevents different processes from having different values.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in the environment variables. The application cannot start.");
    process.exit(1); // Exit if the secret is not set
}

export const config = {
    port: process.env.PORT || 4000,
    mongodb_uri: process.env.MONGODB_URI,
    jwt_secret: JWT_SECRET, // Use the sanitized value
    admin_email: process.env.ADMIN_EMAIL,
    admin_password: process.env.ADMIN_PASSWORD,
    phonepe: {
        env: process.env.PHONEPE_ENV || 'SANDBOX',
        merchant_id: process.env.PHONEPE_MERCHANT_ID,
        api_key: process.env.PHONEPE_API_KEY,
        salt_index: process.env.PHONEPE_SALT_INDEX,
        redirect_url: process.env.PHONEPE_REDIRECT_URL,
    },
    email: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    frontend_url: process.env.FRONTEND_URL,
};

// Log configuration on startup
console.log('Backend Configuration:', {
  port: config.port,
  nodeEnv: config.nodeEnv,
  vpsBaseUrl: config.vpsBaseUrl,
  heroImages: config.heroImages
}) 