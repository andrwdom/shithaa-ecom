"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth/AuthContext';
import { authenticatedFetch } from '@/lib/api-utils';
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
    categorySlug?: string
    sizes?: { size: string; stock: number }[]
  }
  addedAt: string
}

interface WishlistContextType {
  wishlistItems: WishlistItem[]
  wishlistCount: number
  isLoading: boolean
  addToWishlist: (productId: string) => Promise<void>
  removeFromWishlist: (productId: string) => Promise<void>
  isInWishlist: (productId: string) => boolean
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [wishlistCount, setWishlistCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

  // Fetch wishlist on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchWishlist()
    } else {
      setWishlistItems([])
      setWishlistCount(0)
    }
  }, [user])

  const fetchWishlist = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      
      console.log('Fetching wishlist from:', `${apiUrl}/api/wishlist`)
      const response = await authenticatedFetch(`${apiUrl}/api/wishlist`)

      console.log('Wishlist response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Wishlist data received:', data)
        setWishlistItems(data.data || [])
        setWishlistCount(data.data?.length || 0)
      } else {
        console.error('Wishlist fetch failed:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addToWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Please sign in to add items to wishlist")
      return
    }

    try {
      console.log('Adding to wishlist:', productId)
      const response = await authenticatedFetch(`${apiUrl}/api/wishlist/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId })
      })

      console.log('Add to wishlist response status:', response.status)
      const data = await response.json()
      console.log('Add to wishlist response data:', data)

      if (response.ok) {
        toast.success(data.message || "Added to wishlist 💖")
        await fetchWishlist() // Refresh wishlist
      } else {
        toast.error(data.message || "Failed to add to wishlist")
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error)
      toast.error("Failed to add to wishlist")
    }
  }

  const removeFromWishlist = async (productId: string) => {
    if (!user) return

    try {
      console.log('Removing from wishlist:', productId)
      const response = await authenticatedFetch(`${apiUrl}/api/wishlist/remove/${productId}`, {
        method: 'DELETE',
      })

      console.log('Remove from wishlist response status:', response.status)
      const data = await response.json()
      console.log('Remove from wishlist response data:', data)

      if (response.ok) {
        toast.success(data.message || "Removed from wishlist")
        await fetchWishlist() // Refresh wishlist
      } else {
        toast.error(data.message || "Failed to remove from wishlist")
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error)
      toast.error("Failed to remove from wishlist")
    }
  }

  const isInWishlist = (productId: string): boolean => {
    return wishlistItems.some(item => item.product && item.product._id === productId)
  }

  const refreshWishlist = async () => {
    await fetchWishlist()
  }

  return (
    <WishlistContext.Provider value={{
      wishlistItems,
      wishlistCount,
      isLoading,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      refreshWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
} 