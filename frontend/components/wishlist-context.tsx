"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useAuth } from "./auth/useAuth"
import { toast } from "sonner"

interface WishlistItem {
  _id: string
  product: {
    _id: string
    name: string
    price: number
    images: string[]
    description?: string
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
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${apiUrl}/api/wishlist`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setWishlistItems(data.data || [])
        setWishlistCount(data.data?.length || 0)
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
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error("Please sign in to add items to wishlist")
        return
      }

      const response = await fetch(`${apiUrl}/api/wishlist/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId })
      })

      const data = await response.json()

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
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${apiUrl}/api/wishlist/remove/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

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
    return wishlistItems.some(item => item.product._id === productId)
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