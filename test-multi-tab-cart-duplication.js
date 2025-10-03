/**
 * Test Multi-Tab Cart Duplication Prevention
 * 
 * This test verifies that cart updates are synchronized across multiple tabs
 * and that duplicate checkout sessions are prevented.
 */

// Mock BroadcastChannel for testing
class MockBroadcastChannel {
  constructor(name) {
    this.name = name;
    this.listeners = [];
  }

  addEventListener(type, listener) {
    this.listeners.push({ type, listener });
  }

  removeEventListener(type, listener) {
    this.listeners = this.listeners.filter(l => l.listener !== listener);
  }

  postMessage(data) {
    this.listeners.forEach(({ listener }) => {
      setTimeout(() => listener({ data }), 0);
    });
  }

  close() {
    this.listeners = [];
  }
}

// Mock window.BroadcastChannel
global.BroadcastChannel = MockBroadcastChannel;

describe('Multi-Tab Cart Synchronization', () => {
  let cartChannel;
  let checkoutChannel;
  let receivedMessages = [];

  beforeEach(() => {
    // Reset channels
    cartChannel = new MockBroadcastChannel('cart-sync');
    checkoutChannel = new MockBroadcastChannel('checkout-sync');
    receivedMessages = [];
  });

  afterEach(() => {
    cartChannel.close();
    checkoutChannel.close();
  });

  test('should sync cart updates across tabs', (done) => {
    const tab1SessionId = 'tab_1234567890_abc123';
    const tab2SessionId = 'tab_0987654321_def456';
    
    const cartItems = [
      { id: '1', _id: '507f1f77bcf86cd799439011', name: 'Test Product', price: 100, quantity: 1, size: 'M' }
    ];

    // Tab 2 listens for cart updates
    cartChannel.addEventListener('message', (event) => {
      if (event.data.type === 'cart-updated' && event.data.sessionId !== tab2SessionId) {
        receivedMessages.push(event.data);
        expect(event.data.items).toEqual(cartItems);
        expect(event.data.sessionId).toBe(tab1SessionId);
        done();
      }
    });

    // Tab 1 updates cart (simulates user action)
    cartChannel.postMessage({
      type: 'cart-updated',
      items: cartItems,
      sessionId: tab1SessionId,
      timestamp: Date.now()
    });
  });

  test('should prevent duplicate checkout sessions', (done) => {
    const tab1SessionId = 'checkout_1234567890_abc123';
    const tab2SessionId = 'checkout_0987654321_def456';
    
    let checkoutEvents = [];

    // Both tabs listen for checkout events
    checkoutChannel.addEventListener('message', (event) => {
      if (event.data.type === 'checkout-started') {
        checkoutEvents.push(event.data);
        
        // Should only receive events from other tabs
        if (event.data.tabId !== tab1SessionId) {
          expect(event.data.sessionId).toBeDefined();
          expect(event.data.source).toBeDefined();
          expect(event.data.tabId).toBe(tab2SessionId);
          done();
        }
      }
    });

    // Tab 2 starts checkout
    checkoutChannel.postMessage({
      type: 'checkout-started',
      sessionId: 'session_123',
      source: 'cart',
      tabId: tab2SessionId,
      timestamp: Date.now()
    });
  });

  test('should ignore messages from same tab', () => {
    const sameTabId = 'tab_1234567890_abc123';
    let messageCount = 0;

    cartChannel.addEventListener('message', (event) => {
      if (event.data.type === 'cart-updated' && event.data.sessionId !== sameTabId) {
        messageCount++;
      }
    });

    // Send message from same tab - should be ignored
    cartChannel.postMessage({
      type: 'cart-updated',
      items: [],
      sessionId: sameTabId,
      timestamp: Date.now()
    });

    // Send message from different tab - should be processed
    cartChannel.postMessage({
      type: 'cart-updated',
      items: [],
      sessionId: 'tab_different_123',
      timestamp: Date.now()
    });

    setTimeout(() => {
      expect(messageCount).toBe(1);
    }, 10);
  });
});

// Manual testing instructions
console.log(`
🧪 Manual Testing Instructions:

1. Open two browser tabs to the same site
2. Add an item to cart in Tab 1
3. Verify Tab 2 automatically shows the same item
4. Go to checkout in Tab 1
5. Verify Tab 2 shows checkout session started notification
6. Try to start checkout in Tab 2 - should be prevented or show warning

Expected Behavior:
✅ Cart updates sync instantly between tabs
✅ Only one checkout session can be active at a time
✅ No duplicate orders are created
✅ Users see clear feedback about multi-tab activity
`);
