"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveTextProps {
  children: React.ReactNode
  className?: string
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'brand'
  align?: 'left' | 'center' | 'right'
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm sm:text-base',
  base: 'text-base sm:text-lg lg:text-xl',
  lg: 'text-lg sm:text-xl lg:text-2xl',
  xl: 'text-xl sm:text-2xl lg:text-3xl xl:text-4xl',
  '2xl': 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl',
  '3xl': 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl'
}

const weightClasses = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
}

const colorClasses = {
  primary: 'text-gray-900',
  secondary: 'text-gray-600',
  muted: 'text-gray-500',
  accent: 'text-pink-500',
  brand: 'text-[rgb(71,60,102)]'
}

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

export default function ResponsiveText({ 
  children, 
  className, 
  size = 'base',
  weight = 'normal',
  color = 'primary',
  align = 'left',
  as: Component = 'p'
}: ResponsiveTextProps) {
  return (
    <Component className={cn(
      sizeClasses[size],
      weightClasses[weight],
      colorClasses[color],
      alignClasses[align],
      className
    )}>
      {children}
    </Component>
  )
}
