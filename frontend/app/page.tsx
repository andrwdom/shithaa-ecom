"use client"

import { useState, useEffect, Suspense } from "react"
import dynamic from "next/dynamic"
import { Metadata } from "next"
import PageLoading from "@/components/page-loading"
import PerformanceMonitor from "@/components/performance-monitor"
import { useCart } from "@/components/cart-context"
import { detectDevice, getBundleStrategy } from "@/lib/mobile-detection"

// Dynamic imports with loading components - Only load when needed
const EnhancedHeroSection = dynamic(() => import("@/components/enhanced-hero-section"), {
  loading: () => <div className="h-96 bg-gradient-to-r from-pink-50 to-purple-50 animate-pulse" />,
  ssr: true
})

const CategoryStrip = dynamic(() => import("@/components/category-strip"), {
  loading: () => <div className="h-20 bg-gray-100 animate-pulse" />,
  ssr: false // Below fold, can be client-rendered
})

const TestimonialsSection = dynamic(() => import("@/components/testimonials-section"), {
  loading: () => <div className="h-64 bg-gray-50 animate-pulse" />,
  ssr: false // Below fold
})

const FAQAccordion = dynamic(() => import("@/components/faq-accordion"), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse" />,
  ssr: false // Below fold
})

interface Product {
  id: string
  _id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  categorySlug?: string
  isNewArrival?: boolean
  isBestSeller?: boolean
  sizes: { stock?: number }[]
  stock: number
  customId?: string // Added customId to the interface
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [deviceInfo, setDeviceInfo] = useState(() => detectDevice())
  const [showBelowFold, setShowBelowFold] = useState(false)
  const { addToCart, openCartSidebar } = useCart()

  useEffect(() => {
    setDeviceInfo(detectDevice())
    
    // For Instagram browser or slow connections, delay below-fold content
    const delay = deviceInfo.isInstagram || deviceInfo.connectionType === 'slow' ? 2000 : 1000
    const timer = setTimeout(() => setShowBelowFold(true), delay)
    
    return () => clearTimeout(timer)
  }, [deviceInfo.isInstagram, deviceInfo.connectionType])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Lazy load the API utility to reduce initial bundle
        const { fetchProducts: fetchProductsAPI } = await import('@/lib/api-utils')
        
        const response = await fetchProductsAPI({
          sortBy: 'displayOrder',
          sortOrder: 'asc'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`)
        }
        
        const data = await response.json();
        const products = (data.data || data.products || []).map((p: any) => ({
          id: String(p._id),
          _id: String(p._id),
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          image: (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : '/placeholder.svg',
          category: p.category,
          categorySlug: p.categorySlug,
          isNewArrival: p.isNewArrival,
          isBestSeller: p.isBestSeller,
          sizes: p.sizes,
          stock: (p.sizes || []).reduce((sum: number, s: { stock?: number }) => sum + (s.stock || 0), 0),
          customId: p.customId,
        }));
        setProducts(products);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error)
        setLoading(false)
      }
    }

    // Prioritize hero section, then load products after a short delay
    const timer = setTimeout(fetchProducts, 200)
    return () => clearTimeout(timer)
  }, [])

  const handleAddToCart = async (product: Product) => {
    try {
      // Find the first available size with stock
      const availableSize = product.sizes?.find(s => s.stock && s.stock > 0)
      const size = availableSize ? availableSize.size : "M"
      const stock = availableSize?.stock || 0

      await addToCart({
        id: product.customId || product._id, // Use customId for routing
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        size: size,
        image: product.image,
        category: product.category,
        categorySlug: product.categorySlug,
      }, true, stock)

      openCartSidebar()
    } catch (error) {
      console.error("Error adding to cart:", error)
    }
  }

  const handleCategorySelect = (slug: string) => {
    window.location.href = `/collections/${slug}`
  }

  const newArrivals = products.filter((p: Product) => p.isNewArrival)
  const bestSellers = products.filter((p: Product) => p.isBestSeller)

  return (
    <PageLoading loadingMessage="Welcome to Shithaa" minLoadingTime={800}>
      <main>
        <PerformanceMonitor />
        <div className="min-h-screen bg-white">
          {/* Above the fold - Load immediately */}
          <Suspense fallback={
            <div className="h-96 bg-gradient-to-r from-pink-50 to-purple-50 animate-pulse flex items-center justify-center">
              <div className="text-gray-500">Loading...</div>
            </div>
          }>
            <EnhancedHeroSection />
          </Suspense>
          
          {/* Below the fold - Load progressively based on device capabilities */}
          {showBelowFold && (
            <>
              <Suspense fallback={<div className="h-20 bg-gray-100 animate-pulse" />}>
                <CategoryStrip onCategoryClick={handleCategorySelect} currentCategory={undefined} />
              </Suspense>
              
              <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse" />}>
                <TestimonialsSection />
              </Suspense>
              
              <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse" />}>
                <FAQAccordion />
              </Suspense>
            </>
          )}
          
          {/* Mobile performance indicator for slow connections */}
          {(deviceInfo.isInstagram || deviceInfo.connectionType === 'slow') && !showBelowFold && (
            <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-lg text-xs z-50 transition-opacity">
              Optimizing for your connection...
            </div>
          )}
        </div>
      </main>
    </PageLoading>
  )
}
