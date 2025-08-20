import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * This runs once before all tests and sets up the test environment
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log('🚀 Setting up test environment...');
  console.log(`📍 Base URL: ${baseURL}`);
  
  // Launch browser to verify environment
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Test if the application is accessible
    console.log('🔍 Verifying application accessibility...');
    await page.goto(baseURL || 'http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the main page loads correctly
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Verify basic functionality is available
    const isReady = await page.evaluate(() => {
      // Check if key elements are present
      const hasNavigation = !!document.querySelector('nav');
      const hasMainContent = !!document.querySelector('main');
      return hasNavigation && hasMainContent;
    });
    
    if (isReady) {
      console.log('✅ Application is ready for testing');
    } else {
      console.log('⚠️  Application may not be fully ready');
    }
    
  } catch (error) {
    console.error('❌ Failed to verify application:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎯 Test environment setup complete');
}

export default globalSetup;
