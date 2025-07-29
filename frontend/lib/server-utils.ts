// Server-side utilities for handling API calls and errors
export function getApiUrl(): string {
  // Check if we're on server-side
  const isServer = typeof window === 'undefined';

  if (process.env.NODE_ENV === 'production') {
    if (isServer) {
      // For server-side rendering in production, use internal backend URL
      return 'http://localhost:4000';
    } else {
      // For client-side in production, use the public API URL
      return process.env.NEXT_PUBLIC_API_URL || 'https://shithaa.in';
    }
  }

  // In development, always use localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

export function isServerSide(): boolean {
  return typeof window === 'undefined';
}

export function logError(message: string, error?: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, error);
  } else {
    // In production, you might want to send errors to a logging service
    // For now, we'll just log the message without sensitive details
    console.error(message);
  }
}

// Safe server-side fetch with timeout and error handling
export async function serverFetch(url: string, options?: RequestInit): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Shithaa-Server/1.0',
        ...options?.headers,
      },
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    logError('Server fetch error:', error);
    return null;
  }
}

// Fallback metadata for when API calls fail
export const fallbackMetadata = {
  title: "Premium Maternity Wear - Shithaa",
  description: "Discover elegant maternity wear and feeding essentials at Shithaa. Premium quality, comfortable designs for expecting mothers.",
  keywords: [
    "maternity wear",
    "feeding wear", 
    "pregnancy clothes",
    "maternity fashion",
    "nursing wear",
    "maternity dresses",
    "comfortable maternity clothes"
  ]
};
