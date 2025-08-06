"use client"

import { useState, useEffect } from "react"
import LoadingScreen from "./loading-screen"

interface InitialLoadingProps {
  children: React.ReactNode
}

export default function InitialLoading({ children }: InitialLoadingProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Show loading screen for at least 2 seconds
    const loadingTimer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    // Add a small delay before showing content to ensure smooth transition
    const contentTimer = setTimeout(() => {
      setShowContent(true)
    }, 2500)

    return () => {
      clearTimeout(loadingTimer)
      clearTimeout(contentTimer)
    }
  }, [])

  if (isLoading) {
    return <LoadingScreen message="Welcome to Shithaa..." />
  }

  if (!showContent) {
    return <div className="fixed inset-0 bg-white z-40" />
  }

  return <>{children}</>
} 