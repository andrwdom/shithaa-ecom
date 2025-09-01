// Fix for the reservation index issue
// This script removes the problematic idempotencyKey index that's causing null value conflicts

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixReservationIndex() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('reservations');

    console.log('🔧 Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Check if the problematic index exists
    const idempotencyIndex = indexes.find(idx => idx.name === 'idempotencyKey_1');
    
    if (idempotencyIndex) {
      console.log('🔧 Found problematic idempotencyKey_1 index, removing it...');
      await collection.dropIndex('idempotencyKey_1');
      console.log('✅ Removed idempotencyKey_1 index');
    } else {
      console.log('ℹ️ idempotencyKey_1 index not found, no action needed');
    }

    console.log('🔧 Recreating proper indexes...');
    
    // Create the proper indexes
    await collection.createIndex({ userId: 1, status: 1 });
    await collection.createIndex({ 'items.productId': 1, 'items.size': 1 });
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    console.log('✅ Reservation indexes fixed successfully');
    
  } catch (error) {
    console.error('❌ Error fixing reservation index:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixReservationIndex();
