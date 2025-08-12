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
      category: product.category,
      categorySlug: product.categorySlug,
    }, true); // Open cart sidebar automatically
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

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {/* Header Section */}
              <div className="bg-white shadow-sm border-b border-gray-200 sticky top-20 z-30">
                <div className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Breadcrumb and Title */}
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => (window.location.href = "/")}>
                        Home
                      </Button>
                      <ChevronRight className="h-4 w-4" />
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => (window.location.href = "/collections")}>
                        Collections
                      </Button>
                      <ChevronRight className="h-4 w-4" />
                      <span className="text-gray-900 font-medium">{categorySlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>

                    {/* Product Count */}
                    <div className="text-sm text-gray-500">
                      {filteredProducts.length} of {products.length} products
                    </div>
                  </div>

                  {/* Search and Filter Bar */}
                  <div className="mt-4 flex flex-col sm:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(71,60,102)] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex items-center gap-3">
                      {/* Size Filter */}
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="w-32 border border-gray-300 rounded-lg">
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Sizes</SelectItem>
                          <SelectItem value="S">S</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="XL">XL</SelectItem>
                          <SelectItem value="XXL">XXL</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Sleeve Type Filter */}
                      <Select value={sleeveTypeFilter} onValueChange={setSleeveTypeFilter}>
                        <SelectTrigger className="w-40 border border-gray-300 rounded-lg">
                          <SelectValue placeholder="Sleeve Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sleeve Types</SelectItem>
                          <SelectItem value="sleeveless">Sleeveless</SelectItem>
                          <SelectItem value="short-sleeve">Short Sleeve</SelectItem>
                          <SelectItem value="long-sleeve">Long Sleeve</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Sort Dropdown */}
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-32 border border-gray-300 rounded-lg">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="price-low">Price: Low to High</SelectItem>
                          <SelectItem value="price-high">Price: High to Low</SelectItem>
                          <SelectItem value="name">Name: A to Z</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Clear Filters Button */}
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllFilters}
                          className="border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="p-6">
                {filteredProducts.length > 0 ? (
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
            product={sizeSelectionProduct}
            onAddToCart={handleSizeSelectionAddToCart}
            onBuyNow={handleSizeSelectionBuyNow}
          />
        </div>
      </PageLoading>
    </ErrorBoundary>
  )
}
