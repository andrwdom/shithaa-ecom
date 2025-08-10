"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import OptimizedImage from "./optimized-image"

interface ImageCarouselProps {
  images: string[]
  productName: string
}

export default function ImageCarousel({ images, productName }: ImageCarouselProps) {
  const [selectedImage, setSelectedImage] = useState(0)

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative h-96 lg:h-[500px] bg-white rounded-2xl overflow-hidden shadow-lg group">
        <OptimizedImage
          src={images[selectedImage] || "/placeholder.svg"}
          alt={`${productName} - Image ${selectedImage + 1} of ${images.length}`}
          fill
          priority={selectedImage === 0}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}


      </div>

      {/* Thumbnail Images */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`flex-none w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                selectedImage === index
                  ? "border-pink-400 shadow-lg scale-105"
                  : "border-gray-200 hover:border-pink-300"
              }`}
            >
              <OptimizedImage
                src={image || "/placeholder.svg"}
                alt={`${productName} thumbnail ${index + 1}`}
                width={80}
                height={80}
                loading="lazy"
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
