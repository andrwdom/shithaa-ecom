"use client"

import type React from "react"

import { useEffect, useState } from "react"
import LoadingScreen from "./loading-screen"

interface PageLoadingProps {
  children: React.ReactNode
  loadingMessage?: string
  minLoadingTime?: number
}

export default function PageLoading({ children, loadingMessage, minLoadingTime = 1000 }: PageLoadingProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, minLoadingTime)

    return () => clearTimeout(timer)
  }, [minLoadingTime])

  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />
  }

  return <>{children}</>
}
