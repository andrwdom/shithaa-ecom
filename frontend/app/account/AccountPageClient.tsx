"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/useAuth"
import { useWishlist } from "@/components/wishlist-context"
import LoginModal from "@/components/auth/LoginModal"
import { toast } from "sonner"
import { Package, Calendar, Heart, LogOut, Crown, Star } from "lucide-react"
import { getIdToken } from "firebase/auth"
import OrderHistory from "./OrderHistory"
import PageLoading from "@/components/page-loading"

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
  status?: string
  orderStatus?: string
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
  photoURL?: string
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
      // Use Firebase Auth data directly including profile photo
      setUserProfile({
        name: user.displayName || "User",
        email: user.email || "",
        uid: user.uid,
        photoURL: user.photoURL || undefined
      })
      if (user.metadata && user.metadata.creationTime) {
        const date = new Date(user.metadata.creationTime)
        setMemberSince(date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
      }

      // Ensure backend JWT token is available
      const token = await ensureBackendToken()
      if (token) {
        console.log("Token available, fetching orders...")
        
        // Fetch order count
        try {
          console.log("Fetching order count with token:", !!token)
          const countRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/orders/by-email/${encodeURIComponent(user.email)}`, {
            headers: token ? { token } : {}
          })
          console.log("Order count response status:", countRes.status)
          if (countRes.ok) {
            const countData = await countRes.json()
            console.log("Order count data:", countData)
            if (countData.success && countData.orders) {
              setOrderCount(countData.orders.length)
            }
          } else {
            console.error("Failed to fetch order count:", countRes.status, countRes.statusText)
          }
        } catch (error) {
          console.error("Error fetching order count:", error)
        }
        
        // Fetch all orders for this email
        try {
          console.log("Fetching orders for email:", user.email)
          const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/orders/by-email/${encodeURIComponent(user.email)}`);
          console.log("Orders response status:", res.status)
          const data = await res.json();
          console.log("Orders response data:", data);
          
          if (res.ok && data.orders) {
            console.log("Orders found:", data.orders.length)
            // Filter out awaiting_payment orders
            const confirmedOrders = data.orders.filter((order: any) => {
              const status = order.paymentStatus || order.status || order.orderStatus;
              return status !== 'awaiting_payment' && status !== 'Awaiting Payment';
            });
            // Robust date sorting: prefer createdAt, then date, then orderDate, then updatedAt
            const getOrderDate = (order: any) => order.createdAt || order.date || order.orderDate || order.updatedAt || 0;
            const sortedOrders = confirmedOrders.slice().sort((a: any, b: any) => new Date(getOrderDate(b)).getTime() - new Date(getOrderDate(a)).getTime());
            setOrders(sortedOrders);
            // Calculate unique payment methods
            const methods = new Set(sortedOrders.map((o: any) => o.paymentMethod && o.paymentMethod.toLowerCase()))
            setUniquePaymentMethods(methods.has(undefined) ? methods.size - 1 : methods.size)
          } else {
            console.log("No orders found or error response")
            setOrders([]);
            setUniquePaymentMethods(0)
          }
        } catch (error) {
          console.error("Error fetching orders:", error)
          setOrders([]);
          setUniquePaymentMethods(0)
        }
      } else {
        console.log("No token found in localStorage and could not refresh it")
        setOrders([]);
        setUniquePaymentMethods(0)
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
  }

  async function handleLogout() {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to logout. Please try again.")
    }
  }

  if (authLoading || loading) {
    return (
      <PageLoading loadingMessage="Loading your account..." minLoadingTime={1000}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#473C66] mx-auto"></div>
            <p className="mt-6 text-lg text-gray-600 font-medium">Loading your account...</p>
          </div>
        </div>
      </PageLoading>
    )
  }

  if (showLogin) {
    return (
      <PageLoading loadingMessage="Welcome to Shithaa..." minLoadingTime={1000}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#473C66] mb-3">Welcome to Shithaa</h2>
              <p className="text-gray-600 text-lg">Sign in to access your account</p>
            </div>
            <LoginModal open={true} onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
          </div>
        </div>
      </PageLoading>
    )
  }

  return (
    <PageLoading loadingMessage="Loading your account..." minLoadingTime={1000}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header */}
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6 lg:mb-0">
                {/* Profile Photo */}
                <div className="relative">
                  {userProfile?.photoURL ? (
                    <img 
                      src={userProfile.photoURL} 
                      alt={userProfile.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#473C66]/10 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-[#473C66] to-[#5a4a7a] rounded-full flex items-center justify-center shadow-lg border-4 border-[#473C66]/10">
                      <span className="text-white text-3xl font-bold">
                        {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  {/* Premium Badge */}
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-2 shadow-lg">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                </div>
                
                {/* User Info */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{userProfile?.name}</h1>
                    <div className="flex items-center space-x-1 bg-amber-50 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 text-amber-500 fill-current" />
                      <span className="text-sm font-semibold text-amber-700">Premium</span>
                    </div>
                  </div>
                  <p className="text-lg text-gray-600 font-medium">{userProfile?.email}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-[#473C66] font-semibold">Member since {memberSince}</span>
                    <div className="w-2 h-2 bg-[#473C66] rounded-full"></div>
                    <span className="text-sm text-[#473C66] font-medium">Loyal Customer</span>
                  </div>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-2xl text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Stats Cards - Reordered as requested */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Wishlist Card - First */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={() => window.location.href = '/wishlist'}>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Heart className="w-8 h-8 text-[#473C66]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium mb-1">Wishlist Items</p>
                  <p className="text-3xl font-bold text-[#473C66]">{wishlistCount}</p>
                  <p className="text-xs text-gray-400 mt-1">Saved for later</p>
                </div>
              </div>
            </div>

            {/* Total Orders Card - Second */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                  <Package className="w-8 h-8 text-[#473C66]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-[#473C66]">{orderCount}</p>
                  <p className="text-xs text-gray-400 mt-1">Orders placed</p>
                </div>
              </div>
            </div>

            {/* Member Since Card - Third */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-[#473C66]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium mb-1">Member Since</p>
                  <p className="text-2xl font-bold text-[#473C66] leading-tight">{memberSince || "-"}</p>
                  <p className="text-xs text-gray-400 mt-1">Loyal member</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order History */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Order History</h2>
                {orders.length > 0 && (
                  <p className="text-gray-600">
                    You've placed <span className="font-semibold text-[#473C66]">{orderCount} orders</span> since <span className="font-semibold text-[#473C66]">{memberSince}</span>
                  </p>
                )}
              </div>
              {orders.length > 0 && (
                <div className="mt-4 lg:mt-0">
                  <div className="inline-flex items-center space-x-2 bg-[#473C66]/10 px-4 py-2 rounded-full">
                    <span className="text-sm font-medium text-[#473C66]">Thank you for being a valued customer</span>
                    <span className="text-[#473C66]">🌸</span>
                  </div>
                </div>
              )}
            </div>
            
            {ordersLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#473C66] mx-auto"></div>
                <p className="mt-6 text-lg text-gray-600 font-medium">Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-[#473C66]/10 to-[#473C66]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-12 h-12 text-[#473C66]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No orders yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">Start shopping to see your order history here. We have beautiful maternity wear waiting for you!</p>
                <a 
                  href="/collections/maternity-feeding-wear" 
                  className="inline-flex items-center px-8 py-4 bg-[#473C66] text-white font-semibold rounded-2xl hover:bg-[#3a3054] transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
                >
                  Start Shopping
                </a>
              </div>
            ) : (
              <OrderHistory orders={orders} />
            )}
          </div>
        </div>
      </div>
    </PageLoading>
  )
} 