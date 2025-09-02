"use client"

import { useState, useEffect } from 'react'

interface BreakpointState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  screenWidth: number
  screenHeight: number
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

export function useResponsive(): BreakpointState {
  const [state, setState] = useState<BreakpointState>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
    breakpoint: 'sm'
  })

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      let breakpoint: keyof typeof breakpoints = 'sm'
      if (width >= breakpoints['2xl']) breakpoint = '2xl'
      else if (width >= breakpoints.xl) breakpoint = 'xl'
      else if (width >= breakpoints.lg) breakpoint = 'lg'
      else if (width >= breakpoints.md) breakpoint = 'md'
      else if (width >= breakpoints.sm) breakpoint = 'sm'
      else breakpoint = 'xs'

      setState({
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
        isLargeDesktop: width >= breakpoints.xl,
        screenWidth: width,
        screenHeight: height,
        breakpoint
      })
    }

    // Initial state
    updateState()

    // Add event listener
    window.addEventListener('resize', updateState)

    // Cleanup
    return () => window.removeEventListener('resize', updateState)
  }, [])

  return state
}

// Utility functions for responsive behavior
export const useResponsiveUtils = () => {
  const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive()

  const getResponsiveValue = <T>(values: {
    mobile?: T
    tablet?: T
    desktop?: T
    default: T
  }): T => {
    if (isMobile && values.mobile !== undefined) return values.mobile
    if (isTablet && values.tablet !== undefined) return values.tablet
    if (isDesktop && values.desktop !== undefined) return values.desktop
    return values.default
  }

  const getBreakpointValue = <T>(values: Partial<Record<keyof typeof breakpoints, T>>, defaultValue: T): T => {
    return values[breakpoint] ?? defaultValue
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
    getResponsiveValue,
    getBreakpointValue
  }
}
