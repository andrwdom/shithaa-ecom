"use client"

import { useState, useEffect } from "react"
import { Metadata } from "next"
import EnhancedHeroSection from "@/components/enhanced-hero-section"
import ProductSlider from "@/components/product-slider"
import CategoryStrip from "@/components/category-strip"
import TestimonialCarousel from "@/components/testimonial-carousel"
import FAQAccordion from "@/components/faq-accordion"
import Footer from "@/components/footer"
import CategorySidebar from "@/components/category-sidebar"
import CartSidebar from "@/components/cart-sidebar"
import PageLoading from "@/components/page-loading"
import TestimonialsSection from "@/components/testimonials-section"
import PerformanceMonitor from "@/components/performance-monitor"
import { useCart } from "@/components/cart-context"

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
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { addToCart, openCartSidebar } = useCart()

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products?sortBy=displayOrder&sortOrder=asc';
        const res = await fetch(apiUrl);
        const data = await res.json();
        // Map backend fields to frontend
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
        }));
        setProducts(products);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error)
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleAddToCart = async (product: Product) => {
    try {
      // Find the first available size with stock
      const availableSize = product.sizes?.find(s => s.stock && s.stock > 0)
      const size = availableSize ? availableSize.size : "M"
      const stock = availableSize?.stock || 0

      await addToCart({
        id: product.id,
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
    <PageLoading loadingMessage="Welcome to Shithaa" minLoadingTime={2000}>
      <main>
        <PerformanceMonitor />
        <div className="min-h-screen bg-white">
          <EnhancedHeroSection />
          
          <CategoryStrip onCategoryClick={handleCategorySelect} currentCategory={undefined} />
          <TestimonialsSection />
          <FAQAccordion />

          <CartSidebar />
        </div>
      </main>
    </PageLoading>
  )
}
