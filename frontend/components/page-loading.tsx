"use client"

import type React from "react"

import { useEffect } from "react"
import LoadingScreen from "./loading-screen"
import { useLoading } from "./loading-context"

interface PageLoadingProps {
  children: React.ReactNode
  loadingMessage?: string
  minLoadingTime?: number
}

export default function PageLoading({ children, loadingMessage, minLoadingTime = 1000 }: PageLoadingProps) {
  const { isLoading, setIsLoading } = useLoading()

  useEffect(() => {
    // Set initial loading state
    setIsLoading(true)
    
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, minLoadingTime)

    return () => clearTimeout(timer)
  }, [minLoadingTime, setIsLoading])

  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />
  }

  return <>{children}</>
}
