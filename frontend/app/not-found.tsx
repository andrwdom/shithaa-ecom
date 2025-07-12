"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, Search, Heart } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-lavender-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Decorative background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#473C66] rounded-full opacity-5 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-pink-300 rounded-full opacity-8 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-200 rounded-full opacity-6 blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          {/* Main Content */}
          <div className="bg-white rounded-3xl p-12 shadow-2xl relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-6 left-6 w-8 h-8 bg-gradient-to-br from-pink-200 to-rose-200 rounded-full opacity-60"></div>
            <div className="absolute top-6 right-6 w-6 h-6 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full opacity-50"></div>
            <div className="absolute bottom-6 left-8 w-4 h-4 bg-amber-200 rounded-full opacity-70"></div>
            <div className="absolute bottom-6 right-8 w-10 h-10 bg-blue-200 rounded-full opacity-40"></div>
            
            {/* Baby-themed decorations */}
            <div className="absolute top-8 left-1/4">
              <Heart className="w-6 h-6 text-pink-300 opacity-60" />
            </div>
            <div className="absolute bottom-8 right-1/4">
              <Search className="w-6 h-6 text-purple-300 opacity-50" />
            </div>

            {/* 404 Number */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-8"
            >
              <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-br from-[#473C66] via-purple-600 to-pink-500 bg-clip-text text-transparent">
                404
              </h1>
            </motion.div>

            {/* Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mb-8"
            >
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-4">
                Oops! Page Not Found
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
                The page you're looking for seems to have wandered off. Don't worry though - 
                our beautiful maternity wear collection is still here waiting for you!
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                className="bg-[#473C66] hover:bg-[#3a3054] text-white rounded-full px-8 py-3 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                onClick={() => window.location.href = '/'}
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#473C66] text-[#473C66] hover:bg-[#473C66] hover:text-white rounded-full px-8 py-3 font-semibold transition-all duration-300"
                onClick={() => window.location.href = '/collections/maternity-feeding-wear'}
              >
                <Heart className="w-5 h-5 mr-2" />
                Shop Collection
              </Button>
            </motion.div>

            {/* Helpful Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="mt-8 pt-8 border-t border-gray-200"
            >
              <p className="text-sm text-gray-500 mb-4">Looking for something specific?</p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <Link 
                  href="/collections/maternity-feeding-wear"
                  className="text-[#473C66] hover:text-purple-600 transition-colors duration-200"
                >
                  Maternity Wear
                </Link>
                <Link 
                  href="/collections/zipless-feeding-lounge-wear"
                  className="text-[#473C66] hover:text-purple-600 transition-colors duration-200"
                >
                  Feeding Wear
                </Link>
                <Link 
                  href="/about"
                  className="text-[#473C66] hover:text-purple-600 transition-colors duration-200"
                >
                  About Us
                </Link>
                <Link 
                  href="/contact"
                  className="text-[#473C66] hover:text-purple-600 transition-colors duration-200"
                >
                  Contact
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-8"
          >
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
} 