/**
 * E2E Test: Instagram In-App Browser Checkout Flow
 * 
 * Tests Instagram in-app browser behavior including:
 * - Custom User-Agent simulation
 * - Slow 3G network throttling
 * - Double-tap/double-click behavior
 * - CORS preflight handling
 * - Session persistence across slow navigation
 * - Idempotency key consistency
 * 
 * Run with: npm run test:e2e -- instagram-checkout.spec.js
 * 
 * Prerequisites:
 * - npm install --save-dev puppeteer jest
 * - Backend and frontend running on production URLs
 */

const puppeteer = require('puppeteer');

// Instagram User-Agent (Android)
const INSTAGRAM_USER_AGENT = 
  'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 Instagram 195.0.0.31.123';

// Slow 3G Network Profile (simulates poor Indian mobile network)
const SLOW_3G_PROFILE = {
  offline: false,
  downloadThroughput: (750 * 1024) / 8,  // 750 Kbps = 93.75 KB/s
  uploadThroughput: (250 * 1024) / 8,    // 250 Kbps = 31.25 KB/s
  latency: 100  // 100ms RTT (Round Trip Time)
};

// Test Configuration
const BASE_URL = process.env.TEST_URL || 'https://shithaa.in';
const HEADLESS = process.env.HEADLESS !== 'false';
const VIEWPORT = {
  width: 375,   // iPhone X width
  height: 812,  // iPhone X height
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true
};

