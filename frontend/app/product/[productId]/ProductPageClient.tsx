"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Share2, Truck, Shield, RotateCcw, Plus, Minus, Star, ChevronRight } from "lucide-react"
import Image from "next/image"
import Script from "next/script"
import PageLoading from "@/components/page-loading"
import { useCart } from "@/components/cart-context";
import { useBuyNow } from "@/components/buy-now-context";
import { useCheckoutFlow } from "@/components/checkout-flow-manager";
import WishlistButton from "@/components/WishlistButton"
import { toast } from "sonner"

interface Product {
  id?: number
  _id?: string
  customId?: string
  name: string
  price: number
  originalPrice: number
  images: string[]
  category: string
  description: string
  sizes: { size: string; stock: number }[]
  features: string[]
  rating: number
  reviews: number
  stock: number
  availableSizes?: string[]
  categorySlug?: string;
}

interface ProductPageClientProps {
  productId: string
}

export default function ProductPageClient({ productId }: ProductPageClientProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { addToCart, openCartSidebar, clearCart } = useCart()
  const { setBuyNowItem } = useBuyNow()
  const { setCheckoutFlow } = useCheckoutFlow();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // 🔧 FIX: Add aggressive cache busting and debugging
        const timestamp = Date.now();
        const random = Math.random();
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/products/${productId}?_t=${timestamp}&_r=${random}&_fresh=true&_cache_bust=${refreshKey}`;
        console.log('🔄 Fetching product from:', apiUrl);
        console.log('🔄 Refresh key:', refreshKey);
        
        const res = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'If-None-Match': '*'
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        
        console.log('📦 Product API response:', data);
        
        if (data.product) {
          console.log('📏 Product sizes from API:', data.product.sizes);
          console.log('📏 AvailableSizes from API:', data.product.availableSizes);
          console.log('📏 Product name:', data.product.name);
          console.log('📏 Product customId:', data.product.customId);
          
          // 🔧 FIX: Ensure sizes array is properly formatted
          if (data.product.sizes && Array.isArray(data.product.sizes)) {
            console.log('✅ Sizes array is valid:', data.product.sizes.length, 'items');
            data.product.sizes.forEach((size, index) => {
              console.log(`  - Size ${index + 1}:`, size);
            });
            
            // 🔧 FIX: Validate each size object
            const validSizes = data.product.sizes.filter(size => size && size.size);
            console.log('✅ Valid sizes after filtering:', validSizes.length);
            if (validSizes.length !== data.product.sizes.length) {
              console.log('⚠️ Some sizes were invalid and filtered out');
            }
          } else {
            console.log('❌ Sizes array is invalid:', data.product.sizes);
          }
          
          setProduct(data.product);
        } else if (data.success && data.data) {
          console.log('📏 Product sizes from API (data):', data.data.sizes);
          setProduct(data.data);
        } else {
          setError(data.message || data.error || 'Failed to fetch product');
        }
      } catch (error) {
        console.error('❌ Error fetching product:', error);
        setError('Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, refreshKey])

  // Per-size stock logic - FIXED: Use same logic as SizeSelectionSidebar
  const sizeOptions = Array.isArray(product?.sizes) && product.sizes.length > 0
    ? product.sizes.map(s => s.size)
    : [];
  
  // 🔧 DEBUG: Log size processing
  console.log('🔍 PRODUCT PAGE DEBUG:');
  console.log('Product data:', product);
  console.log('Sizes array:', product?.sizes);
  console.log('Size options calculated:', sizeOptions);
  console.log('Size options length:', sizeOptions.length);
  
  const selectedSizeObj = product?.sizes?.find(s => s.size === selectedSize);
  const selectedSizeStock = selectedSizeObj ? Math.max(0, (selectedSizeObj.stock || 0) - (selectedSizeObj.reserved || 0)) : 0;

  // Auto-adjust quantity if it exceeds stock when size changes
  useEffect(() => {
    if (selectedSize && selectedSizeStock > 0 && quantity > selectedSizeStock) {
      setQuantity(selectedSizeStock)
    }
  }, [selectedSize, selectedSizeStock, quantity])

  const handleBuyNow = async () => {
    if (!selectedSize) {
      toast.error("Please select a size first!")
      return
    }
    if (!product) return;
    
    // Set buy now item with fresh data - use _id as primary ID since that's what backend returns
    const buyNowItem = {
      id: (product._id || product.id || productId)?.toString() || productId,
      _id: (product._id || product.id || productId)?.toString() || productId,
      name: product.name,
      price: product.price,
      quantity,
      size: selectedSize,
      image: product.images[0] || "/placeholder.svg",
      categorySlug: product.categorySlug,
      category: product.category
    };
    
    console.log('🛒 Setting buy-now item:', buyNowItem);
    
    // Set buy now item in context
    setBuyNowItem(buyNowItem);
    
    // Also manually save to storage to ensure persistence
    const buyNowData = {
      flow: {
        mode: 'buy-now',
        items: [buyNowItem],
        source: 'buy-now',
        timestamp: Date.now(),
        sessionId: `buynow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      items: [buyNowItem],
      timestamp: Date.now()
    };
    
    // Save to multiple storage locations for maximum persistence
    sessionStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
    localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
    sessionStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
    localStorage.setItem('buyNowCheckoutData', JSON.stringify(buyNowData));
    
    console.log('💾 Buy-now item saved to storage before navigation');
    
    // Navigate to checkout using the checkout flow manager
    setCheckoutFlow('buy-now');
    
    // Small delay to ensure storage is written before navigation
    setTimeout(() => {
      console.log('🚀 Navigating to buy-now checkout');
      window.location.href = '/checkout?mode=buynow';
    }, 100);
  }

  // Safety check - ensure product exists before rendering
  if (loading) {
    return (
      <PageLoading loadingMessage="Loading Product Details...">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#473C66] mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading product details...</p>
          </div>
        </div>
      </PageLoading>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <Button onClick={() => (window.location.href = "/")} className="rounded-full">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  // Additional safety check - ensure all required fields exist
  if (!product.name || !product.price || !product.images || !product.sizes) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Product Data</h1>
          <p className="text-gray-600 mb-4">This product appears to have incomplete information.</p>
          <Button onClick={() => (window.location.href = "/")} className="rounded-full">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  let stockStatus = '';
  if (!selectedSize) stockStatus = '';
  else if (selectedSizeStock > 5) stockStatus = 'In Stock';
  else if (selectedSizeStock > 0) stockStatus = `Only ${selectedSizeStock} left!`;
  else stockStatus = 'Out of Stock';

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col h-auto py-3">
              {/* Breadcrumb */}
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                <Button variant="link" size="sm" className="p-0 h-auto text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80" onClick={() => (window.location.href = "/")}>
                  Home
                </Button>
                <ChevronRight className="h-4 w-4" />
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto text-[rgb(71,60,102)] hover:text-[rgb(71,60,102)]/80" 
                  onClick={() => (window.location.href = `/collections/${product.category.toLowerCase().replace(/ /g, '-')}`)}
                >
                  {product.category}
                </Button>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium truncate">{product.name}</span>
              </div>
              
              {/* Product Title and Share */}
              <div className="flex items-center">
                <Button variant="ghost" onClick={() => window.history.back()} className="mr-4">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </Button>
                <h1 className="text-lg font-semibold text-gray-900 truncate flex-1">{product.name}</h1>
                <div className="flex items-center space-x-2">
                  <WishlistButton productId={product.id?.toString() || product._id || productId} size="sm" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={async () => {
                      if (navigator.share) {
                        const shareData = {
                          title: product.name || 'Product',
                          text: product.description || 'Check out this product',
                          url: window.location.href
                        };
                        try {
                          await navigator.share(shareData);
                        } catch (err) {
                          console.log('Share cancelled');
                        }
                      } else if (navigator.clipboard) {
                        try {
                          await navigator.clipboard.writeText(window.location.href);
                          alert('Link copied!');
                        } catch (err) {
                          alert('Could not copy link');
                        }
                      } else {
                        alert('Share not supported');
                      }
                    }}
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Add Product structured data */}
          {product && (
            <Script
              id="product-schema"
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "Product",
                  "name": product.name,
                  "image": product.images.length > 0 ? product.images : "/placeholder.svg",
                  "description": product.description,
                  "sku": `SHITHAA-${productId}`,
                  "mpn": `SHITHAA-${productId}`,
                  "brand": {
                    "@type": "Brand",
                    "name": "Shithaa"
                  },
                  "offers": {
                    "@type": "Offer",
                    "url": `https://shithaa.in/product/${productId}`,
                    "priceCurrency": "INR",
                    "price": product.price,
                    "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                    "itemCondition": "https://schema.org/NewCondition",
                    "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                    "seller": {
                      "@type": "Organization",
                      "name": "Shithaa"
                    }
                  },
                  "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": product.rating,
                    "reviewCount": product.reviews
                  }
                })
              }}
            />
          )}
          
          {/* Add BreadcrumbList structured data */}
          {product && (
            <Script
              id="breadcrumb-schema"
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "BreadcrumbList",
                  "itemListElement": [
                    {
                      "@type": "ListItem",
                      "position": 1,
                      "name": "Home",
                      "item": "https://shithaa.in"
                    },
                    {
                      "@type": "ListItem",
                      "position": 2,
                      "name": product.category || "Product",
                      "item": `https://shithaa.in/collections/${(product.category || "product").toLowerCase().replace(/ /g, '-')}`
                    },
                    {
                      "@type": "ListItem",
                      "position": 3,
                      "name": product.name,
                      "item": `https://shithaa.in/product/${productId}`
                    }
                  ]
                })
              }}
            />
          )}
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="relative aspect-[2/3] w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-lg mx-auto">
                <Image
                  src={product.images[selectedImage] || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                <button
                  className="absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-700 rounded-full p-2 shadow transition-all"
                  title="Expand image"
                  onClick={() => window.open(product.images[selectedImage] || '/placeholder.svg', '_blank')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2" /></svg>
                </button>
                {product.originalPrice > product.price && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </div>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto mt-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-none w-16 aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === index ? "border-gray-900" : "border-gray-200"
                      }`}
                    >
                      <Image
                        src={image || "/placeholder.svg"}
                        alt={`${product.name} ${index + 1}`}
                        width={60}
                        height={90}
                        className="object-cover w-full h-full"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{product.category}</p>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

                {/* Price */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
                  {product.originalPrice > product.price && (
                    <span className="text-xl text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                  )}
                </div>

                <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

                {/* Loungewear Offer Banner (only for eligible categories) */}
                {(product.category === "Zipless Feeding Lounge Wear" || 
                  product.category === "Non-Feeding Lounge Wear") && (
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
                          Add 2 more loungewear items to your cart to unlock this special bundle offer
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom Size, Quantity, and Action Section */}
                <div className="space-y-4">
                  {/* Size label and Sizing guide */}
                  <div className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                    <span>
                      SIZE:
                      <span className="ml-1 font-semibold text-gray-900">{selectedSize || "-"}</span>
                    </span>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-cyan-600 hover:underline hover:text-cyan-700 transition text-xs font-medium"
                      onClick={() => window.open('/sizing-guide', '_blank')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6 6M4 20h7a2 2 0 002-2v-7a2 2 0 00-2-2H4a2 2 0 00-2 2v7a2 2 0 002 2z" /></svg>
                      Sizing guide
                    </button>
                  </div>
                  {/* Size grid */}
                  {sizeOptions.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 mb-2">
                      {sizeOptions.map((size) => {
                        const sizeObj = product.sizes?.find(s => s.size === size);
                        const sizeStock = sizeObj ? sizeObj.stock : 0;
                        const isOutOfStock = sizeStock === 0;
                        const isSelected = selectedSize === size;
                        
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            disabled={isOutOfStock}
                            className={`border rounded-md px-3 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400
                              ${isSelected 
                                ? "border-gray-900 bg-gray-900 text-white" 
                                : isOutOfStock
                                  ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                                  : "border-gray-300 bg-white text-gray-900 hover:border-cyan-400"
                              }
                            `}
                            title={isOutOfStock ? "Out of Stock" : `Select size ${size}`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-red-500 font-medium mb-2">Size not available</div>
                  )}
                  
                  
                  {/* Size availability indicator */}
                  {sizeOptions.length > 0 && (
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>In Stock</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Out of Stock</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Size selection guidance */}
                  {!selectedSize && sizeOptions.length > 0 && (
                    <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-2">
                      💡 Please select a size to add this item to your cart
                    </div>
                  )}
                  
                  {/* Quantity and Add to Cart */}
                  <div className="flex gap-2 items-center mb-2">
                    <div className="flex items-center border rounded-md overflow-hidden w-[110px]">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="h-10 w-10 flex items-center justify-center text-lg font-bold text-gray-700 disabled:text-gray-300 bg-white hover:bg-gray-100 transition"
                      >
                        –
                      </button>
                      <span className="flex-1 text-center text-base font-semibold text-gray-900 select-none">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          // Only allow increasing quantity if it doesn't exceed available stock
                          if (selectedSizeStock && quantity < selectedSizeStock) {
                            setQuantity(quantity + 1)
                          }
                        }}
                        disabled={!selectedSize || !selectedSizeStock || quantity >= selectedSizeStock}
                        className="h-10 w-10 flex items-center justify-center text-lg font-bold text-gray-700 bg-white hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                    <span className={`ml-4 text-base font-semibold ${selectedSize && selectedSizeStock === 0 ? 'text-red-500' : selectedSizeStock <= 5 && selectedSizeStock > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{stockStatus}</span>
                    
                    {/* Stock warning if quantity exceeds available stock */}
                    {selectedSize && selectedSizeStock > 0 && quantity > selectedSizeStock && (
                      <div className="text-xs text-red-500 font-medium">
                        Maximum quantity: {selectedSizeStock}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      className={`flex-1 border rounded-md h-10 font-semibold transition text-sm disabled:opacity-50 disabled:cursor-not-allowed
                        ${!selectedSize 
                          ? "border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100" 
                          : selectedSizeStock === 0 
                            ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                            : "border-gray-400 bg-white text-gray-900 hover:bg-gray-100"
                        }
                      `}
                      disabled={!selectedSize || selectedSizeStock === 0 || quantity > selectedSizeStock}
                      onClick={() => {
                        if (!selectedSize) {
                          // Show feedback when no size is selected
                          toast.error("Please select a size first!");
                          return;
                        }
                        if (!product) return;
                        addToCart({
                          id: product.id?.toString() || product._id || productId,
                          _id: product.id?.toString() || product._id || productId,
                          name: product.name,
                          price: product.price,
                          quantity,
                          size: selectedSize,
                          image: product.images[0] || "/placeholder.svg",
                          category: product.category,
                        }, true);
                      }}
                    >
                      {!selectedSize ? "SELECT SIZE FIRST" : "ADD TO CART"}
                    </button>
                  </div>
                  {/* Buy it now */}
                  <button
                    type="button"
                    className="w-full h-12 rounded-md bg-[#473C66] hover:bg-[#3a3054] text-white font-bold text-base tracking-wide transition shadow-md"
                    disabled={!selectedSize || selectedSizeStock === 0 || quantity > selectedSizeStock}
                    onClick={handleBuyNow}
                  >
                    BUY IT NOW
                  </button>
                </div>
              </div>

              {/* Delivery Info */}
              <Card className="border-0 bg-gray-100 rounded-2xl">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium">Delivery in 3-5 Days</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium">Secure Checkout</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <RotateCcw className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium">
                        please refer to the{' '}
                        <a 
                          href="/return-policy" 
                          className="text-[#473C66] hover:text-[#3a3054] underline font-medium transition-colors"
                        >
                          refund policy
                        </a>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}