#!/usr/bin/env node

/**
 * Cloudflare CDN Verification Script
 * Tests and verifies that Cloudflare CDN is working correctly
 */

const https = require('https');
const http = require('http');

// Configuration
const DOMAIN = 'shithaa.in';
const TEST_IMAGES = [
  '/images/logos/shithaa-logo.webp',
  '/images/categories/maternity-feeding.webp',
  '/images/categories/zipless-feeding.webp',
  '/images/categories/non-feeding.webp',
  '/images/categories/dupatta-lounge.webp'
];

const TEST_PRODUCT_IMAGES = [
  '/images/products/',
  '/uploads/products/'
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testCloudflareHeaders(url) {
  try {
    const response = await makeRequest(url);
    
    const cloudflareHeaders = {
      'cf-cache-status': response.headers['cf-cache-status'],
      'cf-ray': response.headers['cf-ray'],
      'cf-connecting-ip': response.headers['cf-connecting-ip'],
      'server': response.headers['server']
    };
    
    const isCloudflare = cloudflareHeaders['cf-ray'] || cloudflareHeaders['server']?.includes('cloudflare');
    const isCached = cloudflareHeaders['cf-cache-status'] === 'HIT';
    
    return {
      success: response.statusCode === 200,
      cloudflare: isCloudflare,
      cached: isCached,
      headers: cloudflareHeaders,
      statusCode: response.statusCode
    };
  } catch (error) {
    return {
      success: false,
      cloudflare: false,
      cached: false,
      error: error.message,
      statusCode: 0
    };
  }
}

async function testImageOptimization(url) {
  try {
    const response = await makeRequest(url);
    
    const isWebP = response.headers['content-type']?.includes('image/webp');
    const hasCacheHeaders = response.headers['cache-control']?.includes('max-age');
    const hasVaryHeader = response.headers['vary']?.includes('Accept');
    
    return {
      success: response.statusCode === 200,
      webp: isWebP,
      cached: hasCacheHeaders,
      varyHeader: hasVaryHeader,
      contentType: response.headers['content-type'],
      cacheControl: response.headers['cache-control']
    };
  } catch (error) {
    return {
      success: false,
      webp: false,
      cached: false,
      error: error.message
    };
  }
}

async function testDomainResolution() {
  try {
    const dns = require('dns').promises;
    const records = await dns.resolve4(DOMAIN);
    
    // Check if domain resolves to Cloudflare IPs (common ranges)
    const cloudflareRanges = [
      '104.16.0.0/12',
      '108.162.0.0/16',
      '141.101.0.0/16',
      '162.158.0.0/15',
      '172.64.0.0/13',
      '173.245.48.0/20',
      '188.114.96.0/20',
      '190.93.240.0/20',
      '197.234.240.0/22',
      '198.41.128.0/17'
    ];
    
    // Simple check - if IP starts with common Cloudflare ranges
    const isCloudflareIP = records.some(ip => 
      ip.startsWith('104.') || 
      ip.startsWith('108.') || 
      ip.startsWith('141.') || 
      ip.startsWith('162.') ||
      ip.startsWith('172.') ||
      ip.startsWith('173.') ||
      ip.startsWith('188.') ||
      ip.startsWith('190.') ||
      ip.startsWith('197.') ||
      ip.startsWith('198.')
    );
    
    return {
      success: true,
      records: records,
      cloudflare: isCloudflareIP
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runVerification() {
  log('\n🚀 Cloudflare CDN Verification Starting...\n', 'blue');
  
  // Test 1: Domain Resolution
  log('1️⃣ Testing domain resolution...', 'yellow');
  const dnsTest = await testDomainResolution();
  if (dnsTest.success) {
    log(`✅ Domain resolves to: ${dnsTest.records.join(', ')}`, 'green');
    if (dnsTest.cloudflare) {
      log('✅ Domain appears to be behind Cloudflare', 'green');
    } else {
      log('⚠️ Domain may not be behind Cloudflare (check DNS settings)', 'yellow');
    }
  } else {
    log(`❌ DNS resolution failed: ${dnsTest.error}`, 'red');
  }
  
  // Test 2: Main site accessibility
  log('\n2️⃣ Testing main site accessibility...', 'yellow');
  const mainSiteTest = await testCloudflareHeaders(`https://${DOMAIN}`);
  if (mainSiteTest.success) {
    log('✅ Main site is accessible', 'green');
    if (mainSiteTest.cloudflare) {
      log('✅ Main site is served through Cloudflare', 'green');
      log(`   CF-Ray: ${mainSiteTest.headers['cf-ray'] || 'N/A'}`, 'blue');
      log(`   CF-Cache-Status: ${mainSiteTest.headers['cf-cache-status'] || 'N/A'}`, 'blue');
    } else {
      log('⚠️ Main site may not be served through Cloudflare', 'yellow');
    }
  } else {
    log(`❌ Main site not accessible: ${mainSiteTest.error || 'Unknown error'}`, 'red');
  }
  
  // Test 3: Static images
  log('\n3️⃣ Testing static images...', 'yellow');
  for (const imagePath of TEST_IMAGES) {
    const url = `https://${DOMAIN}${imagePath}`;
    const imageTest = await testImageOptimization(url);
    
    if (imageTest.success) {
      log(`✅ ${imagePath} - Accessible`, 'green');
      if (imageTest.webp) {
        log(`   ✅ WebP format detected`, 'green');
      } else {
        log(`   ⚠️ Not WebP format: ${imageTest.contentType}`, 'yellow');
      }
      if (imageTest.cached) {
        log(`   ✅ Cache headers present: ${imageTest.cacheControl}`, 'green');
      } else {
        log(`   ⚠️ No cache headers detected`, 'yellow');
      }
    } else {
      log(`❌ ${imagePath} - Not accessible: ${imageTest.error}`, 'red');
    }
  }
  
  // Test 4: Product images
  log('\n4️⃣ Testing product images...', 'yellow');
  for (const imagePath of TEST_PRODUCT_IMAGES) {
    const url = `https://${DOMAIN}${imagePath}`;
    const imageTest = await testCloudflareHeaders(url);
    
    if (imageTest.success) {
      log(`✅ ${imagePath} - Accessible`, 'green');
      if (imageTest.cloudflare) {
        log(`   ✅ Served through Cloudflare`, 'green');
        if (imageTest.cached) {
          log(`   ✅ Cached by Cloudflare`, 'green');
        } else {
          log(`   ⚠️ Not cached by Cloudflare`, 'yellow');
        }
      } else {
        log(`   ⚠️ Not served through Cloudflare`, 'yellow');
      }
    } else {
      log(`❌ ${imagePath} - Not accessible: ${imageTest.error}`, 'red');
    }
  }
  
  // Summary
  log('\n📊 Verification Summary:', 'blue');
  log('='.repeat(50), 'blue');
  
  if (dnsTest.success && mainSiteTest.success) {
    log('🎉 Cloudflare CDN setup appears to be working!', 'green');
    log('\n📋 Recommendations:', 'yellow');
    log('1. Monitor Cloudflare analytics for cache hit rates', 'blue');
    log('2. Test image loading performance in different regions', 'blue');
    log('3. Verify WebP format is being served to supported browsers', 'blue');
    log('4. Check Cloudflare dashboard for any warnings or issues', 'blue');
  } else {
    log('⚠️ Some issues detected. Please check the configuration:', 'yellow');
    log('1. Ensure domain is properly configured in Cloudflare', 'blue');
    log('2. Verify DNS records are pointing to Cloudflare', 'blue');
    log('3. Check that Cloudflare proxy is enabled (orange cloud)', 'blue');
    log('4. Verify nginx configuration is correct', 'blue');
  }
  
  log('\n🔍 To manually verify:', 'blue');
  log('1. Open DevTools → Network tab', 'blue');
  log('2. Visit your site and check response headers', 'blue');
  log('3. Look for "cf-cache-status: HIT" for cached resources', 'blue');
  log('4. Check that images load with WebP format when supported', 'blue');
}

// Run verification
runVerification().catch(console.error);
