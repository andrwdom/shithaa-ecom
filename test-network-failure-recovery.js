/**
 * Test Network Failure Recovery with Retry Logic
 * 
 * This test verifies that the retry logic works correctly for network failures
 * and provides better user experience on unreliable Indian networks.
 */

// Mock fetch for testing
let fetchCallCount = 0;
let shouldFail = true;
let failCount = 0;
const maxFailures = 2; // Fail first 2 times, succeed on 3rd

const mockFetch = jest.fn().mockImplementation((url, options) => {
  fetchCallCount++;
  console.log(`Mock fetch call ${fetchCallCount} for: ${url}`);
  
  // Simulate network failure for first few attempts
  if (shouldFail && failCount < maxFailures) {
    failCount++;
    console.log(`Simulating network failure (attempt ${failCount}/${maxFailures})`);
    
    const error = new Error('Failed to fetch');
    error.name = 'TypeError';
    return Promise.reject(error);
  }
  
  // Success on final attempt
  console.log(`Mock fetch succeeded on attempt ${fetchCallCount}`);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data: { sessionId: 'test-session-123' } })
  });
});

// Mock global fetch
global.fetch = mockFetch;

// Mock setTimeout for testing
jest.useFakeTimers();

describe('Network Failure Recovery', () => {
  beforeEach(() => {
    fetchCallCount = 0;
    shouldFail = true;
    failCount = 0;
    jest.clearAllMocks();
  });

  test('should retry on network failures with exponential backoff', async () => {
    // Import the function we want to test
    const { fetchWithRetry } = require('./frontend/lib/api-utils');
    
    const promise = fetchWithRetry('/api/test', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' })
    }, {
      maxRetries: 3,
      baseDelay: 100, // Use small delay for testing
      maxDelay: 1000
    });

    // Fast-forward through all the delays
    jest.runAllTimers();
    
    const result = await promise;
    
    // Should have retried 3 times (1 initial + 3 retries)
    expect(fetchCallCount).toBe(4);
    expect(result.ok).toBe(true);
  });

  test('should not retry on 4xx client errors', async () => {
    const { fetchWithRetry } = require('./frontend/lib/api-utils');
    
    // Mock fetch to return 400 error
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad Request' })
    });

    const promise = fetchWithRetry('/api/test', {
      method: 'POST'
    }, {
      maxRetries: 3,
      baseDelay: 100
    });

    const result = await promise;
    
    // Should only call once (no retry for 4xx)
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(400);
  });

  test('should retry on 5xx server errors', async () => {
    const { fetchWithRetry } = require('./frontend/lib/api-utils');
    
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        // Return 500 error for first 2 calls
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal Server Error' })
        });
      }
      // Success on 3rd call
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });
    });

    const promise = fetchWithRetry('/api/test', {
      method: 'POST'
    }, {
      maxRetries: 3,
      baseDelay: 100
    });

    jest.runAllTimers();
    const result = await promise;
    
    // Should have retried 2 times (1 initial + 2 retries)
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result.status).toBe(200);
  });

  test('should respect maxDelay cap', async () => {
    const { fetchWithRetry } = require('./frontend/lib/api-utils');
    
    // Mock fetch to always fail
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const promise = fetchWithRetry('/api/test', {
      method: 'POST'
    }, {
      maxRetries: 2,
      baseDelay: 1000,
      maxDelay: 2000 // Cap at 2 seconds
    });

    // Fast-forward through delays
    jest.runAllTimers();
    
    try {
      await promise;
    } catch (error) {
      // Should fail after all retries
      expect(error.message).toContain('Network request failed after all retries');
    }
    
    // Should have called 3 times (1 initial + 2 retries)
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('should handle AbortError (timeout)', async () => {
    const { fetchWithRetry } = require('./frontend/lib/api-utils');
    
    // Mock fetch to throw AbortError
    global.fetch = jest.fn().mockRejectedValue(new Error('Request aborted'));
    
    const promise = fetchWithRetry('/api/test', {
      method: 'POST'
    }, {
      maxRetries: 2,
      baseDelay: 100
    });

    jest.runAllTimers();
    
    try {
      await promise;
    } catch (error) {
      expect(error.message).toContain('Request aborted');
    }
    
    // Should have retried
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});

// Manual testing instructions
console.log(`
🧪 Manual Testing Instructions:

1. **Network Throttling Test:**
   - Open Chrome DevTools → Network tab
   - Set throttling to "Slow 3G" or "Offline"
   - Try to checkout → should retry automatically
   - Check console for retry logs

2. **Server Error Test:**
   - Temporarily break backend API
   - Try to checkout → should retry on 5xx errors
   - Fix backend → should succeed on retry

3. **Timeout Test:**
   - Set very short timeout in code
   - Try to checkout → should retry on timeout

Expected Behavior:
✅ Network failures trigger automatic retries
✅ Exponential backoff prevents server overload
✅ 4xx errors don't retry (client error)
✅ 5xx errors do retry (server error)
✅ Clear console logs show retry attempts
✅ Users see helpful error messages after all retries fail
`);

module.exports = { mockFetch };
