"use client"

import React, { useState, useEffect } from "react"
import { Menu, ShoppingBag, X, User, Mail, Info, Home, LogOut, List, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-context"
import { useWishlist } from "@/components/wishlist-context"
import { useAuth } from "@/components/auth/useAuth"
import LoginModal from "@/components/auth/LoginModal"
import '@/styles/banner-animation.css'

interface NavbarProps {
  onCategoriesClick?: () => void
}

export default function Navbar({ onCategoriesClick }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [bannerPosition, setBannerPosition] = useState(0)
  const { cartItems, openCartSidebar } = useCart()
  const { wishlistItems } = useWishlist()
  const { user, logout } = useAuth()

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)
  const wishlistCount = wishlistItems.length

  // Debug logging for user state
  console.log("Navbar - User state:", user)
  console.log("Navbar - Is menu open:", isMenuOpen)
  console.log("Navbar - Login modal open:", isLoginModalOpen)

  // JavaScript-based banner animation fallback for mobile (smooth 60fps)
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      let animationId: number
      let startTime: number
      
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime
        
        const elapsed = currentTime - startTime
        const progress = (elapsed % 24000) / 24000 // 24 second cycle
        const newPosition = -75 * progress
        
        setBannerPosition(newPosition)
        animationId = requestAnimationFrame(animate)
      }
      
      animationId = requestAnimationFrame(animate)
      
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId)
        }
      }
    }
  }, [])

  // Cart restoration is now handled by CartProvider context - removed to prevent conflicts
  // useEffect(() => {
  //   if (cartItems.length === 0) {
  //     console.log("Navbar: Cart is empty, attempting restoration")
  //     restoreCartFromStorage()
  //   }
  // }, [cartItems.length, restoreCartFromStorage])

  const handleAccountClick = () => {
    console.log("Account button clicked, user:", user)
    if (user) {
      // Navigate to account page when logged in
      console.log("Navigating to account page")
      window.location.href = "/account"
    } else {
      console.log("Opening login modal")
      setIsLoginModalOpen(true)
    }
  }

  const handleLogout = () => {
    logout()
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Animated Top Banner */}
      <div className="bg-[rgb(71,60,102)] text-white py-3 overflow-hidden relative">
        <div className="banner-ticker-container">
          <div 
            className="banner-ticker"
            style={{
              transform: `translate3d(${bannerPosition}%, 0, 0)`,
              animation: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'none' : 'ticker 24s linear infinite'
            }}
          >
            <div className="banner-message">
              ‼ FREE DELIVERY FOR LOUNGE WEAR WITHIN TAMIL NADU ‼
            </div>
            <div className="banner-message">
              🔥 BUY 3 LOUNGE WEAR @1299RS 🔥
            </div>
            <div className="banner-message">
              🎉 PREMIUM MATERNITY WEAR - ELEGANT & COMFORTABLE 🎉
            </div>
            <div className="banner-message">
              ‼ FREE DELIVERY FOR LOUNGE WEAR WITHIN TAMIL NADU ‼
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-[9999] shadow-sm">
        <div className="container-responsive">
          <div className="navbar-container flex items-center justify-between navbar-responsive py-2">
            
            {/* Left Section - Logo + Menu */}
            <div className="navbar-left flex items-center space-x-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-gray-600 hover:text-[rgb(71,60,102)] p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log("Mobile menu button clicked, current state:", isMenuOpen)
                  setIsMenuOpen(!isMenuOpen)
                }}
              >
                {isMenuOpen ? <X className="navbar-icon" /> : <Menu className="navbar-icon" />}
              </Button>

              {/* Logo - Now on the left */}
              <button
                onClick={() => (window.location.href = "/")}
                className="navbar-logo-responsive font-bold text-[rgb(71,60,102)] tracking-wider font-serif hover:text-[rgb(71,60,102)]/80 transition-colors duration-300 cursor-pointer text-xl md:text-2xl"
              >
                SHITHAA
              </button>

              {/* Desktop Navigation Links - Left */}
              <div className="hidden md:flex items-center space-x-8 ml-8">
                <button
                  onClick={onCategoriesClick}
                  className="navbar-link-effect text-[rgb(71,60,102)] font-medium transition-all duration-200 hover:text-[rgb(71,60,102)]/80"
                >
                  categories
                </button>
                <a
                  href="/about"
                  className="navbar-link-effect text-[rgb(71,60,102)] font-medium transition-all duration-200 hover:text-[rgb(71,60,102)]/80"
                >
                  about us
                </a>
              </div>
            </div>

            {/* Right Section */}
            <div className="navbar-right flex items-center">
              {/* Desktop Navigation Links - Right */}
              <div className="hidden md:flex items-center space-x-8 mr-6">
                <button
                  onClick={() => window.location.href = "/contact"}
                  className="navbar-link-effect text-gray-600 font-medium transition-all duration-200"
                >
                  contact us
                </button>
              </div>

              {/* Icons Section */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* Cart Icon */}
                {/* Wishlist Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log("Wishlist button clicked")
                    window.location.href = '/wishlist'
                  }}
                  className="relative p-2 text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200 cursor-pointer z-10"
                  aria-label="Wishlist"
                  type="button"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Heart className="navbar-icon" />
                  {wishlistCount > 0 && (
                    <span className="navbar-badge bg-red-500 text-white">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </button>

                {/* Cart Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log("Cart button clicked")
                    openCartSidebar()
                  }}
                  className="relative p-2 text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200 cursor-pointer z-10"
                  aria-label="Shopping cart"
                  type="button"
                  style={{ pointerEvents: 'auto' }}
                >
                  <ShoppingBag className="navbar-icon" />
                  {cartCount > 0 && (
                    <span className="navbar-badge bg-[rgb(71,60,102)] text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>

                {/* User Icon */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log("Account button clicked")
                    handleAccountClick()
                  }}
                  className="p-2 text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200 cursor-pointer relative z-10"
                  aria-label="Account"
                  type="button"
                  style={{ pointerEvents: 'auto' }}
                >
                  <User className="navbar-icon" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-6 bg-gray-50">
              <div className="flex flex-col space-y-6">
                {/* Home Button - Mobile Only */}
                <button
                  onClick={() => {
                    window.location.href = "/"
                    setIsMenuOpen(false)
                  }}
                  className="text-left text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80 transition-colors duration-200 flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white"
                >
                  <Home className="h-5 w-5" />
                  <span className="font-medium">Home</span>
                </button>
                <button
                  onClick={onCategoriesClick}
                  className="text-left text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80 transition-colors duration-200 flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white"
                >
                  <List className="h-5 w-5" />
                  <span className="font-medium">Categories</span>
                </button>
                
                <button
                  onClick={() => {
                    window.location.href = "/wishlist"
                    setIsMenuOpen(false)
                  }}
                  className="text-left text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80 transition-colors duration-200 flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white"
                >
                  <Heart className="h-5 w-5" />
                  <span className="font-medium">Wishlist {wishlistCount > 0 && `(${wishlistCount})`}</span>
                </button>
                
                <button
                  onClick={() => {
                    window.location.href = "/about"
                    setIsMenuOpen(false)
                  }}
                  className="text-left text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80 transition-colors duration-200 flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white"
                >
                  <Info className="h-5 w-5" />
                  <span className="font-medium">About Us</span>
                </button>
                <button
                  onClick={() => {
                    window.location.href = "/contact"
                    setIsMenuOpen(false)
                  }}
                  className="text-left text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80 transition-colors duration-200 flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white"
                >
                  <Mail className="h-5 w-5" />
                  <span className="font-medium">Contact Us</span>
                </button>
                {user ? (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <User className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-900 font-medium">{user.email}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors duration-200"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log("Mobile login button clicked")
                      setIsLoginModalOpen(true)
                      setIsMenuOpen(false)
                    }}
                    className="text-left text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80 transition-colors duration-200 cursor-pointer relative z-10 flex items-center gap-2"
                    type="button"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <User className="h-4 w-4" />
                    Login
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Login Modal */}
      <LoginModal
        open={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          console.log("Login successful")
          setIsLoginModalOpen(false)
        }}
      />


    </>
  )
}
