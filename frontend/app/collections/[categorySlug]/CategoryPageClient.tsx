"use client"

import { useState, useEffect } from "react"
import Footer from "@/components/footer"
import CartSidebar from "@/components/cart-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronRight, Home, Search, Filter, SlidersHorizontal, Baby, Heart, Shirt, X, ShoppingBag } from "lucide-react"
import Image from "next/image"
import PageLoading from "@/components/page-loading"
import SizeSelectionSidebar from "@/components/size-selection-sidebar"
import CheckoutPromptModal from "@/components/checkout-prompt-modal"
import ErrorBoundary from "@/components/error-boundary"
import { safeFetch } from "@/lib/api-health"
import { useBuyNow } from "@/components/buy-now-context"
import { useCart } from "@/components/cart-context"
import { useRouter, useSearchParams } from "next/navigation"
import WishlistButton from "@/components/WishlistButton"

interface Product {
  id: string // This will be the customId for routing
  _id: string // MongoDB ID for internal use
  customId: string // Custom product ID from admin
  name: string
  price: number
  originalPrice: number
  image: string
  images?: string[]
  category: string
  description: string
  sizes: any[] // Can be string[] or { size: string, stock: number }[]
  bestseller: boolean
  isBestSeller: boolean
  sleeveType?: string
  dateAdded?: string
}

interface CategoryPageClientProps {
  categorySlug: string
}

