"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import ResponsiveContainer from './responsive-container'

interface ResponsiveSectionProps {
  children: React.ReactNode
  className?: string
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  background?: 'white' | 'gray' | 'brand' | 'gradient'
}

const paddingClasses = {
  none: 'py-0',
  sm: 'py-8 sm:py-12',
  md: 'py-12 sm:py-16 lg:py-20',
  lg: 'py-16 sm:py-20 lg:py-24 xl:py-32',
  xl: 'py-20 sm:py-24 lg:py-32 xl:py-40'
}

const backgroundClasses = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  brand: 'bg-[rgb(71,60,102)]',
  gradient: 'bg-gradient-to-br from-pink-50 via-white to-purple-50'
}

export default function ResponsiveSection({ 
  children, 
  className,
  containerSize = 'xl',
  padding = 'md',
  background = 'white'
}: ResponsiveSectionProps) {
  return (
    <section className={cn(
      'w-full',
      paddingClasses[padding],
      backgroundClasses[background],
      className
    )}>
      <ResponsiveContainer size={containerSize}>
        {children}
      </ResponsiveContainer>
    </section>
  )
}
