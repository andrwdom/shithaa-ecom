// API Health Check Utility
export async function checkApiHealth(): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout for server-side requests
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

// Safe fetch wrapper with better error handling
export async function safeFetch(url: string, options?: RequestInit): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      // Add timeout
      signal: options?.signal || AbortSignal.timeout(10000), // 10 second timeout
    });
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}
