import { useEffect, useRef, useState, useCallback } from 'react'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  droppedFrames: number
  isSmooth: boolean
}

export function usePerformanceMonitor(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    droppedFrames: 0,
    isSmooth: true
  })
  
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const frameTimeHistoryRef = useRef<number[]>([])
  const animationFrameRef = useRef<number>()

  const measureFrame = useCallback(() => {
    if (!enabled) return

    const currentTime = performance.now()
    const deltaTime = currentTime - lastTimeRef.current
    
    if (deltaTime > 0) {
      frameTimeHistoryRef.current.push(deltaTime)
      
      // Keep only last 60 frames for averaging
      if (frameTimeHistoryRef.current.length > 60) {
        frameTimeHistoryRef.current.shift()
      }
      
      const avgFrameTime = frameTimeHistoryRef.current.reduce((a, b) => a + b, 0) / frameTimeHistoryRef.current.length
      const fps = 1000 / avgFrameTime
      
      // Count dropped frames (frames that took longer than 16.67ms)
      const droppedFrames = frameTimeHistoryRef.current.filter(time => time > 20).length
      
      setMetrics({
        fps: Math.round(fps),
        frameTime: Math.round(avgFrameTime * 100) / 100,
        droppedFrames,
        isSmooth: fps >= 55 && droppedFrames < 5
      })
    }
    
    lastTimeRef.current = currentTime
    frameCountRef.current++
    
    animationFrameRef.current = requestAnimationFrame(measureFrame)
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(measureFrame)
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [enabled, measureFrame])

  const pauseMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  const resumeMonitoring = useCallback(() => {
    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(measureFrame)
    }
  }, [enabled, measureFrame])

  return {
    metrics,
    pauseMonitoring,
    resumeMonitoring,
    isMonitoring: enabled
  }
} 