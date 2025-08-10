"use client"

import React, { useState, useEffect } from 'react'

interface DebugHeroImagesProps {
  categorySlug: string
}

export default function DebugHeroImages({ categorySlug }: DebugHeroImagesProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testEndpoint = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const url = `${baseUrl}/api/hero-images?categoryId=${categorySlug}&limit=3`
      
      console.log('Testing URL:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      setDebugInfo({
        url,
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries())
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testHealth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const url = `${baseUrl}/api/hero-images/health`
      
      const response = await fetch(url)
      const data = await response.json()
      
      setDebugInfo({
        url,
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries())
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-50">
      <h3 className="font-bold text-sm mb-2">Debug Hero Images</h3>
      <div className="space-y-2">
        <button
          onClick={testEndpoint}
          disabled={loading}
          className="px-3 py-1 bg-blue-500 text-white text-xs rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Endpoint'}
        </button>
        
        <button
          onClick={testHealth}
          disabled={loading}
          className="px-3 py-1 bg-green-500 text-white text-xs rounded disabled:opacity-50 ml-2"
        >
          {loading ? 'Testing...' : 'Test Health'}
        </button>
        
        {error && (
          <div className="text-red-500 text-xs">{error}</div>
        )}
        
        {debugInfo && (
          <div className="text-xs space-y-1">
            <div><strong>URL:</strong> {debugInfo.url}</div>
            <div><strong>Status:</strong> {debugInfo.status} {debugInfo.statusText}</div>
            <div><strong>Response:</strong></div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(debugInfo.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
} 