// Test to check what code is actually running
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking current stock.js code...');

const stockPath = '/var/www/shithaa-ecom/backend/utils/stock.js';

if (fs.existsSync(stockPath)) {
    const content = fs.readFileSync(stockPath, 'utf8');
    
    // Check for old transaction code
    if (content.includes('abortTransaction')) {
        console.log('❌ OLD CODE DETECTED: Still has abortTransaction calls');
    } else {
        console.log('✅ NEW CODE DETECTED: No abortTransaction calls found');
    }
    
    // Check for new non-transactional code
    if (content.includes('🔄 Starting batch reservation for')) {
        console.log('✅ NEW CODE DETECTED: Has new batch reservation log message');
    } else {
        console.log('❌ OLD CODE DETECTED: Missing new batch reservation log message');
    }
    
    // Check line count
    const lines = content.split('\n').length;
    console.log(`📊 File has ${lines} lines`);
    
    // Show the atomicBatchReservation function
    const match = content.match(/export async function atomicBatchReservation\([^}]+}/s);
    if (match) {
        console.log('🔍 atomicBatchReservation function found:');
        console.log(match[0].substring(0, 200) + '...');
    }
} else {
    console.log('❌ File not found at:', stockPath);
}

