"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Footer from "@/components/footer"
import CartSidebar from "@/components/cart-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, Home, Search, Filter, SlidersHorizontal, Baby, Heart, Shirt } from "lucide-react"
import Image from "next/image"
import PageLoading from "@/components/page-loading"
import SizeSelectionSidebar from "@/components/size-selection-sidebar"
import CheckoutPromptModal from "@/components/checkout-prompt-modal"
import { useBuyNow } from "@/components/buy-now-context"
import { useCart } from "@/components/cart-context"

interface Product {
  id: number
  name: string
  price: number
  originalPrice: number
  image: string
  category: string
  description: string
  sizes: string[]
  bestseller: boolean
  isBestSeller: boolean
  dateAdded?: string; // Added for date display
}

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  size: string
  image: string
}

interface CategoryPageClientProps {
  categorySlug: string
}

export default function CategoryPageClient({ categorySlug }: CategoryPageClientProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryName, setCategoryName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("featured")
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [sizeSelectionProduct, setSizeSelectionProduct] = useState<Product | null>(null)
  const [isSizeSelectionOpen, setIsSizeSelectionOpen] = useState(false)
  const [isCheckoutPromptOpen, setIsCheckoutPromptOpen] = useState(false)
  const [addedProduct, setAddedProduct] = useState<any>(null)
  const { setBuyNowItem } = useBuyNow()
  const { addToCart } = useCart()
  const router = useRouter()

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true)
        setCategoryName(
          categorySlug
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        )
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products?category=' + encodeURIComponent(categorySlug) + '&sortBy=createdAt&limit=16';
        const res = await fetch(apiUrl)
        const data = await res.json()
        const backendProducts = data.products || []
        // Map backend product to frontend shape
        const mappedProducts = backendProducts.map((p) => ({
          id: p._id,
          _id: p._id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          image: p.images?.[0] || '',
          images: p.images || [],
          category: p.category,
          description: p.description,
          // Standardize sizes: always { size, stock }
          sizes: Array.isArray(p.sizes)
            ? (typeof p.sizes[0] === 'object'
                ? p.sizes.map(s => ({ size: s.size, stock: s.stock }))
                : p.sizes.map(s => ({ size: s, stock: 99 }))
              )
            : [],
          bestseller: p.bestseller,
          isBestSeller: p.isBestSeller,
          dateAdded: p.createdAt, // Assuming createdAt is the dateAdded field
        }))
        setProducts(mappedProducts)
        setFilteredProducts(mappedProducts)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching products:", error)
        setLoading(false)
      }
    }
    if (categorySlug) {
      fetchCategoryProducts()
    }
  }, [categorySlug])

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Sort products
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        // Keep original order for "featured"
        break
    }

    setFilteredProducts(filtered)
  }, [products, searchQuery, sortBy])

  const handleProductClick = (productId: number) => {
    window.location.href = `/product/${productId}`
  }

  const handleCategorySelect = (slug: string) => {
    window.location.href = `/collections/${slug}`
  }

  const handleAddToCart = (product: Product) => {
    // Ensure images array is unique and not duplicating the main image
    let images: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      images = Array.from(new Set(product.images.filter(Boolean)));
    } else if (product.image) {
      images = [product.image];
    }
    setSizeSelectionProduct({
      ...product,
      images,
    });
    setIsSizeSelectionOpen(true);
  }

  const handleSizeSelectionAddToCart = (product: Product, size: string, quantity: number) => {
    addToCart({
      id: product._id,
      _id: product._id,
      name: product.name,
      price: product.price,
      quantity,
      size,
      image: product.image,
    });
    setAddedProduct({
      name: product.name,
      price: product.price,
      image: product.image,
      size,
      quantity,
    });
    setIsCheckoutPromptOpen(true);
  };

  const handleSizeSelectionBuyNow = (product: Product, size: string, quantity: number) => {
    setBuyNowItem({
      id: product._id,
      _id: product._id,
      name: product.name,
      price: product.price,
      quantity,
      size,
      image: product.image,
    });
    window.location.href = "/checkout?mode=buynow";
  };

  const handleCheckout = () => {
    // Navigate to checkout page or open WhatsApp
    const message = `Hi! I'd like to proceed with checkout for my cart items. Please assist me with the payment process.`
    const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleUpdateQuantity = (productId: number, size: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === productId && item.size === size ? { ...item, quantity } : item)),
    )
  }

  const handleRemoveItem = (productId: number, size: string) => {
    setCartItems((prev) => prev.filter((item) => !(item.id === productId && item.size === size)))
  }

  function formatDateYYYYMMDD(date: string) {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  return (
    <PageLoading loadingMessage="Loading Shinthaa Collection..." minLoadingTime={1500}>
      <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
        <div className="flex w-full overflow-x-hidden">
          {/* Category Sidebar - Refined Design with Proper Bounds */}
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <div className="sticky top-32 h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="bg-white shadow-lg rounded-2xl p-6 mx-4">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-[rgb(71,60,102)] font-serif">Categories</h2>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      icon: Baby,
                      title: "Maternity Feeding Wear",
                      slug: "maternity-feeding-wear",
                      description: "Comfortable feeding essentials",
                      bgColor: "bg-blue-50/80",
                      hoverBgColor: "hover:bg-blue-100/80",
                      borderColor: "border-blue-100",
                      hoverBorderColor: "hover:border-blue-300",
                      iconBgColor: "bg-blue-100",
                      activeIconBgColor: "bg-blue-500",
                    },
                    {
                      icon: Heart,
                      title: "Zipless Feeding Lounge Wear",
                      slug: "zipless-feeding-lounge-wear",
                      description: "Revolutionary zipless design",
                      bgColor: "bg-pink-50/80",
                      hoverBgColor: "hover:bg-pink-100/80",
                      borderColor: "border-pink-100",
                      hoverBorderColor: "hover:border-pink-300",
                      iconBgColor: "bg-pink-100",
                      activeIconBgColor: "bg-pink-500",
                    },
                    {
                      icon: Shirt,
                      title: "Non-Feeding Lounge Wear",
                      slug: "non-feeding-lounge-wear",
                      description: "Elegant everyday comfort",
                      bgColor: "bg-green-50/80",
                      hoverBgColor: "hover:bg-green-100/80",
                      borderColor: "border-green-100",
                      hoverBorderColor: "hover:border-green-300",
                      iconBgColor: "bg-green-100",
                      activeIconBgColor: "bg-green-500",
                    },
                  ].map((category) => {
                    const Icon = category.icon
                    const isActive = categorySlug === category.slug

                    return (
                      <button
                        key={category.slug}
                        onClick={() => handleCategorySelect(category.slug)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 ${
                          isActive
                            ? `${category.borderColor} ${category.activeIconBgColor.replace("bg-", "bg-").replace("-500", "-50")} border-opacity-60`
                            : `${category.bgColor} ${category.hoverBgColor} ${category.borderColor} ${category.hoverBorderColor} border-opacity-40`
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div
                            className={`p-3 rounded-xl ${isActive ? category.activeIconBgColor : category.iconBgColor} transition-all duration-300`}
                          >
                            <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-600"}`} />
                          </div>
                          <div className="flex-1">
                            <h3
                              className={`font-semibold text-base mb-1 ${isActive ? "text-gray-900" : "text-gray-800"}`}
                            >
                              {category.title}
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })}

                  {/* More Categories Coming Soon */}
                  <div className="mt-8 p-6 bg-gradient-to-br from-purple-50/60 to-pink-50/60 rounded-2xl border-2 border-purple-100/40 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <div className="text-2xl">✨</div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 font-serif">More Categories Coming Soon!</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      We're working on exciting new collections to make your motherhood journey even more beautiful.
                    </p>
                    <div className="mt-4 text-xs text-gray-500">Stay tuned for updates 💕</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 lg:ml-0 w-full">
            {/* Breadcrumb */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 w-full">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/")}>
                  <Home className="h-4 w-4 mr-1" />
                  Home
                </Button>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">{categoryName}</span>
              </div>
            </div>

            {/* Page Header with Search and Filters */}
            <div className="px-4 sm:px-6 lg:px-8 pb-6 lg:pb-8 w-full">
              <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4 font-serif">
                  {categoryName}
                </h1>
                <p className="text-base lg:text-lg text-gray-600 max-w-3xl">
                  Discover our carefully curated collection of premium maternity wear designed for your comfort and
                  style.
                </p>
              </div>

              {/* Mobile Category Navigation - Only visible on mobile */}
              <div className="lg:hidden px-0 pb-6 w-full">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide w-full">
                  {[
                    {
                      icon: Baby,
                      title: "Feeding Wear",
                      slug: "maternity-feeding-wear",
                      bgColor: "bg-blue-50",
                      borderColor: "border-blue-200",
                      textColor: "text-blue-700",
                      activeBgColor: "bg-blue-100",
                      activeBorderColor: "border-blue-400",
                    },
                    {
                      icon: Heart,
                      title: "Zipless Lounge",
                      slug: "zipless-feeding-lounge-wear",
                      bgColor: "bg-pink-50",
                      borderColor: "border-pink-200",
                      textColor: "text-pink-700",
                      activeBgColor: "bg-pink-100",
                      activeBorderColor: "border-pink-400",
                    },
                    {
                      icon: Shirt,
                      title: "Casual Wear",
                      slug: "non-feeding-lounge-wear",
                      bgColor: "bg-green-50",
                      borderColor: "border-green-200",
                      textColor: "text-green-700",
                      activeBgColor: "bg-green-100",
                      activeBorderColor: "border-green-400",
                    },
                  ].map((category) => {
                    const isActive = categorySlug === category.slug

                    return (
                      <button
                        key={category.slug}
                        onClick={() => handleCategorySelect(category.slug)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-300 font-medium text-sm ${
                          isActive
                            ? `${category.activeBgColor} ${category.activeBorderColor} ${category.textColor} shadow-md`
                            : `${category.bgColor} ${category.borderColor} ${category.textColor} hover:${category.activeBgColor} hover:${category.activeBorderColor}`
                        }`}
                      >
                        <category.icon className="h-5 w-5" />
                        {category.title}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Search and Filter Bar */}
              <div className="flex flex-col gap-2 mb-6 lg:mb-8 w-full max-w-full px-0 sm:px-0">
                {/* Search Bar Row with Sort */}
                <div className="flex w-full gap-2 flex-row">
                  <div className="relative flex-1 min-w-0 max-w-full flex items-center">
                    <div className="flex items-center w-full">
                      <span className="inline-flex items-center px-3 h-12 border border-r-0 border-gray-200 bg-white rounded-l-full text-gray-400 text-base">
                        <Search className="h-5 w-5" />
                      </span>
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-12 border border-gray-200 border-l-0 rounded-l-none rounded-r-lg focus:border-[rgb(71,60,102)] bg-white text-base w-full max-w-[calc(100vw-4.5rem)] sm:w-[350px] lg:w-[450px] transition-all duration-200 pr-2"
                        style={{ boxShadow: 'none' }}
                      />
                    </div>
                  </div>
                  {/* Sort Dropdown: Icon only on mobile, full on sm+ */}
                  <div className="flex-shrink-0">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      {/* Mobile: icon only */}
                      <SelectTrigger className="h-12 w-12 border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-lg flex items-center justify-center sm:hidden">
                        <SlidersHorizontal className="h-6 w-6" />
                    </SelectTrigger>
                      {/* Desktop: full dropdown */}
                      <SelectTrigger className="hidden sm:flex w-40 h-12 border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-lg items-center">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="name">Name: A to Z</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              </div>

              {/* Results Count */}
              <div className="mb-6 w-full">
                <p className="text-gray-600">
                  Showing {filteredProducts.length} of {products.length} products
                  {searchQuery && ` for "${searchQuery}"`}
                </p>
              </div>
            </div>

            {/* Products Grid - Responsive: 2 columns on mobile, 4 on desktop */}
            {/* Products Grid - Clean Minimalist Layout */}
            <div className="px-2 sm:px-4 lg:px-8 pb-16 w-full box-border">
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 aspect-square rounded-lg mb-4" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-10 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group cursor-pointer"
                      onClick={() => handleProductClick(product.id)}
                    >
                      {/* Clean Product Image */}
                      <div className="relative aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden mb-4">
                        <Image
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          loading="lazy"
                          className="object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg"
                        />
                      </div>

                      {/* Clean Product Info */}
                      <div className="space-y-3">
                        {/* Product Title */}
                        <h3 className="text-sm lg:text-base font-medium text-gray-900 leading-tight">{product.name}</h3>

                        {/* Price */}
                        <div className="text-sm lg:text-base text-gray-900">
                          ₹ {product.price.toLocaleString()}.00 INR
                        </div>

                        {/* Simple Add to Cart Button */}
                        <Button
                          variant="outline"
                          className="w-full border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white bg-white rounded-none font-normal text-sm py-2 h-auto transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddToCart(product)
                          }}
                        >
                          ADD TO CART
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
                  <Button
                    onClick={() => {
                      setSearchQuery("")
                      setSortBy("featured")
                    }}
                    variant="outline"
                    className="border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white bg-white rounded-none px-6"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <CartSidebar
          isOpen={isCartSidebarOpen}
          onClose={() => setIsCartSidebarOpen(false)}
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
        />

        <SizeSelectionSidebar
          isOpen={isSizeSelectionOpen}
          onClose={() => setIsSizeSelectionOpen(false)}
          product={sizeSelectionProduct}
          onAddToCart={handleSizeSelectionAddToCart}
          onBuyNow={handleSizeSelectionBuyNow}
        />

        <CheckoutPromptModal
          isOpen={isCheckoutPromptOpen}
          onClose={() => setIsCheckoutPromptOpen(false)}
          onViewCart={() => {
            setIsCheckoutPromptOpen(false)
            setIsCartSidebarOpen(true)
          }}
          onCheckout={handleCheckout}
          product={addedProduct}
        />
      </div>
    </PageLoading>
  )
} 