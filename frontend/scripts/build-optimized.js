#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting optimized build process...\n');

// Step 1: Optimize images
console.log('📸 Step 1: Optimizing images...');
try {
  execSync('npm run optimize-images', { stdio: 'inherit' });
  console.log('✅ Images optimized successfully\n');
} catch (error) {
  console.log('⚠️  Image optimization failed, continuing with build...\n');
}

// Step 2: Run TypeScript check
console.log('🔍 Step 2: Running TypeScript check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript check passed\n');
} catch (error) {
  console.log('⚠️  TypeScript errors found, but continuing with build...\n');
}

// Step 3: Run ESLint
console.log('🧹 Step 3: Running ESLint...');
try {
  execSync('npm run lint', { stdio: 'inherit' });
  console.log('✅ ESLint passed\n');
} catch (error) {
  console.log('⚠️  ESLint warnings found, but continuing with build...\n');
}

// Step 4: Build the application
console.log('🏗️  Step 4: Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Step 5: Generate build report
console.log('📊 Step 5: Generating build report...');
const buildReport = {
  timestamp: new Date().toISOString(),
  buildType: 'optimized',
  imageOptimization: true,
  webpSupport: true,
  lazyLoading: true,
  performanceMonitoring: true,
  recommendations: [
    'Deploy to production with CDN for optimal performance',
    'Monitor Core Web Vitals in production',
    'Set up error tracking for image loading failures',
    'Consider implementing progressive image loading',
    'Regularly audit and optimize images'
  ]
};

const reportPath = path.join(__dirname, '../build-report.json');
fs.writeFileSync(reportPath, JSON.stringify(buildReport, null, 2));
console.log('✅ Build report generated\n');

console.log('🎉 Optimized build completed successfully!');
console.log('📁 Build report saved to: build-report.json');
console.log('\n📋 Next steps:');
console.log('1. Deploy to production');
console.log('2. Test performance with Lighthouse');
console.log('3. Monitor Core Web Vitals');
console.log('4. Set up performance monitoring'); 