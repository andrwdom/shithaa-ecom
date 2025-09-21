#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const clearReservedStock = async () => {
  try {
    console.log('🧹 Clearing all reserved stock...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Clear all reserved stock
    const result = await db.collection('products').updateMany(
      {},
      { $unset: { 'sizes.$[].reserved': '' } }
    );
    
    console.log('✅ Cleared reserved stock for', result.modifiedCount, 'products');
    
    // Also set reserved to 0 for any remaining
    const result2 = await db.collection('products').updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    
    console.log('✅ Set reserved to 0 for', result2.modifiedCount, 'products');
    
    console.log('🎉 Stock clearing completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

clearReservedStock();
