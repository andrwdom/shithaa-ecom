import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try to reach the main API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://shithaa.in'
    const response = await fetch(`${apiUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add a timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    })

    if (response.ok) {
      return NextResponse.json({ 
        status: 'healthy', 
        mainApi: 'online',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({ 
        status: 'degraded', 
        mainApi: 'error',
        error: `HTTP ${response.status}`,
        timestamp: new Date().toISOString()
      }, { status: 200 })
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
