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
  const { cartItems, openCartSidebar } = useCart();
  const { wishlistCount } = useWishlist();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  function closeMenus() {
    setIsMenuOpen(false);
  }

  const handleLogout = async () => {
    await logout();
    closeMenus();
  };

  const handleAccountClick = () => {
    console.log('Account button clicked!', { user: !!user });
    if (user) {
      window.location.href = "/account";
    } else {
      setShowLogin(true);
    }
  };

  const handleSignInClick = () => {
    console.log('Sign in button clicked!');
    setShowLogin(true);
  };

  const handleWishlistClick = () => {
    if (user) {
      window.location.href = "/wishlist";
    } else {
      setShowLogin(true);
    }
  };

  return (
    <>
      {/* Top Banner */}
      <div className="bg-[rgb(71,60,102)] text-white text-center py-3 text-sm font-medium">
        FREE DELIVERY WITHIN TAMIL NADU.
      </div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-[60] shadow-sm">
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
                <a href="/contact" className="navbar-link-effect text-gray-600 font-medium transition-all duration-200">
                  contact us
                </a>
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
            <div className="md:hidden bg-white border-t border-gray-200 py-4 absolute top-full left-0 right-0 z-[55] shadow-lg">
              <div className="space-y-4 px-4">
                <button
                  onClick={() => {
                    onCategoriesClick?.();
                    closeMenus();
                  }}
                  className="block w-full text-left text-gray-600 font-medium py-2 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                >
                  Categories
                </button>
                <a
                  href="/collections/new-arrivals"
                  onClick={closeMenus}
                  className="block text-gray-600 font-medium py-2 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                >
                  New Arrivals
                </a>
                <a
                  href="/contact"
                  onClick={closeMenus}
                  className="block text-gray-600 font-medium py-2 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                >
                  Contact Us
                </a>
                <div className="border-t border-gray-200 pt-4">
                  {user ? (
                    <div className="space-y-2">
                      <a
                        href="/account"
                        onClick={closeMenus}
                        className="block text-gray-600 font-medium py-2 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                      >
                        My Account
                      </a>
                      <a
                        href="/wishlist"
                        onClick={closeMenus}
                        className="block text-gray-600 font-medium py-2 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                      >
                        Wishlist ({wishlistCount})
                      </a>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left text-red-600 font-medium py-2 hover:text-red-700 transition-colors duration-200"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSignInClick}
                      className="block w-full text-left text-gray-600 font-medium py-2 hover:text-[rgb(71,60,102)] transition-colors duration-200"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Login Modal */}
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />
    </>
  )
}
