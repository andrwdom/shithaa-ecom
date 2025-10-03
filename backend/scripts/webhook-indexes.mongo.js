// MongoDB Shell Script for Webhook Idempotency Indexes
// Run with: mongo shitha_maternity_db webhook-indexes.mongo.js

print("🔧 Creating webhook idempotency indexes...");

// Switch to the correct database
use shitha_maternity_db;

// 1. Create unique index on WebhookEvent.eventId (idempotency key)
print("📝 Creating unique index on webhookevents.eventId...");
try {
  db.webhookevents.createIndex(
    { eventId: 1 }, 
    { 
      unique: true, 
      background: true,
      name: "eventId_unique_idx"
    }
  );
  print("✅ Unique index created on webhookevents.eventId");
} catch (error) {
  print("⚠️  Index on webhookevents.eventId already exists or error: " + error);
}

// 2. Create index on WebhookEvent.receivedAt for time-based queries
print("📝 Creating index on webhookevents.receivedAt...");
try {
  db.webhookevents.createIndex(
    { receivedAt: -1 }, 
    { 
      background: true,
      name: "receivedAt_desc_idx"
    }
  );
  print("✅ Index created on webhookevents.receivedAt");
} catch (error) {
  print("⚠️  Index on webhookevents.receivedAt already exists or error: " + error);
}

// 3. Create compound index on WebhookEvent.status and receivedAt
print("📝 Creating compound index on webhookevents.status and receivedAt...");
try {
  db.webhookevents.createIndex(
    { status: 1, receivedAt: -1 }, 
    { 
      background: true,
      name: "status_receivedAt_compound_idx"
    }
  );
  print("✅ Compound index created on webhookevents.status and receivedAt");
} catch (error) {
  print("⚠️  Compound index already exists or error: " + error);
}

// 4. Create unique index on RawWebhook.idempotencyKey
print("📝 Creating unique index on rawwebhooks.idempotencyKey...");
try {
  db.rawwebhooks.createIndex(
    { idempotencyKey: 1 }, 
    { 
      unique: true, 
      background: true,
      name: "idempotencyKey_unique_idx",
      sparse: true // Only index documents that have this field
    }
  );
  print("✅ Unique index created on rawwebhooks.idempotencyKey");
} catch (error) {
  print("⚠️  Index on rawwebhooks.idempotencyKey already exists or error: " + error);
}

// 5. Create index on RawWebhook.orderId for order lookups
print("📝 Creating index on rawwebhooks.orderId...");
try {
  db.rawwebhooks.createIndex(
    { orderId: 1 }, 
    { 
      background: true,
      name: "orderId_idx",
      sparse: true
    }
  );
  print("✅ Index created on rawwebhooks.orderId");
} catch (error) {
  print("⚠️  Index on rawwebhooks.orderId already exists or error: " + error);
}

// 6. Create compound index on RawWebhook.processed and receivedAt
print("📝 Creating compound index on rawwebhooks.processed and receivedAt...");
try {
  db.rawwebhooks.createIndex(
    { processed: 1, receivedAt: -1 }, 
    { 
      background: true,
      name: "processed_receivedAt_compound_idx"
    }
  );
  print("✅ Compound index created on rawwebhooks.processed and receivedAt");
} catch (error) {
  print("⚠️  Compound index already exists or error: " + error);
}

// 7. Create index on orders.phonepeTransactionId
print("📝 Creating index on orders.phonepeTransactionId...");
try {
  db.orders.createIndex(
    { phonepeTransactionId: 1 }, 
    { 
      background: true,
      name: "phonepeTransactionId_idx",
      sparse: true
    }
  );
  print("✅ Index created on orders.phonepeTransactionId");
} catch (error) {
  print("⚠️  Index on orders.phonepeTransactionId already exists or error: " + error);
}

// List all indexes for verification
print("\n📋 Verifying created indexes...");

print("\n🔍 WebhookEvent indexes:");
db.webhookevents.getIndexes().forEach(function(index) {
  print("  - " + index.name + ": " + JSON.stringify(index.key));
});

print("\n🔍 RawWebhook indexes:");
db.rawwebhooks.getIndexes().forEach(function(index) {
  print("  - " + index.name + ": " + JSON.stringify(index.key));
});

print("\n🔍 Order indexes:");
db.orders.getIndexes().forEach(function(index) {
  print("  - " + index.name + ": " + JSON.stringify(index.key));
});

print("\n🎉 Webhook idempotency indexes setup complete!");
print("\n📝 Summary of created indexes:");
print("  ✅ webhookevents.eventId (unique) - prevents duplicate webhook processing");
print("  ✅ webhookevents.receivedAt - enables time-based queries");
print("  ✅ webhookevents.status + receivedAt - enables status filtering with time sorting");
print("  ✅ rawwebhooks.idempotencyKey (unique, sparse) - prevents duplicate raw webhook storage");
print("  ✅ rawwebhooks.orderId (sparse) - enables order-based webhook lookups");
print("  ✅ rawwebhooks.processed + receivedAt - enables failed webhook queries");
print("  ✅ orders.phonepeTransactionId (sparse) - enables webhook-to-order mapping");
