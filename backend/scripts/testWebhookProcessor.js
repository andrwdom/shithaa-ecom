#!/usr/bin/env node

/**
 * WEBHOOK PROCESSOR TEST SCRIPT
 * 
 * This script tests the webhook processor to ensure it's working correctly
 */

import mongoose from 'mongoose';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db';

async function testWebhookProcessor() {
  console.log('🧪 Testing Webhook Processor...\n');
  
  try {
    // Connect to database
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Check for unprocessed webhooks
    console.log('🔍 Checking for unprocessed webhooks...');
    const unprocessedCount = await RawWebhook.countDocuments({ 
      processed: false, 
      processing: false 
    });
    console.log(`📊 Found ${unprocessedCount} unprocessed webhooks\n`);
    
    if (unprocessedCount === 0) {
      console.log('ℹ️ No webhooks to process. Creating test webhook...');
      
      // Create a test webhook
      const testWebhook = new RawWebhook({
        provider: 'phonepe',
        headers: { 'content-type': 'application/json' },
        raw: JSON.stringify({
          transactionId: 'TEST-' + Date.now(),
          state: 'COMPLETED',
          amount: 10000
        }),
        receivedAt: new Date()
      });
      
      await testWebhook.save();
      console.log('✅ Test webhook created\n');
    }
    
    // Test the processor
    console.log('🚀 Running webhook processor...');
    
    // Import and run the processor
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync('node backend/jobs/processRawWebhooks.js');
      console.log('📤 Processor Output:');
      console.log(stdout);
      
      if (stderr) {
        console.log('⚠️ Processor Warnings:');
        console.log(stderr);
      }
      
      // Check if webhook was processed
      const processedCount = await RawWebhook.countDocuments({ 
        processed: true 
      });
      console.log(`\n📊 Processed webhooks: ${processedCount}`);
      
      // Check for errors
      const errorCount = await RawWebhook.countDocuments({ 
        error: { $exists: true, $ne: null } 
      });
      console.log(`❌ Failed webhooks: ${errorCount}`);
      
      if (errorCount > 0) {
        const errors = await RawWebhook.find({ 
          error: { $exists: true, $ne: null } 
        }).limit(3);
        
        console.log('\n🔍 Recent errors:');
        errors.forEach(webhook => {
          console.log(`  - ${webhook.provider}: ${webhook.error}`);
        });
      }
      
      console.log('\n✅ Webhook processor test completed successfully!');
      
    } catch (execError) {
      console.error('❌ Processor execution failed:', execError.message);
      throw execError;
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    } catch (closeError) {
      console.error('❌ Error closing connection:', closeError.message);
    }
  }
}

// Run the test
testWebhookProcessor().catch(error => {
  console.error('💥 Test script crashed:', error);
  process.exit(1);
});
