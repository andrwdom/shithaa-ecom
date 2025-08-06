"use client"

import Image from "next/image"
import { useState, useEffect } from "react"

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  const [logoError, setLogoError] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [logoSrc, setLogoSrc] = useState("/shithaa-logo.jpg")

  useEffect(() => {
    // Try to preload the logo
    const img = new Image()
    img.onload = () => {
      console.log('Logo preloaded successfully')
      setLogoLoaded(true)
    }
    img.onerror = () => {
      console.error('Logo failed to preload, trying placeholder')
      setLogoSrc("/placeholder-logo.png")
      setLogoError(true)
    }
    img.src = "/shithaa-logo.jpg"
  }, [])

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      {/* Logo with fade animation */}
      <div className="mb-8 relative">
        <Image
          src={logoSrc}
          alt="Shitha Clothing"
          width={200}
          height={200}
          className={`transition-all duration-1000 ${
            logoLoaded ? 'animate-fade-pulse' : 'opacity-50'
          }`}
          priority
          onError={() => {
            console.error('Failed to load logo, using placeholder');
            setLogoSrc("/placeholder-logo.png");
            setLogoError(true);
          }}
          onLoad={() => {
            console.log('Logo loaded successfully');
            setLogoLoaded(true);
          }}
          style={{
            animation: logoLoaded ? 'fade-pulse 3s ease-in-out infinite' : 'none',
            filter: logoLoaded ? 'none' : 'grayscale(50%)'
          }}
        />
        
        {/* Fallback logo if Next.js Image fails */}
        {logoError && (
          <img
            src="/placeholder-logo.png"
            alt="Shitha Clothing"
            className="absolute inset-0 w-full h-full object-contain animate-fade-pulse"
            style={{
              animation: 'fade-pulse 3s ease-in-out infinite'
            }}
          />
        )}
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute -bottom-8 left-0 right-0 text-xs text-gray-500 text-center">
            Logo: {logoError ? 'Error' : 'Loading...'} | Loaded: {logoLoaded ? 'Yes' : 'No'} | Src: {logoSrc}
          </div>
        )}
      </div>

      {/* Loading message */}
      <div className="text-center">
        <p className="text-[rgb(71,60,102)] font-medium text-lg font-serif animate-pulse">{message}</p>

        {/* Loading dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div
            className="w-2 h-2 bg-[rgb(71,60,102)] rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-[rgb(71,60,102)] rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-[rgb(71,60,102)] rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    </div>
  )
}
