'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOffline, setShowOffline] = useState(false)

  useEffect(() => {
    const checkOnlineStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://shithaa.in'
        const response = await fetch(`${apiUrl}/api/health`, { 
          method: 'GET',
          mode: 'no-cors' // This will help detect if the server is reachable
        })
        setIsOnline(true)
        setShowOffline(false)
      } catch (error) {
        setIsOnline(false)
        setShowOffline(true)
        
        // Hide the offline message after 10 seconds
        setTimeout(() => setShowOffline(false), 10000)
      }
    }

    // Check immediately
    checkOnlineStatus()

    // Check every 30 seconds
    const interval = setInterval(checkOnlineStatus, 30000)

    return () => clearInterval(interval)
  }, [])

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