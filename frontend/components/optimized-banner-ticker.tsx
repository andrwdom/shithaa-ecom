"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface OptimizedBannerTickerProps {
  messages: string[]
  speed?: number // pixels per second
  className?: string
}

export default function OptimizedBannerTicker({
  messages,
  speed = 50, // Default 50 pixels per second
  className = ''
}: OptimizedBannerTickerProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [position, setPosition] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [contentWidth, setContentWidth] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  // Detect mobile and setup responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Setup intersection observer for performance
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    observer.observe(containerRef.current)
    
    return () => observer.disconnect()
  }, [])

  // Calculate dimensions
  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return

    const updateDimensions = () => {
      const container = containerRef.current
      const content = contentRef.current
      
      if (container && content) {
        setContainerWidth(container.offsetWidth)
        setContentWidth(content.scrollWidth)
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    
    return () => window.removeEventListener('resize', updateDimensions)
  }, [messages])

  // Optimized animation loop using requestAnimationFrame
  const animate = useCallback((currentTime: number) => {
    if (!isVisible || !containerWidth || !contentWidth) {
      animationRef.current = requestAnimationFrame(animate)
      return
    }

    const deltaTime = currentTime - lastTimeRef.current
    lastTimeRef.current = currentTime

    // Calculate movement based on time and speed
    const movement = (speed * deltaTime) / 1000
    const newPosition = position - movement

    // Reset position when content has scrolled completely
    if (Math.abs(newPosition) >= contentWidth / 4) {
      setPosition(0)
    } else {
      setPosition(newPosition)
    }

    animationRef.current = requestAnimationFrame(animate)
  }, [isVisible, containerWidth, contentWidth, position, speed])

  // Start/stop animation based on visibility
  useEffect(() => {
    if (isVisible && containerWidth && contentWidth) {
      lastTimeRef.current = performance.now()
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, containerWidth, contentWidth, animate])

  // Pause animation on hover (desktop only)
  const handleMouseEnter = useCallback(() => {
    if (!isMobile && animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }, [isMobile])

  const handleMouseLeave = useCallback(() => {
    if (!isMobile && isVisible && containerWidth && contentWidth) {
      lastTimeRef.current = performance.now()
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [isMobile, isVisible, containerWidth, contentWidth, animate])

  // Duplicate messages for seamless loop
  const duplicatedMessages = [...messages, ...messages]

  return (
    <div
      ref={containerRef}
      className={`banner-ticker-container overflow-hidden relative w-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={contentRef}
        className="banner-ticker flex whitespace-nowrap"
        style={{
          transform: `translate3d(${position}px, 0, 0)`,
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          perspective: '1000px'
        }}
      >
        {duplicatedMessages.map((message, index) => (
          <div
            key={index}
            className="banner-message flex-shrink-0 text-center font-medium px-4"
            style={{
              width: `${100 / duplicatedMessages.length}%`,
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              padding: isMobile ? '0 0.5rem' : '0 1rem'
            }}
          >
            {message}
          </div>
        ))}
      </div>
    </div>
  )
}

// Default messages
const defaultMessages = [
  "‼ FREE DELIVERY FOR LOUNGE WEAR WITHIN TAMIL NADU ‼",
  "🔥 BUY 3 LOUNGE WEAR @1299RS 🔥",
  "🎉 PREMIUM MATERNITY WEAR - ELEGANT & COMFORTABLE 🎉"
]

// Export with default props
export function DefaultBannerTicker({ className }: { className?: string }) {
  return (
    <OptimizedBannerTicker
      messages={defaultMessages}
      speed={isMobile ? 40 : 50} // Slower on mobile for better performance
      className={className}
    />
  )
}
