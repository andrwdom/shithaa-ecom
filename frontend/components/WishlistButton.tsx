"use client"
import { useState } from "react"
import { Heart } from "lucide-react"
import { useWishlist } from "./wishlist-context"

interface WishlistButtonProps {
  productId: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export default function WishlistButton({ productId, className = "", size = "md" }: WishlistButtonProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist()
  const [isLoading, setIsLoading] = useState(false)

  const isWishlisted = isInWishlist(productId)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading) return

    setIsLoading(true)
    try {
      if (isWishlisted) {
        await removeFromWishlist(productId)
      } else {
        await addToWishlist(productId)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10", 
    lg: "w-12 h-12"
  }

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-full
        transition-all duration-200
        hover:scale-110
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-pink-500/20
        ${isWishlisted 
          ? 'bg-pink-500 text-white shadow-lg hover:bg-pink-600' 
          : 'bg-white text-gray-400 border border-gray-200 hover:border-pink-300 hover:text-pink-500'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart 
        className={`${iconSizes[size]} ${isWishlisted ? 'fill-current' : ''}`}
        strokeWidth={isWishlisted ? 0 : 2}
      />
    </button>
  )
} 