#!/usr/bin/env node

/**
 * Test Imports Script
 * This script tests if all required models can be imported correctly
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

console.log('🧪 Testing model imports...');

try {
  // Test importing models
  console.log('📦 Importing orderModel...');
  const orderModel = await import('../models/orderModel.js');
  console.log('✅ orderModel imported successfully');
  
  console.log('👤 Importing userModel...');
  const userModel = await import('../models/userModel.js');
  console.log('✅ userModel imported successfully');
  
  console.log('❤️ Importing Wishlist...');
  const wishlistModel = await import('../models/Wishlist.js');
  console.log('✅ Wishlist imported successfully');
  
  console.log('\n🎉 All imports successful! Script is ready to run.');
  
} catch (error) {
  console.error('❌ Import failed:', error.message);
  process.exit(1);
}
