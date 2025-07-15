"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Heart, Share2, Truck, Shield, RotateCcw, Plus, Minus, Star } from "lucide-react"
import Image from "next/image"
import PageLoading from "@/components/page-loading"
import { useCart } from "@/components/cart-context"
import CheckoutPromptModal from "@/components/checkout-prompt-modal"
import { useBuyNow } from "@/components/buy-now-context"

interface Product {
  id: number
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
  const [isCheckoutPromptOpen, setIsCheckoutPromptOpen] = useState(false)
  const [addedProduct, setAddedProduct] = useState<any>(null)
  const { setBuyNowItem } = useBuyNow()

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products/' + productId;
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.data || data.product) {
          const p = data.data || data.product;
          setProduct({
            id: p._id,
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
            stock: (p.sizes || []).reduce((sum, s) => sum + (s.stock || 0), 0),
            availableSizes: p.availableSizes || [],
          });
        }
        setLoading(false)
      } catch (error) {
        console.error("Error fetching product:", error)
        setLoading(false)
      }
    }

    if (productId) {
      fetchProduct()
    }
    // Refetch product data when coming back from order success
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProduct();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [productId])

  const handleBuyNow = () => {
    if (!selectedSize) {
      alert("Please select a size first!")
      return
    }
    if (!product) return;
    setBuyNowItem({
      id: product.id,
      _id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      size: selectedSize,
      image: product.images[0] || "/placeholder.svg",
    });
    window.location.href = "/checkout?mode=buynow";
  }

  if (loading) {
    return <PageLoading loadingMessage="Loading Product Details..." />
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
          <div className="flex items-center h-16">
            <Button variant="ghost" onClick={() => window.history.back()} className="mr-4">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-semibold text-gray-900 truncate flex-1">{product.name}</h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const shareData = {
                    title: product.name,
                    text: `Check out this product on Shinthaa.in: ${product.name}`,
                    url: typeof window !== 'undefined' ? window.location.href : ''
                  };
                  if (navigator.share) {
                    try {
                      await navigator.share(shareData);
                    } catch (err) {
                      // User cancelled or error
                    }
                  } else if (navigator.clipboard) {
                    try {
                      await navigator.clipboard.writeText(shareData.url);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`border rounded-md px-3 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400
                          ${selectedSize === size ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-900 hover:border-cyan-400"}
                        `}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-red-500 font-medium mb-2">Size not available</div>
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
                      }, false);
                      setAddedProduct({
                        name: product.name,
                        price: product.price,
                        image: product.images[0] || "/placeholder.svg",
                        size: selectedSize,
                        quantity,
                      });
                      setIsCheckoutPromptOpen(true);
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
                    <span className="text-sm font-medium">7-Day Easy Returns</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CheckoutPromptModal
        isOpen={isCheckoutPromptOpen}
        onClose={() => setIsCheckoutPromptOpen(false)}
        onViewCart={() => {
          setIsCheckoutPromptOpen(false);
          openCartSidebar();
        }}
        onCheckout={() => {
          setIsCheckoutPromptOpen(false);
          window.location.href = "/checkout";
        }}
        product={addedProduct}
        images={product.images}
        selectedImageIndex={selectedImage}
      />
    </div>
  )
} 