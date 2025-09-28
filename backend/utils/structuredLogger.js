import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../logs');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which logs to print based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: logFormat,
  }),
  // File transport for errors
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.substring(0, message.lastIndexOf('\n')));
  },
};

// Security: Redact sensitive information
const redactSensitive = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sensitiveKeys = ['password', 'secret', 'key', 'token', 'jwt', 'api_key', 'auth'];
  const redacted = { ...obj };
  
  for (const key in redacted) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      redacted[key] = '***REDACTED***';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  
  return redacted;
};

// Enhanced logging methods
export const log = {
  error: (message, meta = {}) => {
    logger.error(message, redactSensitive(meta));
  },
  warn: (message, meta = {}) => {
    logger.warn(message, redactSensitive(meta));
  },
  info: (message, meta = {}) => {
    logger.info(message, redactSensitive(meta));
  },
  http: (message, meta = {}) => {
    logger.http(message, redactSensitive(meta));
  },
  debug: (message, meta = {}) => {
    logger.debug(message, redactSensitive(meta));
  },
  // Specialized logging methods
  webhook: (level, message, meta = {}) => {
    logger[level](`[WEBHOOK] ${message}`, redactSensitive(meta));
  },
  payment: (level, message, meta = {}) => {
    logger[level](`[PAYMENT] ${message}`, redactSensitive(meta));
  },
  stock: (level, message, meta = {}) => {
    logger[level](`[STOCK] ${message}`, redactSensitive(meta));
  },
  order: (level, message, meta = {}) => {
    logger[level](`[ORDER] ${message}`, redactSensitive(meta));
  },
  security: (level, message, meta = {}) => {
    logger[level](`[SECURITY] ${message}`, redactSensitive(meta));
  },
  performance: (level, message, meta = {}) => {
    logger[level](`[PERFORMANCE] ${message}`, redactSensitive(meta));
  },
};

export default logger;
