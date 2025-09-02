"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  type?: 'products' | 'content' | 'features'
}

const gapClasses = {
  sm: 'gap-2 sm:gap-3',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
  xl: 'gap-8 sm:gap-12'
}

const getGridCols = (cols: ResponsiveGridProps['cols'], type: ResponsiveGridProps['type']) => {
  if (type === 'products') {
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
  }
  
  if (type === 'features') {
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  }
  
  if (type === 'content') {
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }
  
  if (cols) {
    const { default: defaultCols = 1, sm, md, lg, xl, '2xl': xl2 } = cols
    return cn(
      `grid-cols-${defaultCols}`,
      sm && `sm:grid-cols-${sm}`,
      md && `md:grid-cols-${md}`,
      lg && `lg:grid-cols-${lg}`,
      xl && `xl:grid-cols-${xl}`,
      xl2 && `2xl:grid-cols-${xl2}`
    )
  }
  
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
}

export default function ResponsiveGrid({ 
  children, 
  className, 
  cols,
  gap = 'md',
  type
}: ResponsiveGridProps) {
  return (
    <div className={cn(
      'grid',
      getGridCols(cols, type),
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}
