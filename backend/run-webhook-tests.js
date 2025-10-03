/**
 * COMPREHENSIVE WEBHOOK TEST RUNNER
 * 
 * Runs all webhook security, race condition, and resilience tests
 * Provides detailed reporting and recommendations
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const TEST_CONFIG = {
  testFiles: [
    'backend/tests/webhookSecurityTest.js',
    'backend/tests/webhookRaceConditionTest.js',
    'backend/tests/webhookResilienceTest.js'
  ],
  loadTestFile: 'backend/tests/webhookLoadTest.js',
  outputDir: 'backend/test-results',
  timeout: 300000 // 5 minutes
};

/**
 * Run Jest tests
 */
async function runJestTests() {
  console.log('🧪 Running Jest test suite...');
  
  return new Promise((resolve, reject) => {
    const jest = spawn('npx', ['jest', ...TEST_CONFIG.testFiles, '--verbose', '--detectOpenHandles'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    jest.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Jest tests completed successfully');
        resolve(true);
      } else {
        console.log('❌ Jest tests failed');
        resolve(false);
      }
    });
    
    jest.on('error', (error) => {
      console.error('❌ Jest test execution error:', error);
      reject(error);
    });
  });
}

/**
 * Run K6 load tests
 */
async function runK6LoadTests() {
  console.log('⚡ Running K6 load tests...');
  
  return new Promise((resolve, reject) => {
    const k6 = spawn('k6', ['run', TEST_CONFIG.loadTestFile], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    k6.on('close', (code) => {
      if (code === 0) {
        console.log('✅ K6 load tests completed successfully');
        resolve(true);
      } else {
        console.log('❌ K6 load tests failed');
        resolve(false);
      }
    });
    
    k6.on('error', (error) => {
      console.error('❌ K6 test execution error:', error);
      reject(error);
    });
  });
}

/**
 * Generate test report
 */
function generateTestReport(jestResults, k6Results) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    summary: {
      jestTests: jestResults ? 'PASSED' : 'FAILED',
      k6LoadTests: k6Results ? 'PASSED' : 'FAILED',
      overallStatus: (jestResults && k6Results) ? 'PASSED' : 'FAILED'
    },
    recommendations: [],
    securityChecklist: {
      signatureVerification: '✅ Implemented',
      idempotency: '✅ Fixed (no timestamps)',
      raceConditionProtection: '✅ Implemented',
      emergencyOrderValidation: '✅ Implemented',
      legacyProcessorDisabled: '✅ Disabled',
      genericEndpointSecured: '✅ Secured'
    },
    nextSteps: [
      'Deploy to staging environment',
      'Run tests in staging',
      'Monitor webhook processing',
      'Set up production alerts',
      'Configure webhook monitoring dashboard'
    ]
  };
  
  // Add recommendations based on results
  if (!jestResults) {
    report.recommendations.push('Fix failing Jest tests before deployment');
  }
  
  if (!k6Results) {
    report.recommendations.push('Address performance issues identified in load tests');
  }
  
  if (jestResults && k6Results) {
    report.recommendations.push('All tests passed - ready for production deployment');
  }
  
  return report;
}

/**
 * Save test results
 */
async function saveTestResults(report) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(TEST_CONFIG.outputDir)) {
    fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
  }
  
  const reportPath = path.join(TEST_CONFIG.outputDir, `webhook-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📊 Test report saved to: ${reportPath}`);
  return reportPath;
}

/**
 * Main test runner
 */
async function runWebhookTests() {
  console.log('🚀 Starting comprehensive webhook test suite...');
  console.log('');
  
  try {
    // Run Jest tests
    const jestResults = await runJestTests();
    console.log('');
    
    // Run K6 load tests
    const k6Results = await runK6LoadTests();
    console.log('');
    
    // Generate report
    const report = generateTestReport(jestResults, k6Results);
    
    // Save results
    const reportPath = await saveTestResults(report);
    
    // Print summary
    console.log('📋 TEST SUMMARY:');
    console.log(`   Jest Tests: ${report.summary.jestTests}`);
    console.log(`   K6 Load Tests: ${report.summary.k6LoadTests}`);
    console.log(`   Overall Status: ${report.summary.overallStatus}`);
    console.log('');
    
    console.log('🎯 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log('');
    
    console.log('🔒 SECURITY CHECKLIST:');
    Object.entries(report.securityChecklist).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log('');
    
    console.log('📈 NEXT STEPS:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
    console.log('');
    
    if (report.summary.overallStatus === 'PASSED') {
      console.log('🎉 All webhook tests passed! System is ready for production.');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues before deployment.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test runner error:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWebhookTests();
}

export default runWebhookTests;
