"use client"

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ImageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Image Error Boundary caught an error:', error, errorInfo)
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center w-full h-full min-h-[200px] bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Image unavailable</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for handling image errors
export function useImageErrorHandler() {
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget
    console.warn(`Image failed to load: ${img.src}`)
    
    // Set a fallback image or hide the element
    img.style.display = 'none'
    
    // Optionally show a placeholder
    const placeholder = document.createElement('div')
    placeholder.className = 'w-full h-full bg-gray-200 rounded-lg flex items-center justify-center'
    placeholder.innerHTML = `
      <div class="text-center">
        <div class="w-8 h-8 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <p class="text-xs text-gray-500">Image unavailable</p>
      </div>
    `
    
    img.parentNode?.insertBefore(placeholder, img.nextSibling)
  }

  return { handleImageError }
} 