#!/usr/bin/env node

/**
 * E2E Test Runner Script
 * 
 * This script runs the comprehensive E2E tests for the checkout system
 * including setup, execution, and reporting.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  testResultsDir: 'test-results',
  playwrightConfig: 'playwright.config.ts',
  reportsDir: 'playwright-report',
  timeout: 10 * 60 * 1000, // 10 minutes
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = (message, color = colors.reset) => {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}]${colors.reset} ${message}`);
};

const runCommand = (command, options = {}) => {
  try {
    log(`🚀 Running: ${command}`, colors.blue);
    const result = execSync(command, {
      stdio: 'inherit',
      timeout: options.timeout || CONFIG.timeout,
      cwd: process.cwd(),
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    log(`❌ Command failed: ${command}`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    return { success: false, error };
  }
};

const checkPrerequisites = () => {
  log('🔍 Checking prerequisites...', colors.cyan);
  
  // Check if Playwright is installed
  try {
    require.resolve('@playwright/test');
    log('✅ Playwright is installed', colors.green);
  } catch (error) {
    log('❌ Playwright is not installed. Installing...', colors.yellow);
    runCommand('npm install @playwright/test');
    runCommand('npx playwright install');
  }
  
  // Check if test results directory exists
  if (!fs.existsSync(CONFIG.testResultsDir)) {
    fs.mkdirSync(CONFIG.testResultsDir, { recursive: true });
    log('✅ Created test results directory', colors.green);
  }
  
  // Check if reports directory exists
  if (!fs.existsSync(CONFIG.reportsDir)) {
    fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
    log('✅ Created reports directory', colors.green);
  }
  
  log('✅ Prerequisites check complete', colors.green);
};

const runE2ETests = () => {
  log('🧪 Starting E2E test execution...', colors.magenta);
  
  // Run all E2E tests
  const testResult = runCommand('npx playwright test', {
    timeout: CONFIG.timeout
  });
  
  if (!testResult.success) {
    log('💥 E2E tests failed!', colors.red);
    return false;
  }
  
  log('✅ E2E tests completed successfully', colors.green);
  return true;
};

const generateReport = () => {
  log('📊 Generating test report...', colors.cyan);
  
  try {
    // Generate HTML report
    runCommand('npx playwright show-report');
    
    // Check if results file exists
    const resultsFile = path.join(CONFIG.testResultsDir, 'results.json');
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      log(`📈 Test Summary:`, colors.cyan);
      log(`   Total Tests: ${results.stats.total}`, colors.cyan);
      log(`   Passed: ${results.stats.passed}`, colors.green);
      log(`   Failed: ${results.stats.failed}`, colors.red);
      log(`   Skipped: ${results.stats.skipped}`, colors.yellow);
    }
    
    log('✅ Report generation complete', colors.green);
  } catch (error) {
    log(`⚠️  Report generation encountered issues: ${error.message}`, colors.yellow);
  }
};

const cleanup = () => {
  log('🧹 Cleaning up...', colors.cyan);
  
  try {
    // Clean up temporary files if needed
    log('✅ Cleanup complete', colors.green);
  } catch (error) {
    log(`⚠️  Cleanup encountered issues: ${error.message}`, colors.yellow);
  }
};

const main = async () => {
  log('🎯 E2E Test Runner Starting...', colors.bright + colors.blue);
  
  try {
    // Check prerequisites
    checkPrerequisites();
    
    // Run E2E tests
    const success = runE2ETests();
    
    // Generate report
    generateReport();
    
    // Cleanup
    cleanup();
    
    if (success) {
      log('🎉 E2E Test Run Completed Successfully!', colors.bright + colors.green);
      process.exit(0);
    } else {
      log('💥 E2E Test Run Failed!', colors.bright + colors.red);
      process.exit(1);
    }
    
  } catch (error) {
    log(`💥 Unexpected error: ${error.message}`, colors.bright + colors.red);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { main, runE2ETests, generateReport };
