"use client"

import React from 'react'

interface PlaceholderImageProps {
  width?: number
  height?: number
  className?: string
  text?: string
  bgColor?: string
  textColor?: string
}

export default function PlaceholderImage({
  width = 300,
  height = 400,
  className = '',
  text = 'Image',
  bgColor = '#f3f4f6',
  textColor = '#9ca3af'
}: PlaceholderImageProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        width: width,
        height: height,
        backgroundColor: bgColor,
        color: textColor
      }}
    >
      <div className="text-center">
        <svg
          className="w-16 h-16 mx-auto mb-2 opacity-50"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium">{text}</p>
      </div>
    </div>
  )
} 