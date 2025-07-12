"use client"

import { useState, useEffect } from "react"
import { Metadata } from "next"
import HeroSection from "@/components/hero-section"
import ProductSlider from "@/components/product-slider"
import CategoryStrip from "@/components/category-strip"
import TestimonialCarousel from "@/components/testimonial-carousel"
import FAQAccordion from "@/components/faq-accordion"
import Footer from "@/components/footer"
import CategorySidebar from "@/components/category-sidebar"
import CartSidebar from "@/components/cart-sidebar"
import PageLoading from "@/components/page-loading"
import TestimonialsSection from "@/components/testimonials-section"

interface CartItem {
  id: number
  _id: number
  name: string
  price: number
  quantity: number
  size: string
  image: string
}

interface Product {
  id: number
  _id: number
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  isNewArrival?: boolean
  isBestSeller?: boolean
  sizes: { stock?: number }[]
  stock: number
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false)
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products';
        const res = await fetch(apiUrl);
        const data = await res.json();
        // Map backend fields to frontend
        const products = (data.data || data.products || []).map((p: any) => ({
          id: p._id,
          _id: p._id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          image: p.images?.[0] || '/placeholder.svg',
          category: p.category,
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

  const handleAddToCart = (product: Product) => {
    const cartItem: CartItem = {
      id: product.id,
      _id: product._id,
      name: product.name,
      price: product.price,
      quantity: 1,
      size: "M", // Default size
      image: product.image,
    }

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id && item.size === "M")
      if (existingItem) {
        return prev.map((item) =>
          item.id === product.id && item.size === "M" ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...prev, cartItem]
    })

    setIsCartSidebarOpen(true)
  }

  const handleUpdateQuantity = (id: number, quantity: number) => {
    setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const handleRemoveItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleCategorySelect = (slug: string) => {
    window.location.href = `/collections/${slug}`
  }

  const newArrivals = products.filter((p: Product) => p.isNewArrival)
  const bestSellers = products.filter((p: Product) => p.isBestSeller)

  return (
    <PageLoading loadingMessage="Welcome to Shinthaa" minLoadingTime={2000}>
      <div className="min-h-screen bg-white">
        <HeroSection />
        <CategoryStrip onCategoryClick={handleCategorySelect} currentCategory={undefined} />
        <TestimonialsSection />
        <FAQAccordion />

        <CartSidebar />
      </div>
    </PageLoading>
  )
}
