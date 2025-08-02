"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/useAuth"
import { useWishlist } from "@/components/wishlist-context"
import LoginModal from "@/components/auth/LoginModal"
import { toast } from "sonner"
import { Package, Calendar, Heart, MapPin, Phone, Mail, User, LogOut } from "lucide-react"
import { getIdToken } from "firebase/auth"
import OrderHistory from "./OrderHistory"

interface Order {
  _id: string
  items: Array<{
    name: string
    price: number
    quantity: number
    size: string
    image: string[]
  }>
  amount: number
  status: string
  payment: boolean
  paymentMethod: string
  date: string
  address: {
    firstName: string
    lastName: string
    street: string
    city: string
    state: string
    zipcode: string
    country: string
    phone: string
  }
}

interface UserProfile {
  name: string
  email: string
  uid: string
}

export default function AccountPageClient() {
  const { user, loading: authLoading, logout } = useAuth()
  const { wishlistCount } = useWishlist()
  const [showLogin, setShowLogin] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [orderCount, setOrderCount] = useState<number>(0)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [uniquePaymentMethods, setUniquePaymentMethods] = useState<number>(0)
  const [memberSince, setMemberSince] = useState<string>("")

  useEffect(() => {
    checkAuthAndLoadData()
    if (user && user.metadata && user.metadata.creationTime) {
      const date = new Date(user.metadata.creationTime)
      setMemberSince(date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
    }
  }, [user, authLoading])

  async function ensureBackendToken() {
    const token = localStorage.getItem("token")
    if (token) return token
    if (!user) return null
    // Try to get a new backend token using Firebase ID token
    try {
      const idToken = await getIdToken(user)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/user/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()
      if (data.success && data.data.token) {
        localStorage.setItem("token", data.data.token)
        return data.data.token
      }
    } catch (err) {
      // ignore
    }
    return null
  }

  async function checkAuthAndLoadData() {
    console.log("checkAuthAndLoadData called:", { user: !!user, authLoading })
    
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    if (!user) {
      console.log("No user found, showing login modal")
      setLoading(false)
      setShowLogin(true)
      return
    }

    try {
      console.log("User authenticated, setting profile from Firebase Auth")
      // Use Firebase Auth data directly
      setUserProfile({
        name: user.displayName || "User",
        email: user.email || "",
        uid: user.uid
      })
      if (user.metadata && user.metadata.creationTime) {
        const date = new Date(user.metadata.creationTime)
        setMemberSince(date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
      }

      // Ensure backend JWT token is available
      const token = await ensureBackendToken()
      if (token) {
        // Fetch order count
        const countRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/orders/user/count`, {
          headers: { token }
        })
        if (countRes.ok) {
          const countData = await countRes.json()
          if (countData.success) {
            setOrderCount(countData.count)
          }
        }
        // Fetch all orders for this email
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/orders/by-email/${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (res.ok && data.orders) {
          // Robust date sorting: prefer createdAt, then date, then orderDate, then updatedAt
          const getOrderDate = (order: any) => order.createdAt || order.date || order.orderDate || order.updatedAt || 0;
          const sortedOrders = data.orders.slice().sort((a: any, b: any) => new Date(getOrderDate(b)).getTime() - new Date(getOrderDate(a)).getTime());
          setOrders(sortedOrders);
          // Calculate unique payment methods
          const methods = new Set(sortedOrders.map((o: any) => o.paymentMethod && o.paymentMethod.toLowerCase()))
          setUniquePaymentMethods(methods.has(undefined) ? methods.size - 1 : methods.size)
        } else {
          setOrders([]);
          setUniquePaymentMethods(0)
        }
      } else {
        console.log("No token found in localStorage and could not refresh it")
      }
    } catch (error) {
      console.error("Error fetching account data:", error)
      toast.error("Failed to load account information")
    } finally {
      setLoading(false)
      setOrdersLoading(false)
    }
  }

  function handleLoginSuccess() {
    setShowLogin(false)
    // The useEffect will automatically reload data when user changes
  }

  async function handleLogout() {
    try {
      await logout()
      // Don't set showLogin to true here - let the AuthContext handle the redirect
      // The logout function in AuthContext will show the toast and redirect to home
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to logout. Please try again.")
    }
  }

  function formatDate(dateString: string | number) {
    const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case "delivered":
        return "text-green-700 bg-green-100 border border-green-200"
      case "shipped":
      case "out for delivery":
        return "text-blue-700 bg-blue-100 border border-blue-200"
      case "packing":
        return "text-purple-700 bg-purple-100 border border-purple-200"
      case "pending":
        return "text-yellow-700 bg-yellow-100 border border-yellow-200"
      case "cancelled":
        return "text-red-700 bg-red-100 border border-red-200"
      default:
        return "text-gray-700 bg-gray-100 border border-gray-200"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-[rgb(71,60,102)]"></div>
          <p className="mt-4 text-gray-600">Loading your account...</p>
        </div>
      </div>
    )
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Shithaa</h2>
            <p className="text-gray-600">Sign in to access your account</p>
          </div>
          <LoginModal open={true} onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-pink-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">{userProfile?.name}</h1>
                <p className="text-gray-500 text-sm">{userProfile?.email}</p>
                <div className="space-y-1">
                  <p className="text-sm text-purple-600 font-medium">You deserve comfort, care & style 💜</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-all duration-200 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center">
                <Package className="w-7 h-7 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{orderCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Member Since</p>
                <p className="text-3xl font-bold text-gray-900">{memberSince || "-"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => window.location.href = '/wishlist'}>
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <Heart className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Wishlist</p>
                <p className="text-3xl font-bold text-gray-900">{wishlistCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-pink-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
            {orders.length > 0 && (
              <p className="text-sm text-gray-500 italic">
                You've placed <span className="font-semibold text-pink-600">{orderCount} orders</span> since <span className="font-semibold text-green-600">{memberSince}</span>. Thank you for being a valued customer 🌸
              </p>
            )}
          </div>
          
          {ordersLoading ? (
            <div className="text-center py-12">
              <div className="loading loading-spinner loading-lg text-pink-600"></div>
              <p className="mt-4 text-gray-600 font-medium">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No orders yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Start shopping to see your order history here. We have beautiful maternity wear waiting for you!</p>
              <a href="/collections/maternity-feeding-wear" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Start Shopping
              </a>
            </div>
          ) : (
            <OrderHistory orders={orders} />
          )}
        </div>
      </div>
    </div>
  )
} 