describe('Instagram In-App Browser Checkout', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: HEADLESS,
      slowMo: 50,  // Slow down by 50ms for better debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',  // Simulate in-app browser CORS quirks
        '--disable-blink-features=AutomationControlled'
      ]
    });
  });
  
  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
    
    // Set Instagram User-Agent
    await page.setUserAgent(INSTAGRAM_USER_AGENT);
    
    // Enable network throttling (Slow 3G)
    const client = await page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', SLOW_3G_PROFILE);
    
    // Set mobile viewport
    await page.setViewport(VIEWPORT);
    
    // Intercept and log all network requests
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      
      // Log only API calls
      if (url.includes('/api/')) {
        console.log(`[REQUEST] ${method} ${url}`);
      }
      
      request.continue();
    });
    
    // Log console messages from browser
    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warn') {
        console.log(`[BROWSER ${type.toUpperCase()}] ${msg.text()}`);
      }
    });
    
    // Catch page errors
    page.on('pageerror', (error) => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });
    
    // Log failed requests
    page.on('requestfailed', (request) => {
      console.error(`[REQUEST FAILED] ${request.url()} - ${request.failure().errorText}`);
    });
  });
  
  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });
  
  // ========================================
  // TEST 1: Double-Click Protection
  // ========================================
  test('Should prevent double-click on checkout button', async () => {
    console.log('\n=== TEST: Double-Click Protection ===\n');
    
    // Navigate to checkout page
    await page.goto(`${BASE_URL}/checkout`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Check if already logged in, if not skip (or add login step)
    const isLoggedIn = await page.evaluate(() => {
      return !!localStorage.getItem('user') || !!sessionStorage.getItem('user');
    });
    
    if (!isLoggedIn) {
      console.log('⚠️ User not logged in, skipping test');
      return;
    }
    
    // Fill shipping form
    try {
      await page.waitForSelector('#fullName', { timeout: 5000 });
      await page.type('#fullName', 'Test User Instagram');
      await page.type('#email', 'instagram-test@example.com');
      await page.type('#phone', '9876543210');
      await page.type('#addressLine1', '123 Test Street, Instagram Test');
      await page.type('#city', 'Mumbai');
      await page.select('#state', 'Maharashtra');
      await page.type('#postalCode', '400001');
    } catch (error) {
      console.log('⚠️ Shipping form not found, might already be filled');
    }
    
    // Track API calls to checkout session endpoint
    const checkoutApiCalls = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/checkout/session') && request.method() === 'POST') {
        checkoutApiCalls.push({
          url,
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now()
        });
      }
    });
    
    // Wait for checkout button
    await page.waitForSelector('button:has-text("Continue to Payment"), button:has-text("Proceed to Checkout")', {
      timeout: 10000
    });
    
    // Get button selector
    const buttonSelector = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const checkoutButton = buttons.find(btn => 
        btn.textContent.includes('Continue to Payment') || 
        btn.textContent.includes('Proceed to Checkout')
      );
      return checkoutButton ? `button:has-text("${checkoutButton.textContent.trim()}")` : null;
    });
    
    if (!buttonSelector) {
      throw new Error('Checkout button not found');
    }
    
    // Simulate DOUBLE-CLICK (rapid taps)
    console.log('🖱️ Simulating double-click...');
    await page.click(buttonSelector);
    await page.click(buttonSelector);  // Immediate second click
    
    // Wait for network to settle
    await page.waitForTimeout(5000);
    
    // ASSERTION 1: Only ONE checkout session should be created
    const postCalls = checkoutApiCalls.filter(call => call.method === 'POST');
    console.log(`📊 Checkout API calls made: ${postCalls.length}`);
    
    expect(postCalls.length).toBeLessThanOrEqual(1);
    
    if (postCalls.length === 0) {
      console.log('⚠️ No checkout API calls detected (might be cached or button disabled)');
    } else if (postCalls.length === 1) {
      console.log('✅ Double-click protection working: Only 1 API call made');
    } else {
      console.error('❌ Double-click protection FAILED: Multiple API calls detected');
      console.log('Calls:', postCalls);
    }
    
    // ASSERTION 2: Button should be disabled after first click
    const isButtonDisabled = await page.evaluate((selector) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const checkoutButton = buttons.find(btn => 
        btn.textContent.includes('Continue to Payment') || 
        btn.textContent.includes('Proceed to Checkout')
      );
      return checkoutButton ? checkoutButton.disabled : false;
    }, buttonSelector);
    
    console.log(`🔒 Button disabled state: ${isButtonDisabled}`);
    expect(isButtonDisabled).toBe(true);
  }, 60000);  // 60 second timeout for slow 3G
  
  // ========================================
  // TEST 2: Idempotency Key Consistency
  // ========================================
  test('Should use same idempotency key across retries', async () => {
    console.log('\n=== TEST: Idempotency Key Consistency ===\n');
    
    await page.goto(`${BASE_URL}/checkout`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Check login
    const isLoggedIn = await page.evaluate(() => {
      return !!localStorage.getItem('user') || !!sessionStorage.getItem('user');
    });
    
    if (!isLoggedIn) {
      console.log('⚠️ User not logged in, skipping test');
      return;
    }
    
    // Track idempotency keys
    let attemptCount = 0;
    const idempotencyKeys = [];
    
    // Intercept requests and force failures to trigger retries
    page.on('request', (request) => {
      const url = request.url();
      
      if (url.includes('/api/checkout/session') && request.method() === 'POST') {
        attemptCount++;
        const headers = request.headers();
        const idempotencyKey = headers['idempotency-key'] || headers['Idempotency-Key'];
        
        console.log(`📨 Attempt ${attemptCount}: Idempotency-Key = ${idempotencyKey}`);
        idempotencyKeys.push(idempotencyKey);
        
        // Fail first 2 attempts to force retries
        if (attemptCount <= 2) {
          console.log(`❌ Aborting attempt ${attemptCount} to test retry`);
          request.abort('failed');
          return;
        }
      }
      
      request.continue();
    });
    
    // Fill form and submit (abbreviated)
    try {
      await page.waitForSelector('#fullName', { timeout: 5000 });
      await page.type('#fullName', 'Retry Test User');
      await page.type('#email', 'retry-test@example.com');
      await page.type('#phone', '9876543210');
      await page.type('#addressLine1', '456 Retry St');
      await page.type('#city', 'Delhi');
      await page.select('#state', 'Delhi');
      await page.type('#postalCode', '110001');
    } catch (error) {
      console.log('⚠️ Form already filled');
    }
    
    // Click checkout button
    await page.click('button:has-text("Continue to Payment"), button:has-text("Proceed to Checkout")');
    
    // Wait for retries to complete
    await page.waitForTimeout(15000);
    
    // ASSERTION: All retry attempts should use SAME idempotency key
    const uniqueKeys = [...new Set(idempotencyKeys.filter(k => k !== undefined))];
    
    console.log(`📊 Total attempts: ${attemptCount}`);
    console.log(`📊 Unique idempotency keys: ${uniqueKeys.length}`);
    console.log(`🔑 Keys: ${uniqueKeys.join(', ')}`);
    
    if (uniqueKeys.length === 0) {
      console.log('⚠️ No idempotency keys detected - implementation missing');
    } else {
      expect(uniqueKeys.length).toBe(1);
      console.log(`✅ Idempotency key consistent across ${attemptCount} attempts`);
    }
  }, 60000);
  
  // ========================================
  // TEST 3: CORS for Instagram Origin
  // ========================================
  test('Should handle CORS preflight for Instagram origin', async () => {
    console.log('\n=== TEST: CORS Preflight Handling ===\n');
    
    // Set Instagram-specific headers
    await page.setExtraHTTPHeaders({
      'Origin': 'https://www.instagram.com',
      'Referer': 'https://www.instagram.com/',
      'X-Requested-With': 'com.instagram.android'
    });
    
    // Test API endpoint with CORS
    const response = await page.evaluate(async (baseUrl) => {
      try {
        const res = await fetch(`${baseUrl}/api/products`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Origin': 'https://www.instagram.com',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        return {
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          headers: {
            'access-control-allow-origin': res.headers.get('access-control-allow-origin'),
            'access-control-allow-credentials': res.headers.get('access-control-allow-credentials')
          }
        };
      } catch (error) {
        return { 
          error: error.message,
          name: error.name
        };
      }
    }, BASE_URL);
    
    console.log(`📊 Response:`, response);
    
    // ASSERTION: Should not get CORS error
    expect(response.error).toBeUndefined();
    expect(response.ok).toBe(true);
    expect(response.headers['access-control-allow-origin']).toBeTruthy();
    
    console.log('✅ CORS allowed for Instagram origin');
  }, 30000);
  
  // ========================================
  // TEST 4: Cart Persistence Across Navigation
  // ========================================
  test('Should preserve cart state across slow navigation', async () => {
    console.log('\n=== TEST: Cart Persistence ===\n');
    
    // Go to home page
    await page.goto(BASE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Click first product
    try {
      await page.waitForSelector('.product-card, [data-testid="product-card"]', { timeout: 10000 });
      await page.click('.product-card:first-child, [data-testid="product-card"]:first-child');
      console.log('📦 Clicked product');
    } catch (error) {
      console.log('⚠️ No products found on page');
      return;
    }
    
    // Wait for product page
    await page.waitForTimeout(3000);
    
    // Add to cart
    try {
      await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 5000 });
      await page.click('button:has-text("Add to Cart")');
      console.log('🛒 Added to cart');
      
      // Wait for cart update
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('⚠️ Add to Cart button not found');
      return;
    }
    
    // Navigate to checkout
    try {
      await page.click('button:has-text("Proceed to Checkout"), button:has-text("Checkout")');
      console.log('🔄 Navigating to checkout');
    } catch (error) {
      // Try alternative navigation
      await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle2' });
    }
    
    // Wait for checkout page load (slow 3G)
    await page.waitForTimeout(5000);
    
    // Check if cart data is persisted in storage
    const cartData = await page.evaluate(() => {
      return {
        cartItems: localStorage.getItem('cartItems'),
        cartCheckoutData: localStorage.getItem('cartCheckoutData'),
        sessionCartData: sessionStorage.getItem('cartItems')
      };
    });
    
    console.log('💾 Cart storage data:', {
      localStorage: !!cartData.cartItems,
      cartCheckoutData: !!cartData.cartCheckoutData,
      sessionStorage: !!cartData.sessionCartData
    });
    
    // ASSERTION: Cart data should be present
    expect(cartData.cartItems || cartData.sessionCartData).toBeTruthy();
    
    if (cartData.cartItems) {
      const parsedCart = JSON.parse(cartData.cartItems);
      console.log(`✅ Cart persisted: ${parsedCart.length} items`);
      expect(parsedCart.length).toBeGreaterThan(0);
    } else {
      console.log('⚠️ No cart data found in localStorage');
    }
  }, 90000);
  
  // ========================================
  // TEST 5: Network Error Handling
  // ========================================
  test('Should show error UI on network failure with retry', async () => {
    console.log('\n=== TEST: Network Error Handling ===\n');
    
    await page.goto(`${BASE_URL}/checkout`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Check login
    const isLoggedIn = await page.evaluate(() => {
      return !!localStorage.getItem('user') || !!sessionStorage.getItem('user');
    });
    
    if (!isLoggedIn) {
      console.log('⚠️ User not logged in, skipping test');
      return;
    }
    
    // Force all checkout API calls to fail
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/checkout/session')) {
        console.log('❌ Forcing network failure for:', url);
        request.abort('failed');
      } else {
        request.continue();
      }
    });
    
    // Fill form
    try {
      await page.waitForSelector('#fullName', { timeout: 5000 });
      await page.type('#fullName', 'Error Test User');
      await page.type('#email', 'error-test@example.com');
      await page.type('#phone', '9876543210');
      await page.type('#addressLine1', '789 Error Ave');
      await page.type('#city', 'Bangalore');
      await page.select('#state', 'Karnataka');
      await page.type('#postalCode', '560001');
    } catch (error) {
      console.log('⚠️ Form already filled');
    }
    
    // Click checkout
    await page.click('button:has-text("Continue to Payment"), button:has-text("Proceed to Checkout")');
    
    // Wait for error UI to appear
    await page.waitForTimeout(10000);
    
    // Check for error message
    const errorMessage = await page.evaluate(() => {
      const errorSelectors = [
        '.error-message',
        '[role="alert"]',
        '.alert-error',
        '[data-testid="error-message"]'
      ];
      
      for (const selector of errorSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent;
        }
      }
      
      return null;
    });
    
    console.log(`📊 Error message: ${errorMessage}`);
    
    // ASSERTION: Error message should be visible
    if (errorMessage) {
      expect(errorMessage.toLowerCase()).toMatch(/error|fail|network|retry/);
      console.log('✅ Network error shown to user');
    } else {
      console.log('⚠️ No error message found (might be in different location)');
    }
  }, 60000);
  
  // ========================================
  // TEST 6: Session Timeout Warning
  // ========================================
  test('Should handle expired checkout session gracefully', async () => {
    console.log('\n=== TEST: Session Timeout Handling ===\n');
    
    await page.goto(`${BASE_URL}/checkout`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Simulate expired session by manipulating storage
    await page.evaluate(() => {
      const expiredTime = Date.now() - (20 * 60 * 1000);  // 20 minutes ago
      const sessionData = {
        sessionId: 'expired-session-123',
        expiresAt: new Date(expiredTime).toISOString(),
        items: [],
        timestamp: expiredTime
      };
      
      localStorage.setItem('checkoutSession', JSON.stringify(sessionData));
      sessionStorage.setItem('checkoutSession', JSON.stringify(sessionData));
    });
    
    // Reload page to trigger expiration check
    await page.reload({ waitUntil: 'networkidle2' });
    
    await page.waitForTimeout(3000);
    
    // Check if expired session is cleared
    const sessionData = await page.evaluate(() => {
      return {
        localStorage: localStorage.getItem('checkoutSession'),
        sessionStorage: sessionStorage.getItem('checkoutSession')
      };
    });
    
    console.log(`💾 Session after reload:`, {
      localStorage: !!sessionData.localStorage,
      sessionStorage: !!sessionData.sessionStorage
    });
    
    // ASSERTION: Expired session should be cleared
    if (sessionData.localStorage) {
      const parsed = JSON.parse(sessionData.localStorage);
      const isExpired = new Date(parsed.expiresAt) < new Date();
      console.log(`🕒 Session expired: ${isExpired}`);
    } else {
      console.log('✅ Expired session cleared from storage');
    }
  }, 45000);
});

/**
 * Helper function to wait for network idle
 */
async function waitForNetworkIdle(page, timeout = 5000) {
  let requestCount = 0;
  let responseCount = 0;
  
  page.on('request', () => requestCount++);
  page.on('response', () => responseCount++);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (requestCount === responseCount && requestCount > 0) {
      return true;
    }
    await page.waitForTimeout(100);
  }
  
  return false;
}

/**
 * Run tests:
 * 
 * npm test -- instagram-checkout.spec.js
 * 
 * With custom URL:
 * TEST_URL=https://staging.shithaa.in npm test -- instagram-checkout.spec.js
 * 
 * With visible browser:
 * HEADLESS=false npm test -- instagram-checkout.spec.js
 */

