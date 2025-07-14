"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/useAuth"
import LoginModal from "@/components/auth/LoginModal"
import { toast } from "sonner"
import { Package, Calendar, CreditCard, MapPin, Phone, Mail, User, LogOut } from "lucide-react"
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
        const countRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/orders/user/count`, {
          headers: { token }
        })
        if (countRes.ok) {
          const countData = await countRes.json()
          if (countData.success) {
            setOrderCount(countData.count)
          }
        }
        // Fetch all orders for this email
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/orders/by-email/${encodeURIComponent(user.email)}`);
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
      setUserProfile(null)
      setOrders([])
      setShowLogin(true)
      toast.success("Successfully logged out")
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
        return "text-green-600 bg-green-100"
      case "shipped":
      case "out for delivery":
        return "text-blue-600 bg-blue-100"
      case "packing":
        return "text-yellow-600 bg-yellow-100"
      case "cancelled":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Sign in to view your account</h2>
          <p className="text-gray-600 mb-6">You must be logged in to access your account.</p>
          <LoginModal open={true} onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{userProfile?.name}</h1>
                <p className="text-gray-600">{userProfile?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="text-2xl font-bold text-gray-900">{memberSince || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Order History</h2>
          {ordersLoading ? (
            <div className="text-center py-8">
              <div className="loading loading-spinner loading-lg text-[rgb(71,60,102)]"></div>
              <p className="mt-4 text-gray-600">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-600 mb-4">Start shopping to see your order history here.</p>
              <a href="/collections/maternity-feeding-wear" className="btn btn-primary">
                Start Shopping
              </a>
            </div>
          ) : (
            <OrderHistory orders={orders} formatDate={formatDate} getStatusColor={getStatusColor} />
          )}
        </div>
      </div>
    </div>
  )
} 