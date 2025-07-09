"use client"

import { Facebook, Instagram, Twitter, Mail, Shield, RotateCcw, Truck, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Trust Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12 lg:mb-16 pb-12 lg:pb-16 border-b border-gray-800">
          <div className="text-center group">
            <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 lg:mb-6 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-gray-700 transition-colors duration-300">
              <Truck className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
            </div>
            <h3 className="font-bold mb-2 lg:mb-3 text-base lg:text-lg font-serif">Fast Delivery</h3>
            <p className="text-gray-400 text-sm lg:text-base">Free shipping within Tamil Nadu</p>
          </div>
          <div className="text-center group">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-gray-700 transition-colors duration-300">
              <RotateCcw className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-bold mb-3 text-lg font-serif">Easy Returns</h3>
            <p className="text-gray-400">7-day hassle-free return policy</p>
          </div>
          <div className="text-center group">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-gray-700 transition-colors duration-300">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-bold mb-3 text-lg font-serif">Secure Checkout</h3>
            <p className="text-gray-400">100% safe & secure payments</p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 lg:gap-8">
          {/* Brand */}
          <div className="space-y-4 lg:space-y-6">
            <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-wider font-serif">SHITHA</h3>
            <p className="text-gray-400 leading-relaxed text-sm lg:text-base">
              Premium maternity wear designed for the modern mother. Comfort meets elegance in every piece we create
              with love.
            </p>
            <div className="flex space-x-4">
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg p-3"
              >
                <Facebook className="h-5 w-5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg p-3"
              >
                <Instagram className="h-5 w-5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg p-3"
              >
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white font-serif">Categories</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/collections/maternity-feeding-wear"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Maternity Feeding Wear
                </a>
              </li>
              <li>
                <a
                  href="/collections/zipless-feeding-lounge-wear"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Zipless Feeding Lounge Wear
                </a>
              </li>
              <li>
                <a
                  href="/collections/non-feeding-lounge-wear"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Non-Feeding Lounge Wear
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white font-serif">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Size Guide
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Return Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Shipping Info
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white font-serif">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-400">info.shitha@gmail.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Phone className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-400">+91 8148480720</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="text-gray-400 text-sm">
                  <div>118/a, Mahalingapuram</div>
                  <div>Vellalore, Coimbatore 641111</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Customer support available 9 AM - 7 PM</p>
              <a
                href="/contact"
                className="inline-block bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Get In Touch
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-16 pt-8 text-center">
          <p className="text-gray-400">&copy; 2024 Shitha. All rights reserved. Made with 💕 for mothers everywhere.</p>
        </div>
      </div>
    </footer>
  )
}
