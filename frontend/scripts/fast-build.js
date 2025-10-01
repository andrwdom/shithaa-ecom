#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized build process...');

// Set environment variables for faster builds
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.SKIP_ENV_VALIDATION = 'true';

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('.next')) {
    execSync('rm -rf .next', { stdio: 'inherit' });
  }
} catch (error) {
  console.log('Note: Could not clean .next directory');
}

// Install dependencies if needed
console.log('📦 Checking dependencies...');
try {
  execSync('npm ci --prefer-offline --no-audit --no-fund', { stdio: 'inherit' });
} catch (error) {
  console.log('Installing dependencies...');
  execSync('npm install --prefer-offline --no-audit --no-fund', { stdio: 'inherit' });
}

// Build with optimizations
console.log('🔨 Building with optimizations...');
const buildCommand = [
  'NODE_ENV=production',
  'NEXT_TELEMETRY_DISABLED=1',
  'SKIP_ENV_VALIDATION=true',
  'npm run build'
].join(' ');

try {
  execSync(buildCommand, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      SKIP_ENV_VALIDATION: 'true'
    }
  });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
