import mongoose from 'mongoose';
import { config } from '../config.js';

/**
 * Create all required indexes for idempotent processing and performance
 */

async function createIndexes() {
  try {
    await mongoose.connect(config.mongodb_uri);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // 1. ProcessedEvents collection indexes
    console.log('📋 Creating ProcessedEvents indexes...');
    
    await db.collection('processedevent').createIndex(
      { eventId: 1 }, 
      { unique: true, name: 'eventId_unique' }
    );
    
    await db.collection('processedevent').createIndex(
      { paymentId: 1 }, 
      { name: 'paymentId_index' }
    );
    
    await db.collection('processedevent').createIndex(
      { provider: 1, status: 1 }, 
      { name: 'provider_status_index' }
    );
    
    await db.collection('processedevent').createIndex(
      { processedAt: 1 }, 
      { expireAfterSeconds: 2592000, name: 'processedAt_ttl' } // 30 days
    );
    
    // 2. RawWebhook collection indexes
    console.log('📋 Creating RawWebhook indexes...');
    
    await db.collection('rawwebhook').createIndex(
      { eventId: 1 }, 
      { unique: true, name: 'eventId_unique' }
    );
    
    await db.collection('rawwebhook').createIndex(
      { processed: 1, processing: 1, receivedAt: 1 }, 
      { name: 'processing_status_index' }
    );
    
    await db.collection('rawwebhook').createIndex(
      { provider: 1, receivedAt: 1 }, 
      { name: 'provider_received_index' }
    );
    
    await db.collection('rawwebhook').createIndex(
      { receivedAt: 1 }, 
      { expireAfterSeconds: 172800, name: 'receivedAt_ttl' } // 48 hours
    );
    
    // 3. Orders collection indexes
    console.log('📋 Creating Orders indexes...');
    
    await db.collection('orders').createIndex(
      { 'payment.paymentId': 1 }, 
      { unique: true, sparse: true, name: 'paymentId_unique' }
    );
    
    await db.collection('orders').createIndex(
      { orderId: 1 }, 
      { unique: true, name: 'orderId_unique' }
    );
    
    await db.collection('orders').createIndex(
      { status: 1, createdAt: 1 }, 
      { name: 'status_created_index' }
    );
    
    await db.collection('orders').createIndex(
      { 'payment.gateway_txn_id': 1 }, 
      { unique: true, sparse: true, name: 'gateway_txn_id_unique' }
    );
    
    await db.collection('orders').createIndex(
      { idempotencyKey: 1 }, 
      { unique: true, sparse: true, name: 'idempotencyKey_unique' }
    );
    
    // 4. Products collection indexes
    console.log('📋 Creating Products indexes...');
    
    await db.collection('products').createIndex(
      { customId: 1 }, 
      { name: 'customId_index' }
    );
    
    await db.collection('products').createIndex(
      { categorySlug: 1 }, 
      { name: 'categorySlug_index' }
    );
    
    await db.collection('products').createIndex(
      { 'sizes.size': 1 }, 
      { name: 'sizes_size_index' }
    );
    
    await db.collection('products').createIndex(
      { price: 1 }, 
      { name: 'price_index' }
    );
    
    await db.collection('products').createIndex(
      { categorySlug: 1, price: 1 }, 
      { name: 'category_price_compound' }
    );
    
    await db.collection('products').createIndex(
      { 'sizes.availableStock': 1 }, 
      { name: 'availableStock_index' }
    );
    
    // 5. CheckoutSessions collection indexes
    console.log('📋 Creating CheckoutSessions indexes...');
    
    await db.collection('checkoutsessions').createIndex(
      { sessionId: 1 }, 
      { unique: true, name: 'sessionId_unique' }
    );
    
    await db.collection('checkoutsessions').createIndex(
      { expiresAt: 1 }, 
      { expireAfterSeconds: 0, name: 'expiresAt_ttl' }
    );
    
    await db.collection('checkoutsessions').createIndex(
      { status: 1, createdAt: 1 }, 
      { name: 'status_created_index' }
    );
    
    console.log('✅ All indexes created successfully');
    
    // 6. Show index statistics
    console.log('\n📊 Index Statistics:');
    
    const collections = ['processedevent', 'rawwebhook', 'orders', 'products', 'checkoutsessions'];
    
    for (const collectionName of collections) {
      try {
        const stats = await db.collection(collectionName).indexes();
        console.log(`\n${collectionName}:`);
        stats.forEach(index => {
          console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
      } catch (error) {
        console.log(`  - Collection ${collectionName} not found or no indexes`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createIndexes().catch(console.error);
}

export default createIndexes;
