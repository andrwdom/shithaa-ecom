#!/usr/bin/env node

/**
 * Stock Monitoring Worker
 * Runs periodic health checks and sends alerts
 */

import mongoose from 'mongoose';
import { monitoring } from '../utils/monitoring.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

// Run health check
const runHealthCheck = async () => {
  const correlationId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📊 [${correlationId}] Starting stock health check...`);
    
    const metrics = await monitoring.getStockHealthMetrics();
    
    console.log(`✅ [${correlationId}] Health check completed. Score: ${metrics.healthScore}/100`);
    
    return metrics;
  } catch (error) {
    console.error(`❌ [${correlationId}] Health check failed:`, error);
    return { success: false, error: error.message };
  }
};

// Main worker function
const runWorker = async () => {
  try {
    console.log('🔄 [Stock Monitoring Worker] Starting monitoring cycle...');
    const result = await runHealthCheck();
    console.log('✅ [Stock Monitoring Worker] Monitoring completed:', result);
  } catch (error) {
    console.error('❌ [Stock Monitoring Worker] Monitoring failed:', error);
  }
};

// Connect to MongoDB and start the worker
mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ [Stock Monitoring Worker] Connected to MongoDB');
    
    // Run immediately on startup
    runWorker();
    
    // Then run every minute
    setInterval(runWorker, 60 * 1000);
    
    console.log('🔄 [Stock Monitoring Worker] Started - will run every minute');
  })
  .catch((error) => {
    console.error('❌ [Stock Monitoring Worker] Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 [Stock Monitoring Worker] Shutting down gracefully...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 [Stock Monitoring Worker] Shutting down gracefully...');
  mongoose.connection.close();
  process.exit(0);
});
