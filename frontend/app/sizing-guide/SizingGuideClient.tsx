"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Ruler, Info, Download, Share2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const sizeCharts = [
  {
    id: "maternity",
    title: "Maternity Wear Size Chart",
    description: "Comprehensive sizing guide for all maternity clothing including dresses, tops, and bottoms",
    image: "/maternity-sizechart.jpeg",
    alt: "Maternity wear size chart showing measurements and sizes",
    tips: [
      "Measure around the fullest part of your bust",
      "Measure around your natural waistline",
      "Measure around the fullest part of your hips",
      "For maternity wear, consider your pre-pregnancy size and add 1-2 sizes"
    ]
  },
  {
    id: "zipless",
    title: "Zipless Feeding Loungewear Size Chart",
    description: "Specialized sizing for comfortable and accessible nursing loungewear",
    image: "/zipless-feeding-sizechart.jpeg",
    alt: "Zipless feeding loungewear size chart with nursing-specific measurements",
    tips: [
      "Measure around your bust at the fullest point",
      "Consider your nursing needs - you may want to size up slightly",
      "Measure your natural waist and hips",
      "Loungewear should be comfortable and not restrictive"
    ]
  }
]

export default function SizingGuideClient() {
  const [activeTab, setActiveTab] = useState("maternity")

  const handleDownload = (imageSrc: string, title: string) => {
    const link = document.createElement('a')
    link.href = imageSrc
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.jpeg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shithaa Size Guide',
          text: 'Check out our comprehensive size guide for maternity wear!',
          url: window.location.href
        })
      } catch (err) {
        // User cancelled or error
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link copied to clipboard!')
      } catch (err) {
        alert('Could not copy link')
      }
    } else {
      alert('Share not supported')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#473c66]/5 via-white to-[#473c66]/10">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back to Home</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Size Guide
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            Find your perfect fit with our comprehensive size charts for maternity wear and nursing loungewear
          </motion.p>
        </div>

        {/* How to Measure Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#473c66]/10 rounded-full flex items-center justify-center">
              <Ruler className="h-5 w-5 text-[#473c66]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">How to Measure</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#473c66]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👗</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Bust</h3>
              <p className="text-sm text-gray-600">Measure around the fullest part of your bust, keeping the tape horizontal</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#473c66]/15 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📏</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Waist</h3>
              <p className="text-sm text-gray-600">Measure around your natural waistline, keeping the tape comfortably loose</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#473c66]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Hips</h3>
              <p className="text-sm text-gray-600">Measure around the fullest part of your hips, keeping the tape horizontal</p>
            </div>
          </div>
        </motion.div>

        {/* Size Chart Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Desktop Layout - Side by Side Charts (≥1024px) */}
          <div className="hidden lg:block">
            <div className="p-6 md:p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Size Charts</h3>
                <p className="text-gray-600">View both size charts for comprehensive sizing information</p>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                {sizeCharts.map((chart) => (
                  <div key={chart.id} className="space-y-6">
                    {/* Chart Header */}
                    <div className="text-center">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{chart.title}</h4>
                      <p className="text-sm text-gray-600">{chart.description}</p>
                    </div>

                    {/* Size Chart Image */}
                    <div className="relative">
                      <div className="bg-gray-100 rounded-lg p-4">
                        <div className="flex justify-center">
                          <Image
                            src={chart.image}
                            alt={chart.alt}
                            width={800}
                            height={600}
                            className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl h-auto rounded-lg shadow-md"
                            priority
                          />
                        </div>
                      </div>
                      
                      {/* Download Button */}
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => handleDownload(chart.image, chart.title)}
                          className="flex items-center gap-2 px-6 py-3 bg-[#473c66] text-white font-medium rounded-lg hover:bg-[#473c66]/80 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Download Size Chart
                        </button>
                      </div>
                    </div>

                    {/* Tips Section */}
                    <div className="bg-[#473c66]/5 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Info className="h-5 w-5 text-[#473c66]" />
                        <h5 className="font-semibold text-gray-900">Pro Tips</h5>
                      </div>
                      <ul className="space-y-2">
                        {chart.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="w-2 h-2 bg-[#473c66] rounded-full mt-2 flex-shrink-0"></span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Layout - Tab Navigation (<1024px) */}
          <div className="lg:hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                {sizeCharts.map((chart) => (
                  <button
                    key={chart.id}
                    onClick={() => setActiveTab(chart.id)}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === chart.id
                        ? "text-[#473c66] border-b-2 border-[#473c66] bg-[#473c66]/5"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {chart.title}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                {sizeCharts.map((chart) => (
                  activeTab === chart.id && (
                    <motion.div
                      key={chart.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Chart Header */}
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{chart.title}</h3>
                        <p className="text-gray-600">{chart.description}</p>
                      </div>

                      {/* Size Chart Image */}
                      <div className="relative">
                        <div className="bg-gray-100 rounded-lg p-4">
                          <div className="flex justify-center">
                            <Image
                              src={chart.image}
                              alt={chart.alt}
                              width={800}
                              height={600}
                              className="w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl h-auto rounded-lg shadow-md"
                              priority
                            />
                          </div>
                        </div>
                        
                        {/* Download Button */}
                        <div className="mt-4 flex justify-center">
                          <button
                            onClick={() => handleDownload(chart.image, chart.title)}
                            className="flex items-center gap-2 px-6 py-3 bg-[#473c66] text-white font-medium rounded-lg hover:bg-[#473c66]/80 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download Size Chart
                          </button>
                        </div>
                      </div>

                      {/* Tips Section */}
                      <div className="bg-[#473c66]/5 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <Info className="h-5 w-5 text-[#473c66]" />
                          <h4 className="font-semibold text-gray-900">Pro Tips</h4>
                        </div>
                        <ul className="space-y-2">
                          {chart.tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="w-2 h-2 bg-[#473c66] rounded-full mt-2 flex-shrink-0"></span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Additional Help Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mt-8"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Need More Help?</h2>
            <p className="text-gray-600 mb-6">
              Can't find your size or have questions about measurements? Our customer service team is here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-6 py-3 bg-[#473c66] text-white font-medium rounded-lg hover:bg-[#473c66]/80 transition-colors"
              >
                Contact Us
              </Link>
              <Link
                href="/"
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 