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
    customId?: string // Add customId for routing
    name: string
    price: number
    originalPrice?: number
    images: string[]
    description?: string
    category?: string
    categorySlug?: string
    sizes?: { size: string; stock: number }[]
  }
  addedAt: string
}

export default function WishlistPageClient() {
  const { wishlistItems, removeFromWishlist, isLoading } = useWishlist()
  const { user } = useAuth()
  const { addToCart } = useCart()
  const [showLogin, setShowLogin] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('WishlistPageClient - User:', user)
    console.log('WishlistPageClient - Wishlist items:', wishlistItems)
    console.log('WishlistPageClient - Loading:', isLoading)
  }, [user, wishlistItems, isLoading])

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      await removeFromWishlist(productId)
    } catch (error) {
      console.error('Error removing from wishlist:', error)
    }
  }

  const handleAddToCart = (item: WishlistItem) => {
    if (!user) {
      setShowLogin(true)
      return
    }

    if (!item.product) {
      toast.error("Product data not available")
      return
    }

    // Check if product has stock information
    const defaultSize = "M"; // Default size
    const sizeData = item.product.sizes?.find((s: any) => s.size === defaultSize);
    const stock = sizeData?.stock || 0;
    
    if (stock <= 0) {
      toast.error("This item is out of stock");
      return;
    }

    addToCart({
      id: item.product._id,
      _id: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: 1,
      size: defaultSize, // Default size, user can change later
      image: item.product.images[0] || "/placeholder.svg",
      category: item.product.category,
      categorySlug: item.product.categorySlug,
    }, false, stock) // Pass stock for validation
    
    toast.success("Added to cart!")
  }

  const handleViewProduct = (productId: string) => {
    window.location.href = `/product/${productId}`
  }

  if (!user) {
    return (
      <div className="bg-gray-50 flex-1">
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
    <>
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

      <div className="bg-gray-50 flex-1">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.filter(item => item.product).map((item) => (
              <Card key={item._id} className="group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-64 bg-gradient-to-br from-pink-50 to-purple-50 overflow-hidden">
                    <Image
                      src={item.product.images[0] || "/placeholder.svg"}
                      alt={item.product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay buttons */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <Button 
                        size="sm" 
                        className="rounded-full bg-pink-500 hover:bg-pink-600 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewProduct(item.product.customId || item.product._id)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="rounded-full bg-green-500 hover:bg-green-600 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToCart(item)
                        }}
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="rounded-full shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFromWishlist(item.product._id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Discount badge */}
                    {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                      <div className="absolute top-4 left-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        {Math.round(((item.product.originalPrice - item.product.price) / item.product.originalPrice) * 100)}% OFF
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{item.product.category || "Fashion"}</p>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-pink-500 transition-colors line-clamp-2">
                        {item.product.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900">₹{item.product.price.toLocaleString()}</span>
                      {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                        <span className="text-sm text-gray-500 line-through">₹{item.product.originalPrice.toLocaleString()}</span>
                      )}
                    </div>

                    {item.product.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{item.product.description}</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 group-hover:bg-pink-400 group-hover:text-white group-hover:border-pink-400 transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewProduct(item.product.customId || item.product._id)
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddToCart(item)
                        }}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />
    </>
  )
} 