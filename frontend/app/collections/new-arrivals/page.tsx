"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Home, Search, Filter, SlidersHorizontal, Sparkles, Star } from "lucide-react";
import Image from "next/image";
import PageLoading from "@/components/page-loading";
import SizeSelectionSidebar from "@/components/size-selection-sidebar";
import CheckoutPromptModal from "@/components/checkout-prompt-modal";
import { useCart } from "@/components/cart-context";
import { useBuyNow } from "@/components/buy-now-context";

export default function NewArrivalsPage() {
  const { addToCart } = useCart();
  const { setBuyNowItem } = useBuyNow();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [sizeSelectionProduct, setSizeSelectionProduct] = useState<any>(null);
  const [isSizeSelectionOpen, setIsSizeSelectionOpen] = useState(false);
  const [isCheckoutPromptOpen, setIsCheckoutPromptOpen] = useState(false);
  const [addedProduct, setAddedProduct] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setLoading(true);
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/products?sortBy=createdAt&limit=8';
        const res = await fetch(apiUrl);
        const data = await res.json();
        const backendProducts = data.products || [];
        // Sort by createdAt (or _id as fallback)
        const sorted = backendProducts.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return b._id.localeCompare(a._id);
        });
        // Take the latest 8 products
        const latest = sorted.slice(0, 8);
        // Map backend product to frontend shape
        const mappedProducts = latest.map((p) => ({
          id: p._id,
          _id: p._id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          image: p.images?.[0] || '',
          images: p.images || [],
          category: p.category,
          description: p.description,
          sizes: Array.isArray(p.sizes)
            ? (typeof p.sizes[0] === 'object'
                ? p.sizes.map(s => ({ size: s.size, stock: s.stock }))
                : p.sizes.map(s => ({ size: s, stock: 99 }))
              )
            : [],
          isNewArrival: p.isNewArrival || false,
          dateAdded: p.createdAt || p.date || '',
        }));
        setProducts(mappedProducts);
        setFilteredProducts(mappedProducts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching new arrivals:", error);
        setLoading(false);
      }
    };
    fetchNewArrivals();
  }, []);

  useEffect(() => {
    let filtered = [...products];
    if (searchQuery) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        break;
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    setFilteredProducts(filtered);
  }, [products, searchQuery, sortBy]);

  const handleProductClick = (productId: number) => {
    window.location.href = `/product/${productId}`;
  };

  const handleAddToCart = (product: any) => {
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
  };

  const handleSizeSelectionAddToCart = (product: any, size: string, quantity: number) => {
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

  const handleSizeSelectionBuyNow = (product: any, size: string, quantity: number) => {
    setBuyNowItem({
      id: product._id,
      _id: product._id,
      name: product.name,
      price: product.price,
      quantity,
      size,
      image: product.image,
    });
    router.push("/checkout?mode=buynow");
  };

  const handleCheckout = () => {
    window.location.href = "/checkout";
  }

  function formatDateYYYYMMDD(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  return (
    <PageLoading loadingMessage="Loading New Arrivals..." minLoadingTime={1500}>
      <div className="min-h-screen bg-gray-50 w-full overflow-x-hidden">
        {/* Page Header with Search and Filters */}
        <div className="px-4 sm:px-6 lg:px-8 pb-6 lg:pb-8 w-full">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 lg:mb-4 font-serif">
              New Arrivals
            </h1>
            <p className="text-base lg:text-lg text-gray-600 max-w-3xl">
              Discover the latest additions to our premium maternity and lounge wear collection.
            </p>
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
                  <SelectItem value="newest">Newest</SelectItem>
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
        {/* Products Grid */}
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
                  {/* Product Image */}
                  <div className="relative aspect-[2/3] bg-gray-100 rounded-lg overflow-hidden mb-4">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      loading="lazy"
                      className="object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg"
                    />
                    {/* New Arrival Badge */}
                    {product.isNewArrival && (
                      <div className="absolute top-3 left-3 bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg z-10 animate-bounce-in">
                        <Sparkles className="w-4 h-4 mr-1 text-yellow-200" />
                        New Arrival
                      </div>
                    )}
                  </div>
                  {/* Product Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm lg:text-base font-medium text-gray-900 leading-tight">{product.name}</h3>
                    <div className="text-sm lg:text-base text-gray-900">
                      ₹ {product.price?.toLocaleString()}.00 INR
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white bg-white rounded-none font-normal text-sm py-2 h-auto transition-colors duration-200 min-h-[44px] min-w-[44px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      ADD TO CART
                    </Button>
                    {/* Date Added */}
                    {product.dateAdded && (
                      <div className="text-xs text-gray-400 mt-2">
                        Added {formatDateYYYYMMDD(product.dateAdded)}
                      </div>
                    )}
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
                  setSearchQuery("");
                  setSortBy("newest");
                }}
                variant="outline"
                className="border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white bg-white rounded-none px-6 min-h-[44px] min-w-[44px]"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
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
            setIsCheckoutPromptOpen(false);
            // Optionally open cart sidebar if you have one
          }}
          onCheckout={handleCheckout}
          product={addedProduct}
        />
      </div>
    </PageLoading>
  );
}
