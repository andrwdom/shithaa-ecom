// Test PM2 configuration
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing PM2 Configuration...');
console.log('Current directory:', process.cwd());

// Check if ecosystem files exist
const ecosystemFiles = [
  'ecosystem.config.js',
  'ecosystem-production.config.js'
];

ecosystemFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Found: ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
  }
});

// Check if script files exist
const scriptFiles = [
  'backend/server.js',
  'backend/workers/stockMonitoringWorker.js',
  'backend/workers/stockCleanupWorker.js',
  'backend/workers/reservationExpiryWorker.js',
  'backend/jobs/processRawWebhooks.js'
];

scriptFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Found: ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
  }
});

// Check if directories exist
const directories = [
  'backend',
  'frontend',
  'admin',
  'backend/logs',
  'frontend/logs',
  'admin/logs'
];

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ Directory exists: ${dir}`);
  } else {
    console.log(`❌ Directory missing: ${dir}`);
  }
});

console.log('\n🔧 PM2 Configuration Test Complete');
