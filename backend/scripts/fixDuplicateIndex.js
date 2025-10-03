/**
 * Fix Duplicate Index Script
 * Removes the duplicate idempotencyKey index from MongoDB
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db';

async function fixDuplicateIndex() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('rawwebhooks');

    console.log('🔍 Checking existing indexes...');
    const indexes = await collection.indexes();
    
    console.log('📋 Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(index.key)} - ${index.name}`);
    });

    // Find duplicate idempotencyKey indexes
    const idempotencyIndexes = indexes.filter(index => 
      index.key && index.key.idempotencyKey
    );

    if (idempotencyIndexes.length > 1) {
      console.log(`⚠️ Found ${idempotencyIndexes.length} idempotencyKey indexes`);
      
      // Keep the first one, drop the rest
      for (let i = 1; i < idempotencyIndexes.length; i++) {
        const indexToDrop = idempotencyIndexes[i];
        console.log(`🗑️ Dropping duplicate index: ${indexToDrop.name}`);
        await collection.dropIndex(indexToDrop.name);
        console.log(`✅ Dropped index: ${indexToDrop.name}`);
      }
    } else {
      console.log('✅ No duplicate idempotencyKey indexes found');
    }

    console.log('🔍 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(index.key)} - ${index.name}`);
    });

    console.log('✅ Duplicate index fix completed');
    
  } catch (error) {
    console.error('❌ Error fixing duplicate index:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixDuplicateIndex().catch(console.error);
