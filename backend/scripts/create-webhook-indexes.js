#!/usr/bin/env node

/**
 * MongoDB Index Creation Script for Webhook Idempotency
 * 
 * This script creates the necessary indexes for webhook idempotency and performance
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db';

async function createWebhookIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Create unique index on WebhookEvent.eventId (idempotency key)
    console.log('📝 Creating unique index on webhookevents.eventId...');
    try {
      await db.collection('webhookevents').createIndex(
        { eventId: 1 }, 
        { 
          unique: true, 
          background: true,
          name: 'eventId_unique_idx'
        }
      );
      console.log('✅ Unique index created on webhookevents.eventId');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Index on webhookevents.eventId already exists');
      } else {
        console.error('❌ Error creating eventId index:', error.message);
      }
    }

    // 2. Create index on WebhookEvent.receivedAt for time-based queries
    console.log('📝 Creating index on webhookevents.receivedAt...');
    try {
      await db.collection('webhookevents').createIndex(
        { receivedAt: -1 }, 
        { 
          background: true,
          name: 'receivedAt_desc_idx'
        }
      );
      console.log('✅ Index created on webhookevents.receivedAt');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Index on webhookevents.receivedAt already exists');
      } else {
        console.error('❌ Error creating receivedAt index:', error.message);
      }
    }

    // 3. Create compound index on WebhookEvent.status and receivedAt
    console.log('📝 Creating compound index on webhookevents.status and receivedAt...');
    try {
      await db.collection('webhookevents').createIndex(
        { status: 1, receivedAt: -1 }, 
        { 
          background: true,
          name: 'status_receivedAt_compound_idx'
        }
      );
      console.log('✅ Compound index created on webhookevents.status and receivedAt');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Compound index on webhookevents.status and receivedAt already exists');
      } else {
        console.error('❌ Error creating compound index:', error.message);
      }
    }

    // 4. Create unique index on RawWebhook.idempotencyKey (if field exists)
    console.log('📝 Creating unique index on rawwebhooks.idempotencyKey...');
    try {
      await db.collection('rawwebhooks').createIndex(
        { idempotencyKey: 1 }, 
        { 
          unique: true, 
          background: true,
          name: 'idempotencyKey_unique_idx',
          sparse: true // Only index documents that have this field
        }
      );
      console.log('✅ Unique index created on rawwebhooks.idempotencyKey');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Index on rawwebhooks.idempotencyKey already exists');
      } else {
        console.error('❌ Error creating idempotencyKey index:', error.message);
      }
    }

    // 5. Create index on RawWebhook.orderId for order lookups
    console.log('📝 Creating index on rawwebhooks.orderId...');
    try {
      await db.collection('rawwebhooks').createIndex(
        { orderId: 1 }, 
        { 
          background: true,
          name: 'orderId_idx',
          sparse: true
        }
      );
      console.log('✅ Index created on rawwebhooks.orderId');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Index on rawwebhooks.orderId already exists');
      } else {
        console.error('❌ Error creating orderId index:', error.message);
      }
    }

    // 6. Create index on RawWebhook.processed and receivedAt for failed webhook queries
    console.log('📝 Creating compound index on rawwebhooks.processed and receivedAt...');
    try {
      await db.collection('rawwebhooks').createIndex(
        { processed: 1, receivedAt: -1 }, 
        { 
          background: true,
          name: 'processed_receivedAt_compound_idx'
        }
      );
      console.log('✅ Compound index created on rawwebhooks.processed and receivedAt');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Compound index on rawwebhooks.processed and receivedAt already exists');
      } else {
        console.error('❌ Error creating processed compound index:', error.message);
      }
    }

    // 7. Create index on orders.phonepeTransactionId for webhook order lookups
    console.log('📝 Creating index on orders.phonepeTransactionId...');
    try {
      await db.collection('orders').createIndex(
        { phonepeTransactionId: 1 }, 
        { 
          background: true,
          name: 'phonepeTransactionId_idx',
          sparse: true
        }
      );
      console.log('✅ Index created on orders.phonepeTransactionId');
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Index on orders.phonepeTransactionId already exists');
      } else {
        console.error('❌ Error creating phonepeTransactionId index:', error.message);
      }
    }

    // List all indexes for verification
    console.log('\n📋 Verifying created indexes...');
    
    const webhookEventIndexes = await db.collection('webhookevents').indexes();
    console.log('\n🔍 WebhookEvent indexes:');
    webhookEventIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    const rawWebhookIndexes = await db.collection('rawwebhooks').indexes();
    console.log('\n🔍 RawWebhook indexes:');
    rawWebhookIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    const orderIndexes = await db.collection('orders').indexes();
    console.log('\n🔍 Order indexes:');
    orderIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n🎉 All webhook idempotency indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createWebhookIndexes().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});
