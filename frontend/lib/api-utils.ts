// API utilities with rate limiting and caching
class APIManager {
  private requestQueue: Array<() => Promise<any>> = []
  private isProcessing = false
  private lastRequestTime = 0
  private minInterval = 100 // Minimum 100ms between requests
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private maxCacheAge = 5 * 60 * 1000 // 5 minutes cache TTL

  // Rate-limited fetch with caching
  async fetchWithRateLimit(
    url: string, 
    options: RequestInit = {}, 
    cacheKey?: string,
    cacheTTL: number = this.maxCacheAge
  ): Promise<Response> {
    // Check cache first
    if (cacheKey) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        // Return cached response
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Add to request queue
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          // Wait for rate limiting
          await this.waitForRateLimit()
          
          // Make the actual request
          const response = await fetch(url, options)
          
          // Cache successful responses
          if (response.ok && cacheKey) {
            try {
              const data = await response.clone().json()
              this.cache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                ttl: cacheTTL
              })
            } catch (e) {
              // Ignore caching errors
            }
          }
          
          resolve(response)
        } catch (error) {
          reject(error)
        }
      })
      
      this.processQueue()
    })
  }

  // Wait for rate limiting
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTime = Date.now()
  }

  // Process request queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) return
    
    this.isProcessing = true
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()
      if (request) {
        try {
          await request()
        } catch (error) {
          console.error('Request failed:', error)
        }
      }
    }
    
    this.isProcessing = false
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Clear expired cache entries
  cleanupCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Global API manager instance
export const apiManager = new APIManager()

// Utility function for making rate-limited API calls
export async function safeFetch(
  url: string, 
  options: RequestInit = {}, 
  cacheKey?: string,
  cacheTTL?: number
): Promise<Response> {
  return apiManager.fetchWithRateLimit(url, options, cacheKey, cacheTTL)
}

// Debounced fetch for components that might call the same API multiple times
export function createDebouncedFetch(delay: number = 300) {
  let timeoutId: NodeJS.Timeout | null = null
  
  return function debouncedFetch(
    url: string, 
    options: RequestInit = {}, 
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        safeFetch(url, options, cacheKey, cacheTTL)
          .then(resolve)
          .catch(reject)
      }, delay)
    })
  }
}

/**
 * Utility function for making authenticated API calls with automatic token refresh
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {},
  retryCount = 0
): Promise<Response> {
  const maxRetries = 1; // Only retry once to avoid infinite loops
  
  try {
    console.log(`🔐 Making authenticated request to: ${url}`);
    
    // Make the request with credentials
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`🔐 Response status: ${response.status}`);

    // If we get a 401 and haven't retried yet, try to refresh the token
    if (response.status === 401 && retryCount < maxRetries) {
      console.log('🔐 Access token expired, attempting to refresh...');
      
      try {
        // Try to refresh the token
        const refreshResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/user/refresh-token`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );

        console.log(`🔐 Refresh response status: ${refreshResponse.status}`);

        if (refreshResponse.ok) {
          console.log('✅ Token refreshed successfully, retrying original request...');
          // Token refreshed, retry the original request
          return authenticatedFetch(url, options, retryCount + 1);
        } else {
          console.log('❌ Token refresh failed, user needs to log in again');
          const refreshData = await refreshResponse.json().catch(() => ({}));
          throw new Error(refreshData.message || 'Your session has expired. Please log in again.');
        }
      } catch (refreshError) {
        console.log('❌ Token refresh error:', refreshError);
        if (refreshError instanceof Error) {
          throw refreshError;
        }
        throw new Error('Your session has expired. Please log in again.');
      }
    }

    return response;
  } catch (error) {
    console.error('❌ Authenticated fetch error:', error);
    
    // If it's our custom error, throw it
    if (error instanceof Error && error.message.includes('session has expired')) {
      throw error;
    }
    
    // For other errors, throw a generic error
    throw new Error('Request failed. Please try again.');
  }
}

/**
 * Utility function for making authenticated API calls that returns JSON
 */
export async function authenticatedFetchJson<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

