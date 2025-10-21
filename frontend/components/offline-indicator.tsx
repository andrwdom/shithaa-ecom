'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOffline, setShowOffline] = useState(false)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  useEffect(() => {
    const checkOnlineStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://shithaa.in'
        
        // Retry up to 2 times before declaring offline
        let lastError: any = null
        let success = false
        
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
            
            const response = await fetch(`${apiUrl}/api/health`, { 
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
              signal: controller.signal,
              cache: 'no-store'
            })
            
            clearTimeout(timeoutId)
            
            if (response.ok) {
              success = true
              break
            }
          } catch (err) {
            lastError = err
            // Wait 1 second before retry
            if (attempt < 1) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          }
        }
        
        if (success) {
          setConsecutiveFailures(0)
          setIsOnline(true)
          setShowOffline(false)
        } else {
          throw lastError || new Error('Health check failed')
        }
      } catch (error) {
        // Increment failure count
        const newFailureCount = consecutiveFailures + 1
        setConsecutiveFailures(newFailureCount)
        
        // Only show offline banner after 2 consecutive failures
        // This prevents false positives from temporary network blips
        if (newFailureCount >= 2) {
          setIsOnline(false)
          setShowOffline(true)
          
          // Hide the offline message after 15 seconds (increased from 10)
          setTimeout(() => setShowOffline(false), 15000)
        }
      }
    }

    // Check immediately
    checkOnlineStatus()

    // Check every 60 seconds (increased from 30) to reduce server load
    const interval = setInterval(checkOnlineStatus, 60000)

    return () => clearInterval(interval)
  }, [consecutiveFailures])

  if (!showOffline) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              {isOnline ? 'Connection Restored' : 'API Temporarily Unavailable'}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              {isOnline 
                ? 'Your connection has been restored.'
                : 'Showing fallback data. Some features may be limited.'
              }
            </p>
          </div>
          <button
            onClick={() => setShowOffline(false)}
            className="flex-shrink-0 text-amber-400 hover:text-amber-600"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
      </div>
    </div>
  )
} 