"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Heart, ShoppingBag, Trash2, Eye } from "lucide-react"
import Image from "next/image"
import { useWishlist } from "@/components/wishlist-context"
import { useAuth } from "@/components/auth/useAuth"
import { useCart } from "@/components/cart-context"
import LoginModal from "@/components/auth/LoginModal"
import { toast } from "sonner"

interface WishlistItem {
  _id: string
  product: {
    _id: string
    name: string
    price: number
    originalPrice?: number
    images: string[]
    description?: string
    category?: string
  }
  addedAt: string
}

export default function WishlistPageClient() {
  // Temporarily disable context usage to isolate the issue
  // const { wishlistItems, removeFromWishlist, isLoading } = useWishlist()
  // const { user } = useAuth()
  // const { addToCart } = useCart()
  
  // Use simple state instead
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('WishlistPageClient - Simplified version loaded')
  }, [])

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      console.log('Remove from wishlist:', productId)
    } catch (error) {
      console.error('Error removing from wishlist:', error)
    }
  }

  const handleAddToCart = (item: WishlistItem) => {
    console.log('Add to cart:', item)
    toast.success("Added to cart!")
  }

  const handleViewProduct = (productId: string) => {
    window.location.href = `/product/${productId}`
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-pink-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Sign in to view your wishlist</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Create an account or sign in to save your favorite items and view your wishlist.
            </p>
            <Button 
              onClick={() => setShowLogin(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold"
            >
              Sign In
            </Button>
          </div>
        </div>
        <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" onClick={() => window.history.back()} className="mr-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">My Wishlist</h1>
            <div className="ml-auto">
              <span className="text-sm text-gray-500">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="loading loading-spinner loading-lg text-pink-600"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading your wishlist...</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-pink-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your wishlist is empty</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start adding your favorite items to your wishlist. Browse our collection and click the heart icon to save items you love.
            </p>
            <div className="space-x-4">
              <Button 
                onClick={() => window.location.href = "/collections"}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Browse Collections
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = "/collections/new-arrivals"}
                className="px-6 py-3 rounded-xl font-semibold"
              >
                New Arrivals
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Wishlist Items</h2>
            <p className="text-gray-600">Wishlist functionality is working!</p>
          </div>
        )}
      </div>

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />
    </div>
  )
} 