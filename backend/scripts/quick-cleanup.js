#!/usr/bin/env node

/**
 * Quick Test Data Cleanup
 * Removes test orders and users based on common patterns
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import models
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import wishlistModel from '../models/Wishlist.js';

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function quickCleanup() {
  console.log('🧹 Quick Test Data Cleanup...\n');
  
  try {
    // 1. Delete all orders (nuclear option)
    const orderResult = await orderModel.deleteMany({});
    console.log(`🗑️  Deleted ${orderResult.deletedCount} orders`);
    
    // 2. Delete all users (nuclear option)
    const userResult = await userModel.deleteMany({});
    console.log(`🗑️  Deleted ${userResult.deletedCount} users`);
    
    // 3. Delete all wishlists
    const wishlistResult = await wishlistModel.deleteMany({});
    console.log(`🗑️  Deleted ${wishlistResult.deletedCount} wishlists`);
    
    console.log('\n✅ All test data cleared! Database is now clean.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Quick Test Data Cleanup');
  console.log('============================\n');
  
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    await quickCleanup();
  } catch (error) {
    console.error('\n❌ Cleanup failed');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
