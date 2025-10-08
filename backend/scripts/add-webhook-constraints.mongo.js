// MongoDB Script: Add Webhook Security Constraints
// Run this script to add proper indices and constraints for webhook security
// Usage: mongosh mongodb://localhost:27017/shithaa_maternity_db add-webhook-constraints.mongo.js

print('🔧 Adding webhook security constraints...');

// Switch to database
db = db.getSiblingDB('shithaa_maternity_db');

// Create unique index on WebhookEvent.eventId with validation
try {
  db.webhookevents.createIndex(
    { eventId: 1 },
    { 
      unique: true,
      name: 'idx_webhook_eventid_unique',
      background: false
    }
  );
  print('✅ Created unique index on webhookevents.eventId');
} catch (e) {
  print('⚠️ Index already exists: idx_webhook_eventid_unique');
}

// Create compound index for webhook processing status
try {
  db.webhookevents.createIndex(
    { status: 1, receivedAt: -1 },
    { 
      name: 'idx_webhook_status_received',
      background: true
    }
  );
  print('✅ Created compound index on webhookevents.status+receivedAt');
} catch (e) {
  print('⚠️ Index already exists: idx_webhook_status_received');
}

// Create TTL index to auto-delete processed webhooks after 90 days
try {
  db.webhookevents.createIndex(
    { processedAt: 1 },
    { 
      expireAfterSeconds: 7776000, // 90 days
      name: 'idx_webhook_ttl',
      partialFilterExpression: { status: 'processed' }
    }
  );
  print('✅ Created TTL index on webhookevents.processedAt (90 day expiry)');
} catch (e) {
  print('⚠️ Index already exists: idx_webhook_ttl');
}

// Add unique constraint on orders phonepeTransactionId
try {
  db.orders.createIndex(
    { phonepeTransactionId: 1 },
    { 
      unique: true,
      sparse: true, // Allow null values
      name: 'idx_order_phonepe_txn_unique',
      background: false
    }
  );
  print('✅ Created unique index on orders.phonepeTransactionId');
} catch (e) {
  print('⚠️ Index already exists: idx_order_phonepe_txn_unique');
}

// Create compound index for order reconciliation
try {
  db.orders.createIndex(
    { status: 1, paymentStatus: 1, createdAt: -1 },
    { 
      name: 'idx_order_reconciliation',
      background: true
    }
  );
  print('✅ Created compound index for order reconciliation');
} catch (e) {
  print('⚠️ Index already exists: idx_order_reconciliation');
}

// Create index for draft order cleanup
try {
  db.orders.createIndex(
    { status: 1, createdAt: 1 },
    {
      name: 'idx_order_draft_cleanup',
      partialFilterExpression: { status: 'DRAFT' },
      background: true
    }
  );
  print('✅ Created index for draft order cleanup');
} catch (e) {
  print('⚠️ Index already exists: idx_order_draft_cleanup');
}

// List all indices
print('\n📊 Current indices on webhookevents:');
db.webhookevents.getIndexes().forEach(idx => {
  print(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
});

print('\n📊 Current indices on orders:');
db.orders.getIndexes().forEach(idx => {
  print(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
});

// Check for duplicate orders (should be 0 after unique index)
const duplicates = db.orders.aggregate([
  { $match: { phonepeTransactionId: { $ne: null } } },
  { $group: { 
    _id: '$phonepeTransactionId', 
    count: { $sum: 1 },
    ids: { $push: '$_id' }
  }},
  { $match: { count: { $gt: 1 } }}
]).toArray();

if (duplicates.length > 0) {
  print(`\n⚠️ WARNING: Found ${duplicates.length} duplicate phonepeTransactionId entries`);
  print('   Manual intervention required to clean up before unique index can be enforced');
  duplicates.slice(0, 5).forEach(dup => {
    print(`   - ${dup._id}: ${dup.count} orders`);
  });
} else {
  print('\n✅ No duplicate phonepeTransactionId entries found');
}

print('\n✅ Webhook security constraints setup complete!');