export default function CategoryPageClient({ categorySlug }: CategoryPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("featured")
  const [sizeSelectionProduct, setSizeSelectionProduct] = useState<Product | null>(null)
  const [isSizeSelectionOpen, setIsSizeSelectionOpen] = useState(false)
  const [isCheckoutPromptOpen, setIsCheckoutPromptOpen] = useState(false)
  const [addedProduct, setAddedProduct] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [sleeveTypeFilter, setSleeveTypeFilter] = useState("all")
  const [availableSleeveTypes, setAvailableSleeveTypes] = useState<string[]>([])
  const [selectedSize, setSelectedSize] = useState<string>("")
  const { setBuyNowItem } = useBuyNow()
  const { addToCart } = useCart()

  // Available sizes for filtering (removed XS)
  const AVAILABLE_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"]

  // Calculate available sizes with stock
  const getAvailableSizesWithStock = () => {
    const sizeCounts: { [key: string]: number } = {};
    
    // Initialize all sizes with 0 count
    AVAILABLE_SIZES.forEach(size => {
      sizeCounts[size] = 0;
    });
    
    // Count products available for each size
    products.forEach(product => {
      if (product.sizes && Array.isArray(product.sizes)) {
        product.sizes.forEach((sizeObj: any) => {
          if (typeof sizeObj === 'object' && sizeObj.size && sizeObj.stock > 0) {
            // New format: { size: "S", stock: 5 }
            if (sizeCounts.hasOwnProperty(sizeObj.size)) {
              sizeCounts[sizeObj.size]++;
            }
          } else if (typeof sizeObj === 'string') {
            // Legacy format: "S"
            if (sizeCounts.hasOwnProperty(sizeObj)) {
              sizeCounts[sizeObj]++;
            }
          }
        });
      }
    });
    
    // Return sizes with their counts
    return AVAILABLE_SIZES.filter(size => sizeCounts[size] > 0).map(size => ({
      size,
      count: sizeCounts[size]
    }));
  };

  const availableSizesWithStock = getAvailableSizesWithStock();

  // Initialize filters from URL params
  useEffect(() => {
    const sizeParam = searchParams.get('size')
    if (sizeParam) {
      setSelectedSize(sizeParam)
    }
  }, [searchParams])

  // Update URL when filters change
  const updateURL = (newSize?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newSize) {
      params.set('size', newSize)
    } else {
      params.delete('size')
    }
    
    const newURL = `${window.location.pathname}?${params.toString()}`
    router.push(newURL, { scroll: false })
  }

  // Handle size filter selection
  const handleSizeFilter = (size: string) => {
    if (selectedSize === size) {
      // Deselect if already selected
      setSelectedSize("")
      updateURL("")
    } else {
      // Select new size
      setSelectedSize(size)
      updateURL(size)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedSize("")
    setSleeveTypeFilter("all")
    setSearchQuery("")
    setSortBy("featured")
    updateURL("")
  }

  // Compute category name from slug
  const categoryName = categorySlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  const shouldShowSleeveFilter = () => {
    // Show sleeve filter for all lounge wear and feeding wear categories
    return categorySlug === "zipless-feeding-lounge-wear" ||
           categorySlug === "non-feeding-lounge-wear" ||
           categorySlug === "maternity-feeding-wear" ||
           categorySlug === "zipless-feeding-dupatta-lounge-wear";
  };

  // Fetch available sleeve types for the current category
  useEffect(() => {
    // Use default sleeve types since the API endpoint doesn't exist
    if (shouldShowSleeveFilter()) {
      setAvailableSleeveTypes(['Puff Sleeve', 'Normal Sleeve']);
    }
  }, [categorySlug]);

  useEffect(() => {
    async function getProducts() {
      setLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const url = new URL(`${baseUrl}/api/products`);
        if (categorySlug) {
          url.searchParams.append('categorySlug', categorySlug);
          url.searchParams.append('sortBy', 'displayOrder');
          url.searchParams.append('sortOrder', 'asc');
        }
        // Add sleeve type filter to API call if selected
        if (sleeveTypeFilter && sleeveTypeFilter !== 'all') {
          url.searchParams.append('sleeveType', sleeveTypeFilter);
        }
        // Add size filter to API call if selected
        if (selectedSize) {
          url.searchParams.append('size', selectedSize);
        }

        const res = await safeFetch(url.toString());

        if (!res || !res.ok) {
          throw new Error(`Failed to fetch products: ${res?.status || 'Network error'} ${res?.statusText || ''}`);
        }

        const data = await res.json();
        // Map backend fields to frontend
        const mappedProducts = (data.products || []).map((p: any) => ({
          id: String(p.customId || p._id), // Use customId for routing, fallback to _id
          _id: String(p._id),
          customId: String(p.customId || p._id),
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          image: (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : '/placeholder.svg',
          images: Array.isArray(p.images) ? p.images : [p.image || '/placeholder.svg'],
          category: p.category,
          description: p.description,
          sizes: p.sizes || [],
          bestseller: p.bestseller,
          isBestSeller: p.isBestSeller,
          sleeveType: p.sleeveType,
          dateAdded: p.createdAt,
        }));
        setProducts(mappedProducts);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching products:', err);
        }
        setError(err instanceof Error ? err.message : 'An error occurred while fetching products');
      } finally {
        setLoading(false);
      }
    }
    getProducts();
  }, [categorySlug, sleeveTypeFilter, selectedSize]);

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

    // Sleeve type filter
    if (sleeveTypeFilter && sleeveTypeFilter !== 'all') {
      filtered = filtered.filter(product => product.sleeveType === sleeveTypeFilter)
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
        break
    }

    setFilteredProducts(filtered)
  }, [products, searchQuery, sortBy, sleeveTypeFilter])

  const handleProductClick = (productId: string) => {
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

  const handleSizeSelectionAddToCart = (product: any, size: string, quantity: number, _stock: number) => {
    addToCart({
      id: product._id || product.id,
      _id: product._id || product.id,
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

  const handleSizeSelectionBuyNow = (product: any, size: string, quantity: number) => {
    setBuyNowItem({
      id: product._id || product.id,
      _id: product._id || product.id,
      name: product.name,
      price: product.price,
      quantity,
      size,
      image: product.image,
    });
    window.location.href = "/checkout?mode=buynow";
  };

  const handleCheckout = () => {
    window.location.href = "/checkout";
  }

  // Check if any filters are active
  const hasActiveFilters = selectedSize || sleeveTypeFilter !== 'all' || searchQuery

  return (
    <ErrorBoundary>
      <PageLoading loadingMessage="Loading Shithaa Collection..." minLoadingTime={1500}>
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
                <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/collections")}>
                  Collections
                </Button>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">{categoryName}</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-center font-semibold mb-4">
                {error}
              </div>
            )}

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

              {/* Loungewear Offer Banner */}
              {(categorySlug === "zipless-feeding-lounge-wear" || 
                categorySlug === "non-feeding-lounge-wear" || 
                categorySlug === "zipless-feeding-dupatta-lounge-wear") && (
                <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                        <span className="text-pink-600 text-sm font-bold">🔥</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-pink-800 text-sm">
                        Buy 3 Loungewear for ₹1299!
                      </p>
                      <p className="text-xs text-pink-600 mt-1">
                        Add any 3 loungewear items to your cart to unlock this special bundle offer
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                    {
                      icon: Heart,
                      title: "Dupatta Lounge",
                      slug: "zipless-feeding-dupatta-lounge-wear",
                      bgColor: "bg-yellow-50",
                      borderColor: "border-yellow-200",
                      textColor: "text-yellow-700",
                      activeBgColor: "bg-yellow-100",
                      activeBorderColor: "border-yellow-400",
                    },
                  ].map(category => {
                    const isActive = categorySlug === category.slug;
                    return (
                      <button
                        key={category.slug}
                        onClick={() => handleCategorySelect(category.slug)}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-300 font-medium text-sm
                          ${isActive
                            ? `${category.activeBgColor} ${category.activeBorderColor} ${category.textColor}`
                            : `${category.bgColor} ${category.borderColor} ${category.textColor}`
                          }`}
                      >
                        <category.icon className="h-5 w-5" />
                        {category.title}
                      </button>
                    );
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
                  {/* Sleeve Type Filter - Show next to sort on desktop */}
                  {shouldShowSleeveFilter() && (
                    <div className="flex-shrink-0 hidden sm:block">
                      <Select value={sleeveTypeFilter} onValueChange={setSleeveTypeFilter}>
                        <SelectTrigger className="w-48 h-12 border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-lg">
                          <SelectValue placeholder="Filter by Sleeve Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sleeve Types</SelectItem>
                          {(availableSleeveTypes.length > 0 ? availableSleeveTypes : ['Puff Sleeve', 'Normal Sleeve']).map((sleeveType) => (
                            <SelectItem key={sleeveType} value={sleeveType}>
                              {sleeveType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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

                {/* Sleeve Type Filter - Mobile version (full width) */}
                {shouldShowSleeveFilter() && (
                  <div className="flex w-full gap-2 mt-2 sm:hidden">
                    <div className="flex-1">
                      <Select value={sleeveTypeFilter} onValueChange={setSleeveTypeFilter}>
                        <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-[rgb(71,60,102)] rounded-lg">
                          <SelectValue placeholder="Filter by Sleeve Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sleeve Types</SelectItem>
                          {(availableSleeveTypes.length > 0 ? availableSleeveTypes : ['Puff Sleeve', 'Normal Sleeve']).map((sleeveType) => (
                            <SelectItem key={sleeveType} value={sleeveType}>
                              {sleeveType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter and Sort Section */}
              <div className="mb-6 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <span className="text-gray-700 font-medium">Filter and sort</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {filteredProducts.length} of {products.length} products
                  </div>
                </div>

                {/* Applied Filters */}
                {(selectedSize || sleeveTypeFilter !== 'all') && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {selectedSize && (
                      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm">
                        <span className="text-gray-700">Size: {selectedSize}</span>
                        <button
                          onClick={() => handleSizeFilter(selectedSize)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {sleeveTypeFilter !== 'all' && (
                      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm">
                        <span className="text-gray-700">Sleeve: {sleeveTypeFilter}</span>
                        <button
                          onClick={() => setSleeveTypeFilter('all')}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                      >
                        Remove all
                      </button>
                    )}
                  </div>
                )}

                {/* Size Filter Buttons */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableSizesWithStock.map((sizeWithCount) => (
                      <button
                        key={sizeWithCount.size}
                        onClick={() => handleSizeFilter(sizeWithCount.size)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          selectedSize === sizeWithCount.size
                            ? 'bg-black text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {sizeWithCount.size} ({sizeWithCount.count})
                      </button>
                    ))}
                  </div>
                </div>
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
                        
                        {/* Always visible wishlist button */}
                        <div className="absolute top-3 right-3 z-10">
                          <WishlistButton productId={product._id} size="sm" />
                        </div>
                        
                        {/* Overlay buttons on hover */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                          <Button 
                            size="sm" 
                            className="rounded-full bg-pink-500 hover:bg-pink-600 shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToCart(product)
                            }}
                          >
                            <ShoppingBag className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Clean Product Info */}
                      <div className="space-y-3">
                        {/* Product Title */}
                        <h3 className="text-sm lg:text-base font-medium text-gray-900 leading-tight">{product.name}</h3>

                        {/* Price */}
                        <div className="text-sm lg:text-base text-gray-900">
                          ₹ {product.price.toLocaleString()}.00 INR
                        </div>

                        {/* Sleeve Type */}
                        {product.sleeveType && (
                          <p className="text-xs text-gray-500 mt-1">{product.sleeveType}</p>
                        )}

                        {/* Simple Add to Cart Button */}
                        <Button
                          variant="outline"
                          className="w-full border border-brand text-brand hover:bg-brand hover:text-white bg-white rounded-none font-normal text-sm py-2 h-auto transition-colors duration-200 focus:ring-2 focus:ring-brand"
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
                    onClick={clearAllFilters}
                    variant="outline"
                    className="border border-brand text-brand hover:bg-brand hover:text-white bg-white rounded-none px-6 focus:ring-2 focus:ring-brand"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <CartSidebar />

        <SizeSelectionSidebar
          isOpen={isSizeSelectionOpen}
          onClose={() => setIsSizeSelectionOpen(false)}
          product={sizeSelectionProduct as any}
          onAddToCart={handleSizeSelectionAddToCart}
          onBuyNow={handleSizeSelectionBuyNow}
        />

        <CheckoutPromptModal
          isOpen={isCheckoutPromptOpen}
          onClose={() => setIsCheckoutPromptOpen(false)}
          onViewCart={() => {
            setIsCheckoutPromptOpen(false)
            // Cart sidebar is handled by the cart context
          }}
          onCheckout={handleCheckout}
          product={addedProduct}
        />
        </div>
      </PageLoading>
    </ErrorBoundary>
  )
}
