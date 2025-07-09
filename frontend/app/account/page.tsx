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

export default function AccountPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [orderCount, setOrderCount] = useState<number>(0)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [user, authLoading])

  async function ensureBackendToken() {
    const token = localStorage.getItem("token")
    if (token) return token
    if (!user) return null
    // Try to get a new backend token using Firebase ID token
    try {
      const idToken = await getIdToken(user)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/user/firebase-login`, {
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

      // Ensure backend JWT token is available
      const token = await ensureBackendToken()
      if (token) {
        // Fetch order count
        const countRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/orders/user/count`, {
          headers: { token }
        })
        if (countRes.ok) {
          const countData = await countRes.json()
          if (countData.success) {
            setOrderCount(countData.count)
          }
        }
        // Fetch all orders for this email
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + `/api/orders/by-email/${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (res.ok && data.orders) {
          setOrders(data.orders);
        } else {
          setOrders([]);
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

  if (!user || !userProfile) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Sign in to your account</h2>
            <p className="text-gray-600 mb-6">Access your profile and order history</p>
            <button
              onClick={() => setShowLogin(true)}
              className="btn btn-primary"
            >
              Sign In
            </button>
          </div>
        </div>
        <LoginModal 
          open={showLogin} 
          onClose={() => setShowLogin(false)} 
          onSuccess={handleLoginSuccess} 
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <p className="mt-2 text-gray-600">Manage your profile and view order history</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-[rgb(71,60,102)] rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{userProfile.name}</h2>
                  <p className="text-gray-600">{userProfile.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-600">
                  <Mail className="h-5 w-5" />
                  <span>{userProfile.email}</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-600">
                  <Package className="h-5 w-5" />
                  <span>{orderCount} orders</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full btn btn-outline btn-error flex items-center justify-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Orders Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
              </div>
              <div className="p-6">
                <OrderHistory orders={orders} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <LoginModal 
        open={showLogin} 
        onClose={() => setShowLogin(false)} 
        onSuccess={handleLoginSuccess} 
      />
    </div>
  )
} 