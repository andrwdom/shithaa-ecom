"use client"

import { useState } from "react"
import { Menu, ShoppingBag, X, User, Mail, Info, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/components/cart-context"
import { useAuth } from "@/components/auth/useAuth"
import LoginModal from "@/components/auth/LoginModal"

interface NavbarProps {
  onCategoriesClick?: () => void
}

export default function Navbar({ onCategoriesClick }: NavbarProps) {
  const { cartItems, openCartSidebar } = useCart();
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  function handleProtectedNav(action: string, callback: () => void) {
    if (!user) {
      setShowLogin(true);
    } else {
      callback();
    }
  }

  function closeMenus() {
    setIsMenuOpen(false);
  }

  return (
    <>
      {/* Top Banner */}
      <div className="bg-[rgb(71,60,102)] text-white text-center py-3 text-sm font-medium">
        FREE DELIVERY WITHIN TAMIL NADU.
      </div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Left Section - Desktop Navigation */}
            <div className="flex items-center space-x-6 lg:space-x-8 flex-1">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-gray-600 hover:text-[rgb(71,60,102)]"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center space-x-8">
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
            <div className="flex-shrink-0">
              <button
                onClick={() => (window.location.href = "/")}
                className="text-xl lg:text-2xl xl:text-3xl font-bold text-[rgb(71,60,102)] tracking-wider font-serif hover:text-[rgb(71,60,102)]/80 transition-colors duration-300 cursor-pointer"
              >
                SHITHAA
              </button>
            </div>

            {/* Right Section - Navigation & Icons */}
            <div className="flex items-center justify-end space-x-6 flex-1">
              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center space-x-8">
                <a href="/contact" className="navbar-link-effect text-gray-600 font-medium transition-all duration-200">
                  contact us
                </a>
                <a href="/about" className="navbar-link-effect text-gray-600 font-medium transition-all duration-200">
                  about us
                </a>
                {/* My Account Link (Desktop) */}
                <button
                  onClick={() => handleProtectedNav('account', () => window.location.href = "/account")}
                  className="navbar-link-effect flex items-center gap-1 text-gray-600 font-medium transition-all duration-200 focus:outline-none"
                >
                  <User className="h-5 w-5" />
                </button>
              </div>

              {/* Icons */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative text-gray-600 hover:text-[rgb(71,60,102)]"
                  onClick={openCartSidebar}
                >
                  <ShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[rgb(71,60,102)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
                {/* My Account Link (Mobile) */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden text-gray-600 hover:text-[rgb(71,60,102)]"
                  onClick={() => handleProtectedNav('account', () => window.location.href = "/account")}
                >
                  <User className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4 bg-gray-50">
              <div className="flex flex-col space-y-3">
                {/* Home icon-only button */}
                <button
                  onClick={() => (window.location.href = "/")}
                  className="flex items-center justify-center text-gray-600 hover:text-[rgb(71,60,102)] font-medium px-2 py-2 rounded-lg hover:bg-white transition-all"
                  aria-label="Home"
                >
                  <Home className="h-5 w-5" />
                </button>
                {/* Categories button */}
                <button
                  onClick={() => {
                    onCategoriesClick?.()
                  }}
                  className="flex items-center gap-3 text-gray-600 hover:text-[rgb(71,60,102)] font-medium px-2 py-2 rounded-lg hover:bg-white transition-all text-left"
                >
                  <Menu className="h-5 w-5" />
                  <span>categories</span>
                </button>
                <a
                  href="/collections/new-arrivals"
                  className="flex items-center gap-3 text-gray-600 hover:text-[rgb(71,60,102)] font-medium px-2 py-2 rounded-lg hover:bg-white transition-all"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span>new arrivals</span>
                </a>
                <a
                  href="/contact"
                  className="flex items-center gap-3 text-gray-600 hover:text-[rgb(71,60,102)] font-medium px-2 py-2 rounded-lg hover:bg-white transition-all"
                >
                  <Mail className="h-5 w-5" />
                  <span>contact us</span>
                </a>
                <a
                  href="/about"
                  className="flex items-center gap-3 text-gray-600 hover:text-[rgb(71,60,102)] font-medium px-2 py-2 rounded-lg hover:bg-white transition-all"
                >
                  <Info className="h-5 w-5" />
                  <span>about us</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={() => {
        setShowLogin(false);
      }} />
    </>
  )
}