// Fallback hero images data when API is unavailable
const FALLBACK_HERO_IMAGES = {
  'maternity-feeding-wear': {
    mobile: [
      { id: 'fallback-1', url: '/placeholder.jpg', alt: 'Maternity Feeding Wear' },
      { id: 'fallback-2', url: '/placeholder.jpg', alt: 'Maternity Feeding Wear' },
      { id: 'fallback-3', url: '/placeholder.jpg', alt: 'Maternity Feeding Wear' },
    ],
    desktop: [
      { id: 'fallback-1', url: '/placeholder.jpg', alt: 'Maternity Feeding Wear' },
      { id: 'fallback-2', url: '/placeholder.jpg', alt: 'Maternity Feeding Wear' },
      { id: 'fallback-3', url: '/placeholder.jpg', alt: 'Maternity Feeding Wear' },
    ]
  },
  'zipless-feeding-lounge-wear': {
    mobile: [
      { id: 'fallback-1', url: '/placeholder.jpg', alt: 'Zipless Feeding Lounge Wear' },
      { id: 'fallback-2', url: '/placeholder.jpg', alt: 'Zipless Feeding Lounge Wear' },
      { id: 'fallback-3', url: '/placeholder.jpg', alt: 'Zipless Feeding Lounge Wear' },
    ],
    desktop: [
      { id: 'fallback-1', url: '/placeholder.jpg', alt: 'Zipless Feeding Lounge Wear' },
      { id: 'fallback-2', url: '/placeholder.jpg', alt: 'Zipless Feeding Lounge Wear' },
      { id: 'fallback-3', url: '/placeholder.jpg', alt: 'Zipless Feeding Lounge Wear' },
    ]
  },
  'non-feeding-lounge-wear': {
    mobile: [
      { id: 'fallback-1', url: '/placeholder.jpg', alt: 'Non-Feeding Lounge Wear' },
      { id: 'fallback-2', url: '/placeholder.jpg', alt: 'Non-Feeding Lounge Wear' },
      { id: 'fallback-3', url: '/placeholder.jpg', alt: 'Non-Feeding Lounge Wear' },
    ],
    desktop: [
      { id: 'fallback-1', url: '/placeholder.jpg', alt: 'Non-Feeding Lounge Wear' },
      { id: 'fallback-2', url: '/placeholder.jpg', alt: 'Non-Feeding Lounge Wear' },
      { id: 'fallback-3', url: '/placeholder.jpg', alt: 'Non-Feeding Lounge Wear' },
    ]
  },
  'zipless-feeding-dupatta-lounge-wear': {
    mobile: [
      { id: 'fallback-1', url: '/placeholder.jpg', alt: 'Zipless Feeding Dupatta Lounge Wear' },
      { id: 'fallback-2', url: '/placeholder.jpg', alt: 'Zipless Feeding Dupatta Lounge Wear' },
      { id: 'fallback-3', url: '/placeholder.jpg', alt: 'Zipless Feeding Dupatta Lounge Wear' },
    ],
    desktop: [
      { id: 'fallback-1', url: '/placeholder.jpg', alt: 'Zipless Feeding Dupatta Lounge Wear' },
      { id: 'fallback-2', url: '/placeholder.jpg', alt: 'Zipless Feeding Dupatta Lounge Wear' },
      { id: 'fallback-3', url: '/placeholder.jpg', alt: 'Zipless Feeding Dupatta Lounge Wear' },
    ]
  }
}

// Specialized fetch for hero images with longer cache TTL and fallback
export async function fetchHeroImages(
  categoryId: string, 
  device: 'mobile' | 'desktop' = 'desktop', 
  limit: number = 6
): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const url = new URL(`${baseUrl}/api/hero-images`)
  url.searchParams.append('categoryId', categoryId)
  url.searchParams.append('device', device)
  url.searchParams.append('limit', limit.toString())
  
  const cacheKey = `hero-images-${categoryId}-${device}-${limit}`
  const cacheTTL = 10 * 60 * 1000 // 10 minutes for hero images
  
  try {
    const response = await safeFetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }, cacheKey, cacheTTL)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return response
  } catch (error) {
    console.warn(`Failed to fetch hero images for ${categoryId}, using fallback data:`, error)
    
    // Return a mock response with fallback data
    const fallbackData = FALLBACK_HERO_IMAGES[categoryId as keyof typeof FALLBACK_HERO_IMAGES]?.[device] || []
    const limitedData = fallbackData.slice(0, limit)
    
    return new Response(JSON.stringify(limitedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Fallback-Data': 'true'
      }
    })
  }
}

// Fallback products data when API is unavailable
const FALLBACK_PRODUCTS = [
  {
    id: 'fallback-1',
    name: 'Maternity Feeding Dress',
    description: 'Comfortable feeding dress for new mothers',
    price: 2999,
    category: 'maternity-feeding-wear',
    images: ['/placeholder.jpg'],
    inStock: true
  },
  {
    id: 'fallback-2',
    name: 'Zipless Lounge Wear',
    description: 'Revolutionary comfort for everyday wear',
    price: 2499,
    category: 'zipless-feeding-lounge-wear',
    images: ['/placeholder.jpg'],
    inStock: true
  },
  {
    id: 'fallback-3',
    name: 'Casual Lounge Wear',
    description: 'Elegant casual wear for comfort',
    price: 1999,
    category: 'non-feeding-lounge-wear',
    images: ['/placeholder.jpg'],
    inStock: true
  }
]

// Specialized fetch for products with caching and fallback
export async function fetchProducts(
  params: Record<string, string> = {},
  forceRefresh: boolean = false
): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const url = new URL(`${baseUrl}/api/products`)
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.append(key, value)
    }
  })
  
  // 🔧 FIX: Add cache busting parameter when force refresh is requested
  if (forceRefresh) {
    url.searchParams.append('_t', Date.now().toString())
  }
  
  const cacheKey = `products-${JSON.stringify(params)}${forceRefresh ? '-fresh' : ''}`
  const cacheTTL = forceRefresh ? 0 : 2 * 60 * 1000 // No cache when force refresh, 2 minutes otherwise
  
  try {
    const response = await safeFetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }, cacheKey, cacheTTL)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return response
  } catch (error) {
    console.warn(`Failed to fetch products, using fallback data:`, error)
    
    // Return a mock response with fallback data
    return new Response(JSON.stringify(FALLBACK_PRODUCTS), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Fallback-Data': 'true'
      }
    })
  }
}

// 🔧 FIX: Function to force refresh products (bypass cache)
export async function fetchProductsFresh(
  params: Record<string, string> = {}
): Promise<Response> {
  return fetchProducts(params, true)
}

// 🔧 FIX: Function to clear product cache
export function clearProductCache(): void {
  apiManager.clearCache()
  console.log('✅ Product cache cleared')
}

// Cleanup cache periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiManager.cleanupCache()
  }, 60 * 1000) // Clean up every minute
} 