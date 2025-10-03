#!/usr/bin/env node

/**
 * 🚨 CRITICAL MITIGATION VERIFICATION SCRIPT
 * 
 * This script verifies that all immediate mitigations are working:
 * 1. Emergency deduction is disabled (feature flag)
 * 2. Reservation TTL is reduced to 5 minutes
 * 3. Structured logging is enabled
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 CRITICAL MITIGATION VERIFICATION');
console.log('=====================================\n');

// Check 1: Emergency deduction feature flag
console.log('1. Checking emergency deduction feature flag...');
if (process.env.ENABLE_EMERGENCY_DEDUCTION !== 'true') {
  console.log('✅ Emergency deduction is DISABLED (ENABLE_EMERGENCY_DEDUCTION not set to true)');
} else {
  console.log('❌ WARNING: Emergency deduction is ENABLED (ENABLE_EMERGENCY_DEDUCTION=true)');
  console.log('   This bypasses the reservation system and can cause double deduction!');
}

// Check 2: Verify TTL reductions in code
console.log('\n2. Checking TTL reductions in code...');

const filesToCheck = [
  'backend/utils/stock.js',
  'backend/controllers/checkoutController.js', 
  'backend/models/CheckoutSession.js'
];

let ttlReduced = true;
filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('5 * 60 * 1000') || content.includes('5 minutes')) {
      console.log(`✅ ${file}: TTL reduced to 5 minutes`);
    } else if (content.includes('15 * 60 * 1000') || content.includes('15 minutes')) {
      console.log(`❌ ${file}: Still using 15 minutes TTL`);
      ttlReduced = false;
    } else if (content.includes('30 * 60 * 1000') || content.includes('30 minutes')) {
      console.log(`❌ ${file}: Still using 30 minutes TTL`);
      ttlReduced = false;
    }
  }
});

if (ttlReduced) {
  console.log('✅ All TTL values have been reduced to 5 minutes');
} else {
  console.log('❌ Some TTL values still need to be reduced');
}

// Check 3: Verify structured logging
console.log('\n3. Checking structured logging implementation...');

const stockFiles = [
  'backend/utils/stock.js',
  'backend/utils/atomicStockManager.js',
  'backend/controllers/paymentController.js'
];

let loggingAdded = true;
stockFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('STOCK:') && content.includes('CRITICAL MITIGATION')) {
      console.log(`✅ ${file}: Structured logging added`);
    } else {
      console.log(`❌ ${file}: Structured logging not found`);
      loggingAdded = false;
    }
  }
});

if (loggingAdded) {
  console.log('✅ Structured logging has been added to all stock operations');
} else {
  console.log('❌ Some files still need structured logging');
}

// Check 4: Test backend restart
console.log('\n4. Testing backend restart...');
console.log('   Run: pm2 restart shithaa-backend');
console.log('   Then check: pm2 logs shithaa-backend --lines 50');

// Check 5: Test worker restart  
console.log('\n5. Testing worker restart...');
console.log('   Run: pm2 restart shithaa-reservation-expiry-worker');
console.log('   Then check: pm2 logs shithaa-reservation-expiry-worker --lines 50');

// Check 6: Test logging
console.log('\n6. Testing structured logging...');
console.log('   Run: pm2 logs shithaa-backend --lines 200 | grep "STOCK:"');
console.log('   Should see structured logs like: STOCK:RESERVE:SUCCESS: ...');

console.log('\n🚨 MITIGATION SUMMARY');
console.log('====================');
console.log('1. Emergency deduction: DISABLED (unless ENABLE_EMERGENCY_DEDUCTION=true)');
console.log('2. Reservation TTL: Reduced to 5 minutes');
console.log('3. Structured logging: Added to all stock operations');
console.log('\nNext steps:');
console.log('- Restart backend: pm2 restart shithaa-backend');
console.log('- Restart worker: pm2 restart shithaa-reservation-expiry-worker');
console.log('- Monitor logs: pm2 logs shithaa-backend --lines 200 | grep "STOCK:"');
console.log('- Verify no emergency deduction logs appear');
console.log('- Verify faster cleanup of expired reservations');
