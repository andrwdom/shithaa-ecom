"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Share2, Truck, Shield, RotateCcw, Plus, Minus, Star, ChevronRight } from "lucide-react"
import Image from "next/image"
import Script from "next/script"
import PageLoading from "@/components/page-loading"
import { useCart } from "@/components/cart-context"
import { useBuyNow } from "@/components/buy-now-context"
import { safeFetch } from "@/lib/api-health"
import WishlistButton from "@/components/WishlistButton"

interface Product {
  id: number
  _id: string
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
  categorySlug?: string
}

interface ProductPageClientProps {
  productId: string
}

export default function ProductPageClient({ productId }: ProductPageClientProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const { addToCart, openCartSidebar } = useCart()
  const { setBuyNowItem } = useBuyNow()

  const fetchProduct = async () => {
    try {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products/' + productId;
      const res = await safeFetch(apiUrl);

      if (!res || !res.ok) {
        throw new Error(`Failed to fetch product: ${res?.status || 'Network error'}`);
      }

      const data = await res.json();
      if (data.data || data.product) {
        const p = data.data || data.product;
        setProduct({
          id: p._id,
          _id: p._id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          images: p.images || [],
          category: p.category,
          description: p.description,
          sizes: p.sizes || [],
          features: p.features || [],
          rating: p.rating,
          reviews: p.reviews,
          stock: (p.sizes || []).reduce((sum: number, s: any) => sum + (s.stock || 0), 0),
          availableSizes: p.availableSizes || [],
          categorySlug: p.categorySlug,
        });
      }
      setLoading(false)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching product:', error);
      }
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [productId])

  // Handle visibility change to refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh product data when tab becomes visible
        fetchProduct()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [productId])

  const handleBuyNow = async () => {
    if (!selectedSize) {
      alert("Please select a size first!")
      return
    }
    if (!product) return;
    
    // Set buy now item with correct MongoDB ID
    setBuyNowItem({
      id: parseInt(product._id) || 1, // Convert to number for compatibility
      _id: product._id, // Use MongoDB ID
      name: product.name,
      price: product.price,
      quantity,
      size: selectedSize,
      image: product.images[0] || "/placeholder.svg",
    });
    
    // Navigate to checkout with buy now mode
    window.location.href = "/checkout?mode=buynow";
  }

  if (loading) {
    return <PageLoading loadingMessage="Loading Product Details...">
      <div></div>
    </PageLoading>
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

  // Per-size stock logic
  const sizeOptions = Array.isArray(product?.availableSizes) && product.availableSizes.length > 0
    ? product.availableSizes
    : Array.isArray(product?.sizes) && product.sizes.length > 0
      ? product.sizes.map(s => s.size)
      : [];
  const selectedSizeObj = product.sizes.find(s => s.size === selectedSize);
  const selectedSizeStock = selectedSizeObj ? selectedSizeObj.stock : 0;
  let stockStatus = '';
  if (!selectedSize) stockStatus = '';
  else if (selectedSizeStock > 5) stockStatus = 'In Stock';
  else if (selectedSizeStock > 0) stockStatus = `Only ${selectedSizeStock} left!`;
  else stockStatus = 'Out of Stock';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col h-auto py-3">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => (window.location.href = "/")}>
                Home
              </Button>
              <ChevronRight className="h-4 w-4" />
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => (window.location.href = "/collections")}>
                Collections
              </Button>
              <ChevronRight className="h-4 w-4" />
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 h-auto" 
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
                <WishlistButton productId={product.id.toString()} size="sm" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const shareData = {
                      title: product.name,
                      text: `Check out ${product.name} on Shithaa!`,
                      url: window.location.href,
                    }
                    try {
                      if (navigator.share) {
                        await navigator.share(shareData)
                      } else {
                        await navigator.clipboard.writeText(window.location.href)
                        alert('Link copied to clipboard!')
                      }
                    } catch (error) {
                      console.error('Error sharing:', error)
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column: Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={product.images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              
              {/* Wishlist Button */}
              <div className="absolute top-4 right-4 z-10">
                <WishlistButton productId={product.id.toString()} size="lg" />
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square bg-white rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index ? 'border-[#473C66] shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="space-y-6">
            {/* Product Info */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              
              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-[#473C66]">₹{product.price.toLocaleString()}</span>
                {product.originalPrice > product.price && (
                  <span className="text-xl text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">({product.reviews} reviews)</span>
              </div>

              {/* Description */}
              <p className="text-gray-700 leading-relaxed">{product.description}</p>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">Features:</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {product.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Size Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">Size</label>
              <div className="grid grid-cols-4 gap-2">
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`h-12 rounded-lg border-2 transition-all ${
                      selectedSize === size
                        ? 'border-[#473C66] bg-[#473C66] text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-900">Quantity</label>
              <div className="flex items-center gap-3">
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
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10 flex items-center justify-center text-lg font-bold text-gray-700 bg-white hover:bg-gray-100 transition"
                >
                  +
                </button>
              </div>
              <span className={`ml-4 text-base font-semibold ${selectedSize && selectedSizeStock === 0 ? 'text-red-500' : selectedSizeStock <= 5 && selectedSizeStock > 0 ? 'text-yellow-600' : 'text-green-600'}`}>{stockStatus}</span>
              <button
                type="button"
                className="flex-1 border border-gray-400 rounded-md h-10 text-gray-900 font-semibold bg-white hover:bg-gray-100 transition text-sm"
                disabled={!selectedSize || selectedSizeStock === 0}
                onClick={() => {
                  if (!product) return;
                  addToCart({
                    id: product._id,
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    quantity,
                    size: selectedSize,
                    image: product.images[0] || "/placeholder.svg",
                    category: product.category,
                    categorySlug: product.categorySlug,
                  }, true); // Open cart sidebar automatically
                }}
              >
                ADD TO CART
              </button>
            </div>
            {/* Buy it now */}
            <button
              type="button"
              className="w-full h-12 rounded-md bg-[#473C66] hover:bg-[#3a3054] text-white font-bold text-base tracking-wide transition shadow-md"
              disabled={!selectedSize || selectedSizeStock === 0}
              onClick={handleBuyNow}
            >
              BUY IT NOW
            </button>
          </div>
        </div>

        {/* Delivery Info */}
        <Card className="border-0 bg-gray-100 rounded-2xl mt-8">
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
                <span className="text-sm font-medium">Refunds accepted within 2 days of receiving your order</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}