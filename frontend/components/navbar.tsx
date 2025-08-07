"use client"

import { useState } from "react"
import { Menu, ShoppingBag, X, User, Mail, Info, Home, LogOut, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-context"
import { useWishlist } from "@/components/wishlist-context"
import { useAuth } from "@/components/auth/useAuth"
import LoginModal from "@/components/auth/LoginModal"

interface NavbarProps {
  onCategoriesClick?: () => void
}

export default function Navbar({ onCategoriesClick }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { cartItems, openCartSidebar } = useCart()
  const { wishlistItems } = useWishlist()
  const { user, logout } = useAuth()

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)
  const wishlistCount = wishlistItems.length

  // Debug logging for user state
  console.log("Navbar - User state:", user)
  console.log("Navbar - Is menu open:", isMenuOpen)

  const handleAccountClick = () => {
    if (user) {
      // Navigate to account page when logged in
      window.location.href = "/account"
    } else {
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
        <div className="banner-ticker">
          <div className="banner-message">
        FREE DELIVERY WITHIN TAMIL NADU.
          </div>
          <div className="banner-message">
            🔥 BUY 3 LOUNGE WEAR @1299RS 🔥
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-[9999] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="navbar-container flex items-center justify-between h-16 lg:h-18">
            
            {/* Left Section */}
            <div className="navbar-left">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-gray-600 hover:text-[rgb(71,60,102)] p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="navbar-icon" /> : <Menu className="navbar-icon" />}
              </Button>

              {/* Desktop Navigation Links - Left */}
              <div className="hidden md:flex items-center space-x-8 ml-8">
                <button
                  onClick={onCategoriesClick}
                  className="navbar-link-effect text-gray-600 font-medium transition-all duration-200"
                >
                  categories
                </button>
                <a
                  href="/collections/new-arrivals"
                  className="navbar-link-effect text-gray-600 font-medium transition-all duration-200"
                >
                  new arrivals
                </a>
              </div>
            </div>

            {/* Center - Logo */}
            <div className="navbar-logo">
              <button
                onClick={() => (window.location.href = "/")}
                className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-[rgb(71,60,102)] tracking-wider font-serif hover:text-[rgb(71,60,102)]/80 transition-colors duration-300 cursor-pointer"
              >
                SHITHAA
              </button>
            </div>

            {/* Right Section */}
            <div className="navbar-right">
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
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Cart Icon */}
                <button
                  onClick={openCartSidebar}
                  className="relative p-2 text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                  aria-label="Shopping cart"
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
                  onClick={handleAccountClick}
                  className="p-2 text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                  aria-label="Account"
                >
                  <User className="navbar-icon" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={onCategoriesClick}
                  className="text-left text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                >
                  categories
                </button>
                <a
                  href="/collections/new-arrivals"
                  className="text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                >
                  new arrivals
                </a>
                <button
                  onClick={() => {
                    window.location.href = "/contact"
                    setIsMenuOpen(false)
                  }}
                  className="text-left text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                >
                  contact us
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
                    onClick={() => {
                      setIsLoginModalOpen(true)
                      setIsMenuOpen(false)
                    }}
                    className="text-left text-gray-600 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                  >
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
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* CSS for animated banner */}
      <style jsx>{`
        .banner-ticker {
          display: flex;
          animation: ticker 12s linear infinite;
          white-space: nowrap;
        }
        
        .banner-message {
          flex-shrink: 0;
          width: 100%;
          text-align: center;
          font-weight: 500;
          font-size: 0.875rem;
          padding: 0 1rem;
        }
        
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(-200%);
          }
        }
        
        /* Pause animation on hover */
        .banner-ticker:hover {
          animation-play-state: paused;
        }
        
        /* Mobile responsive */
        @media (max-width: 640px) {
          .banner-message {
            font-size: 0.75rem;
            padding: 0 0.5rem;
          }
        }
      `}</style>
    </>
  )
}
