import { useEffect, useRef, useCallback } from 'react'
import { useState } from 'react'

interface VisibilityChangeCallbacks {
  onHidden?: () => void
  onVisible?: () => void
  onPageHide?: () => void
  onPageShow?: () => void
}

export function useVisibilityChange(callbacks: VisibilityChangeCallbacks = {}) {
  const { onHidden, onVisible, onPageHide, onPageShow } = callbacks
  const isVisibleRef = useRef(true)

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      isVisibleRef.current = false
      if (onHidden) {
        onHidden()
      }
    } else {
      isVisibleRef.current = true
      if (onVisible) {
        onVisible()
      }
    }
  }, [onHidden, onVisible])

  const handlePageHide = useCallback(() => {
    isVisibleRef.current = false
    if (onPageHide) {
      onPageHide()
    }
  }, [onPageHide])

  const handlePageShow = useCallback(() => {
    isVisibleRef.current = true
    if (onPageShow) {
      onPageShow()
    }
  }, [onPageShow])

  useEffect(() => {
    // Listen for visibility change events
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Listen for page hide/show events (for mobile browsers)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)
    
    // Listen for focus/blur events (for when user switches tabs)
    window.addEventListener('focus', handlePageShow)
    window.addEventListener('blur', handlePageHide)
    
    // Listen for resize events to detect orientation changes
    const handleResize = () => {
      // Small delay to ensure orientation change is complete
      setTimeout(() => {
        if (onVisible && !document.hidden) {
          onVisible()
        }
      }, 100)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('focus', handlePageShow)
      window.removeEventListener('blur', handlePageHide)
      window.removeEventListener('resize', handleResize)
    }
  }, [handleVisibilityChange, handlePageHide, handlePageShow, onVisible])

  return {
    isVisible: isVisibleRef.current,
    isHidden: !isVisibleRef.current
  }
}

// Hook specifically for pausing animations
export function useAnimationPause() {
  const [isPaused, setIsPaused] = useState(false)
  
  const { isVisible } = useVisibilityChange({
    onHidden: () => setIsPaused(true),
    onVisible: () => setIsPaused(false)
  })

  useEffect(() => {
    setIsPaused(!isVisible)
  }, [isVisible])

  return isPaused
} 