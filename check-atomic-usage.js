#!/usr/bin/env node

/**
 * CHECK ATOMIC USAGE
 * 
 * This script checks if the atomic operations are being used
 * by examining the backend code and logs.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CHECKING ATOMIC OPERATIONS USAGE');
console.log('===================================');

// Check if atomic operations file exists
const atomicFile = 'backend/utils/atomicStockOperations.js';
if (fs.existsSync(atomicFile)) {
  console.log('✅ Atomic operations file exists');
} else {
  console.log('❌ Atomic operations file not found');
  process.exit(1);
}

// Check if stock.js imports atomic operations
const stockFile = 'backend/utils/stock.js';
if (fs.existsSync(stockFile)) {
  const stockContent = fs.readFileSync(stockFile, 'utf8');
  if (stockContent.includes('reserveStockAtomic')) {
    console.log('✅ stock.js imports atomic operations');
  } else {
    console.log('❌ stock.js does not import atomic operations');
  }
} else {
  console.log('❌ stock.js file not found');
}

// Check if atomic stock manager uses atomic operations
const atomicManagerFile = 'backend/utils/atomicStockManager.js';
if (fs.existsSync(atomicManagerFile)) {
  const managerContent = fs.readFileSync(atomicManagerFile, 'utf8');
  if (managerContent.includes('deductStockAtomic')) {
    console.log('✅ atomicStockManager.js uses atomic operations');
  } else {
    console.log('❌ atomicStockManager.js does not use atomic operations');
  }
} else {
  console.log('❌ atomicStockManager.js file not found');
}

// Check if orderCommit.js uses atomic operations
const orderCommitFile = 'backend/services/orderCommit.js';
if (fs.existsSync(orderCommitFile)) {
  const commitContent = fs.readFileSync(orderCommitFile, 'utf8');
  if (commitContent.includes('deductStockAtomic')) {
    console.log('✅ orderCommit.js uses atomic operations');
  } else {
    console.log('❌ orderCommit.js does not use atomic operations');
  }
} else {
  console.log('❌ orderCommit.js file not found');
}

console.log('\n📊 SUMMARY');
console.log('==========');
console.log('If all checks show ✅, the atomic operations are properly integrated.');
console.log('If any show ❌, there may be integration issues.');
console.log('');
console.log('Next steps:');
console.log('1. Run: node test-simple-checkout.js');
console.log('2. Check logs: pm2 logs shithaa-backend --lines 100 | grep "STOCK:"');
console.log('3. Look for atomic operation logs like: STOCK:RESERVE:ATOMIC:SUCCESS');
