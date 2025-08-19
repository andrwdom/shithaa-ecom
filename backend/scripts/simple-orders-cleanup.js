#!/usr/bin/env node

/**
 * Simple Orders Cleanup Script
 * Just deletes all orders - nothing fancy, just gets the job done
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  console.log('🚀 Simple Orders Cleanup for shithaa.in');
  console.log('========================================');
  
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import order model
    console.log('📦 Loading order model...');
    const { default: orderModel } = await import('../models/orderModel.js');
    
    // Count current orders
    const orderCount = await orderModel.countDocuments();
    console.log(`📊 Found ${orderCount} orders in database`);
    
    if (orderCount === 0) {
      console.log('✅ No orders to delete - database is already clean!');
      return;
    }
    
    // Delete all orders
    console.log('🗑️  Deleting all orders...');
    const result = await orderModel.deleteMany({});
    console.log(`✅ Successfully deleted ${result.deletedCount} orders`);
    
    // Verify deletion
    const newOrderCount = await orderModel.countDocuments();
    console.log(`📊 Orders remaining: ${newOrderCount}`);
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('   Your database is now clean and ready for real customers.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main().catch(console.error);
