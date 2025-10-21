import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try to reach the main API with increased timeout and retry logic
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://shithaa.in'
    
    // Retry up to 3 times with exponential backoff
    let lastError: any = null
    let response: Response | null = null
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await fetch(`${apiUrl}/api/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Increased timeout from 5s to 10s for better reliability
          signal: AbortSignal.timeout(10000),
          // Prevent caching to get real status
          cache: 'no-store'
        })
        
        // If we get a response, break out of retry loop
        if (response) break
      } catch (err) {
        lastError = err
        // If not the last attempt, wait before retrying
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    if (response && response.ok) {
      return NextResponse.json({ 
        status: 'healthy', 
        mainApi: 'online',
        timestamp: new Date().toISOString()
      })
    } else if (response) {
      return NextResponse.json({ 
        status: 'degraded', 
        mainApi: 'error',
        error: `HTTP ${response.status}`,
        timestamp: new Date().toISOString()
      }, { status: 200 })
    } else {
      throw lastError || new Error('No response received')
    }
  } catch (error) {
    return NextResponse.json({ 
      status: 'offline', 
      mainApi: 'unreachable',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 200 })
  }
}
