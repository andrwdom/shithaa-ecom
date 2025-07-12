const fs = require('fs');
const path = require('path');

// Performance audit script for Shinthaa frontend
function auditPerformance() {
  console.log('🔍 Shinthaa Performance Audit\n');
  
  const issues = [];
  const recommendations = [];
  
  // Check for common performance issues
  console.log('1. Checking for "use client" usage...');
  const clientComponents = findClientComponents();
  if (clientComponents.length > 0) {
    issues.push(`Found ${clientComponents.length} client components that could potentially be server components`);
    recommendations.push('Consider converting non-interactive components to server components');
  }
  
  console.log('2. Checking for image optimization...');
  const imageIssues = checkImageOptimization();
  if (imageIssues.length > 0) {
    issues.push(...imageIssues);
    recommendations.push('Ensure all images use Next.js Image component with proper sizing');
  }
  
  console.log('3. Checking for font loading...');
  const fontIssues = checkFontLoading();
  if (fontIssues.length > 0) {
    issues.push(...fontIssues);
    recommendations.push('Ensure fonts are properly loaded with display: swap');
  }
  
  console.log('4. Checking for bundle size...');
  const bundleIssues = checkBundleSize();
  if (bundleIssues.length > 0) {
    issues.push(...bundleIssues);
    recommendations.push('Consider code splitting and dynamic imports for large components');
  }
  
  // Print results
  console.log('\n📊 Audit Results:');
  console.log('==================');
  
  if (issues.length === 0) {
    console.log('✅ No major performance issues found!');
  } else {
    console.log(`⚠️  Found ${issues.length} potential issues:`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n🎯 Web Vitals Targets:');
  console.log('   • LCP (Largest Contentful Paint): < 2.5s');
  console.log('   • FID (First Input Delay): < 100ms');
  console.log('   • CLS (Cumulative Layout Shift): < 0.1');
  
  console.log('\n📈 Next Steps:');
  console.log('   1. Run Lighthouse audit in Chrome DevTools');
  console.log('   2. Test on mobile devices');
  console.log('   3. Monitor Core Web Vitals in Google Search Console');
  console.log('   4. Use Next.js Analytics for real user metrics');
}

function findClientComponents() {
  const clientComponents = [];
  const componentsDir = path.join(__dirname, '../components');
  
  if (fs.existsSync(componentsDir)) {
    const files = fs.readdirSync(componentsDir, { recursive: true });
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const filePath = path.join(componentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('"use client"') || content.includes("'use client'")) {
          clientComponents.push(file);
        }
      }
    });
  }
  
  return clientComponents;
}

function checkImageOptimization() {
  const issues = [];
  const componentsDir = path.join(__dirname, '../components');
  
  if (fs.existsSync(componentsDir)) {
    const files = fs.readdirSync(componentsDir, { recursive: true });
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const filePath = path.join(componentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for regular img tags instead of Next.js Image
        if (content.includes('<img') && !content.includes('next/image')) {
          issues.push(`Found regular img tag in ${file} - should use Next.js Image component`);
        }
        
        // Check for missing alt attributes
        if (content.includes('<img') && !content.includes('alt=')) {
          issues.push(`Found img tag without alt attribute in ${file}`);
        }
      }
    });
  }
  
  return issues;
}

function checkFontLoading() {
  const issues = [];
  const layoutFile = path.join(__dirname, '../app/layout.tsx');
  
  if (fs.existsSync(layoutFile)) {
    const content = fs.readFileSync(layoutFile, 'utf8');
    
    // Check if fonts are properly configured
    if (!content.includes('display: "swap"')) {
      issues.push('Fonts should use display: swap for better performance');
    }
    
    if (!content.includes('next/font')) {
      issues.push('Consider using Next.js font optimization');
    }
  }
  
  return issues;
}

function checkBundleSize() {
  const issues = [];
  const componentsDir = path.join(__dirname, '../components');
  
  if (fs.existsSync(componentsDir)) {
    const files = fs.readdirSync(componentsDir, { recursive: true });
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const filePath = path.join(componentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for large imports
        if (content.includes('import * as') || content.includes('import {') && content.split('import {')[0].length > 200) {
          issues.push(`Large import in ${file} - consider selective imports`);
        }
      }
    });
  }
  
  return issues;
}

// Run audit if this script is executed directly
if (require.main === module) {
  auditPerformance();
}

module.exports = { auditPerformance }; 