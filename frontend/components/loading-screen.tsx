"use client"

import Image from "next/image"

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      {/* Logo with fade animation */}
      <div className="mb-8">
        <Image
          src="/shitha-logo.jpg"
          alt="Shitha Clothing"
          width={200}
          height={200}
          className="animate-fade-pulse"
          priority
        />
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
