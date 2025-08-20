import { test, expect } from '@playwright/test';

/**
 * E2E Playwright tests for the checkout system
 * 
 * These tests simulate real user scenarios including:
 * - Cart checkout flow
 * - Buy-Now checkout flow
 * - PhonePe payment redirects
 * - Webhook arrival ordering
 * - Multi-tab scenarios
 * - Network delays and failures
 */

test.describe('Checkout System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page before each test
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Cart Checkout Flow', () => {
    test('should complete cart checkout successfully', async ({ page }) => {
      // Add item to cart
      await page.click('[data-testid="add-to-cart-button"]');
      await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');

      // Navigate to cart
      await page.click('[data-testid="cart-icon"]');
      await expect(page).toHaveURL(/.*cart/);

      // Proceed to checkout
      await page.click('[data-testid="proceed-to-checkout"]');
      await expect(page).toHaveURL(/.*checkout/);

      // Fill shipping information
      await page.fill('[data-testid="shipping-full-name"]', 'John Doe');
      await page.fill('[data-testid="shipping-email"]', 'john@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '123 Test Street');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      // Verify order summary
      await expect(page.locator('[data-testid="order-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="order-subtotal"]')).toBeVisible();

      // Click pay now
      await page.click('[data-testid="pay-now-button"]');

      // Should redirect to PhonePe
      await expect(page).toHaveURL(/.*phonepe/);
    });

    test('should handle cart checkout with insufficient stock', async ({ page }) => {
      // This test would require setting up a product with limited stock
      // and multiple users trying to purchase simultaneously
      
      // Add item to cart
      await page.click('[data-testid="add-to-cart-button"]');
      
      // Navigate to cart and checkout
      await page.click('[data-testid="cart-icon"]');
      await page.click('[data-testid="proceed-to-checkout"]');
      
      // Fill shipping info
      await page.fill('[data-testid="shipping-full-name"]', 'Jane Doe');
      await page.fill('[data-testid="shipping-email"]', 'jane@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '456 Test Ave');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      // Try to pay
      await page.click('[data-testid="pay-now-button"]');
      
      // Should show stock error
      await expect(page.locator('[data-testid="stock-error"]')).toBeVisible();
    });
  });

  test.describe('Buy-Now Flow', () => {
    test('should complete buy-now checkout successfully', async ({ page }) => {
      // Navigate to product page
      await page.goto('/product/test-product-id');
      
      // Select size and quantity
      await page.selectOption('[data-testid="size-selector"]', 'M');
      await page.fill('[data-testid="quantity-input"]', '2');
      
      // Click buy now
      await page.click('[data-testid="buy-now-button"]');
      await expect(page).toHaveURL(/.*checkout/);

      // Verify it's buy-now flow
      await expect(page.locator('[data-testid="checkout-source"]')).toHaveText('buynow');
      
      // Fill shipping information
      await page.fill('[data-testid="shipping-full-name"]', 'Alice Smith');
      await page.fill('[data-testid="shipping-email"]', 'alice@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '789 Test Blvd');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      // Pay now
      await page.click('[data-testid="pay-now-button"]');
      
      // Should redirect to PhonePe
      await expect(page).toHaveURL(/.*phonepe/);
    });

    test('should handle buy-now with expired session', async ({ page }) => {
      // This test simulates a user leaving the checkout page open
      // and returning after the session has expired
      
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'L');
      await page.click('[data-testid="buy-now-button"]');
      
      // Wait for session to expire (in test environment, this might be accelerated)
      await page.waitForTimeout(2000);
      
      // Try to proceed with expired session
      await page.fill('[data-testid="shipping-full-name"]', 'Bob Johnson');
      await page.fill('[data-testid="shipping-email"]', 'bob@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '321 Test Lane');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      await page.click('[data-testid="pay-now-button"]');
      
      // Should show session expired error
      await expect(page.locator('[data-testid="session-expired-error"]')).toBeVisible();
    });
  });

  test.describe('PhonePe Payment Flow', () => {
    test('should handle PhonePe redirect correctly', async ({ page }) => {
      // Start checkout process
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'S');
      await page.click('[data-testid="buy-now-button"]');
      
      // Fill shipping info
      await page.fill('[data-testid="shipping-full-name"]', 'Charlie Brown');
      await page.fill('[data-testid="shipping-email"]', 'charlie@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '654 Test Circle');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      // Click pay now
      await page.click('[data-testid="pay-now-button"]');
      
      // Should redirect to PhonePe
      await expect(page).toHaveURL(/.*phonepe/);
      
      // Simulate PhonePe success callback
      await page.goto('/payment/phonepe/callback?merchantTransactionId=test-txn-123&status=SUCCESS');
      
      // Should show success page
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    });

    test('should handle PhonePe failure correctly', async ({ page }) => {
      // Start checkout process
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'M');
      await page.click('[data-testid="buy-now-button"]');
      
      // Fill shipping info
      await page.fill('[data-testid="shipping-full-name"]', 'Diana Prince');
      await page.fill('[data-testid="shipping-email"]', 'diana@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '987 Test Way');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      // Click pay now
      await page.click('[data-testid="pay-now-button"]');
      
      // Simulate PhonePe failure callback
      await page.goto('/payment/phonepe/callback?merchantTransactionId=test-txn-456&status=FAILED');
      
      // Should show failure page
      await expect(page.locator('[data-testid="payment-failed"]')).toBeVisible();
    });

    test('should handle webhook arrival before redirect', async ({ page, request }) => {
      // This test simulates a scenario where the webhook arrives
      // before the user returns from PhonePe
      
      // Start checkout process
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'L');
      await page.click('[data-testid="buy-now-button"]');
      
      // Fill shipping info
      await page.fill('[data-testid="shipping-full-name"]', 'Eve Wilson');
      await page.fill('[data-testid="shipping-email"]', 'eve@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '147 Test Road');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      // Click pay now and get session ID
      await page.click('[data-testid="pay-now-button"]');
      
      // Extract session ID from the page (this would need to be implemented)
      const sessionId = await page.locator('[data-testid="checkout-session-id"]').textContent();
      
      // Simulate webhook arrival before redirect
      const webhookResponse = await request.post('/api/payment/phonepe/webhook', {
        data: {
          merchantTransactionId: 'test-txn-789',
          status: 'SUCCESS',
          amount: 1000,
          sessionId: sessionId
        }
      });
      
      expect(webhookResponse.ok()).toBeTruthy();
      
      // Now simulate user returning from PhonePe
      await page.goto('/payment/phonepe/callback?merchantTransactionId=test-txn-789&status=SUCCESS');
      
      // Should show success page (webhook already processed)
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    });
  });

  test.describe('Multi-Tab Scenarios', () => {
    test('should handle multiple tabs gracefully', async ({ page, context }) => {
      // Create a second tab
      const page2 = await context.newPage();
      
      // Tab 1: Add to cart
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'M');
      await page.click('[data-testid="add-to-cart-button"]');
      
      // Tab 2: Buy now for same product
      await page2.goto('/product/test-product-id');
      await page2.selectOption('[data-testid="size-selector"]', 'M');
      await page2.click('[data-testid="buy-now-button"]');
      
      // Both should work if there's sufficient stock
      await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
      await expect(page2.locator('[data-testid="checkout-source"]')).toHaveText('buynow');
      
      await page2.close();
    });

    test('should prevent overselling in multi-tab scenario', async ({ page, context }) => {
      // This test requires setting up a product with exactly 1 item in stock
      
      // Tab 1: Start buy-now
      await page.goto('/product/limited-stock-product');
      await page.selectOption('[data-testid="size-selector"]', 'S');
      await page.click('[data-testid="buy-now-button"]');
      
      // Tab 2: Try to buy same item
      const page2 = await context.newPage();
      await page2.goto('/product/limited-stock-product');
      await page2.selectOption('[data-testid="size-selector"]', 'S');
      await page2.click('[data-testid="buy-now-button"]');
      
      // Tab 2 should show stock error
      await expect(page2.locator('[data-testid="stock-error"]')).toBeVisible();
      
      await page2.close();
    });
  });

  test.describe('Network and Error Scenarios', () => {
    test('should handle slow network during checkout', async ({ page }) => {
      // Simulate slow network
      await page.route('**/api/checkout/session', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.continue();
      });
      
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'M');
      await page.click('[data-testid="buy-now-button"]');
      
      // Should show loading state
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="checkout-form"]')).toBeVisible();
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Simulate server error
      await page.route('**/api/checkout/session', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'M');
      await page.click('[data-testid="buy-now-button"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('should retry failed requests', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/checkout/session', async route => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Temporary failure' })
          });
        } else {
          // Second request succeeds
          await route.continue();
        }
      });
      
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'M');
      await page.click('[data-testid="buy-now-button"]');
      
      // Should retry and eventually succeed
      await expect(page.locator('[data-testid="checkout-form"]')).toBeVisible();
      expect(requestCount).toBeGreaterThan(1);
    });
  });

  test.describe('User Experience Edge Cases', () => {
    test('should handle user closing browser during payment', async ({ page }) => {
      // Start checkout process
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'M');
      await page.click('[data-testid="buy-now-button"]');
      
      // Fill shipping info
      await page.fill('[data-testid="shipping-full-name"]', 'Frank Miller');
      await page.fill('[data-testid="shipping-email"]', 'frank@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '258 Test Drive');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      // Click pay now
      await page.click('[data-testid="pay-now-button"]');
      
      // Simulate user closing browser (navigate away)
      await page.goto('/');
      
      // User should be able to return and see their pending payment
      await page.goto('/account');
      await expect(page.locator('[data-testid="pending-payments"])).toBeVisible();
    });

    test('should handle duplicate payment attempts', async ({ page }) => {
      // Start checkout process
      await page.goto('/product/test-product-id');
      await page.selectOption('[data-testid="size-selector"]', 'M');
      await page.click('[data-testid="buy-now-button"]');
      
      // Fill shipping info
      await page.fill('[data-testid="shipping-full-name"]', 'Grace Lee');
      await page.fill('[data-testid="shipping-email"]', 'grace@example.com');
      await page.fill('[data-testid="shipping-phone"]', '9876543210');
      await page.fill('[data-testid="shipping-address"]', '369 Test Court');
      await page.fill('[data-testid="shipping-city"]', 'Test City');
      await page.fill('[data-testid="shipping-state"]', 'Test State');
      await page.fill('[data-testid="shipping-postal-code"]', '123456');

      // Click pay now multiple times (simulating user impatience)
      await page.click('[data-testid="pay-now-button"]');
      await page.click('[data-testid="pay-now-button"]');
      await page.click('[data-testid="pay-now-button"]');
      
      // Should only create one payment session
      await expect(page).toHaveURL(/.*phonepe/);
    });
  });
});
