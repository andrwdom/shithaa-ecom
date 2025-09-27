import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFileName(type) {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${type}-${date}.log`);
  }

  formatLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null,
      pid: process.pid
    };
    
    return `${timestamp} [${level}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
  }

  writeLog(type, level, message, data = null) {
    const logFile = this.getLogFileName(type);
    const logEntry = this.formatLog(level, message, data) + '\n';
    
    try {
      fs.appendFileSync(logFile, logEntry);
      console.log(`[${level}] ${message}`);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  // Payment specific logging
  paymentLog(level, message, data = null) {
    this.writeLog('payment', level, message, data);
  }

  // Order specific logging
  orderLog(level, message, data = null) {
    this.writeLog('order', level, message, data);
  }

  // Webhook specific logging
  webhookLog(level, message, data = null) {
    this.writeLog('webhook', level, message, data);
  }

  // Error logging
  errorLog(level, message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : null;
    this.writeLog('error', level, message, errorData);
  }

  // Critical alerts
  criticalAlert(message, data = null) {
    this.writeLog('critical', 'CRITICAL', message, data);
    console.error(`🚨 CRITICAL: ${message}`);
  }

  // Debug logging
  debug(message, data = null) {
    this.writeLog('debug', 'DEBUG', message, data);
  }

  // Info logging
  info(message, data = null) {
    this.writeLog('info', 'INFO', message, data);
  }

  // Warning logging
  warn(message, data = null) {
    this.writeLog('warning', 'WARN', message, data);
  }

  // Error logging
  error(message, error = null) {
    this.errorLog('ERROR', message, error);
  }
}

export default new EnhancedLogger();
