import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import EditProduct from './EditProduct'
import {
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  List as ListIcon,
  Package,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'

// Constants
const ALL_SIZES = ["S", "M", "L", "XL", "XXL"]
const PRODUCTS_PER_PAGE = 24

// Helper function to get stock status
const getStockStatus = (stock) => {
  if (stock === 0) return { status: 'out', color: 'red', label: 'Out of Stock' }
  if (stock <= 3) return { status: 'low', color: 'amber', label: 'Low Stock' }
  return { status: 'good', color: 'green', label: 'In Stock' }
}

// Loading Skeleton Component
const ProductSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
    <div className="aspect-[4/5] bg-gray-200"></div>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded-full w-12"></div>
        <div className="h-6 bg-gray-200 rounded-full w-12"></div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
      <div className="flex justify-between">
        <div className="h-8 bg-gray-200 rounded w-16"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
        </div>
      </div>
)

// Stock Badge Component
const StockBadge = ({ size, stock }) => {
  const stockInfo = getStockStatus(stock)
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
      ${stockInfo.status === 'out' ? 'bg-red-50 text-red-700 border border-red-200' : ''}
      ${stockInfo.status === 'low' ? 'bg-amber-50 text-amber-700 border border-amber-200' : ''}
      ${stockInfo.status === 'good' ? 'bg-green-50 text-green-700 border border-green-200' : ''}
    `}>
      {size}: {stock}
    </span>
  )
}

// Product Card Component
const ProductCard = ({ product, onEdit, onDelete }) => {
  const totalStock = product.sizes?.reduce((sum, sizeObj) => {
    return sum + (typeof sizeObj === 'object' ? sizeObj.stock || 0 : 0)
  }, 0) || 0

  const stockInfo = getStockStatus(totalStock)

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 overflow-hidden group">
      {/* Product Image */}
      <div className="relative aspect-[4/5] bg-gray-50">
        <img
          src={product.images?.[0] || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        
        {/* Quick Stock Status */}
        <div className="absolute top-2 right-2">
          {stockInfo.status === 'out' && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Out of Stock
            </span>
          )}
          {stockInfo.status === 'low' && (
            <span className="bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Low Stock
            </span>
          )}
        </div>

        {/* Second Image Preview on Hover */}
        {product.images?.[1] && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <img
              src={product.images[1]}
              alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* Product Name */}
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Category */}
        <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-2 py-1 rounded-md inline-block">
          {product.category || 'Uncategorized'}
        </p>

        {/* Size & Stock Info */}
        <div className="flex flex-wrap gap-1 mb-3">
          {product.sizes?.slice(0, 3).map((sizeObj, index) => {
            const size = typeof sizeObj === 'object' ? sizeObj.size : sizeObj
            const stock = typeof sizeObj === 'object' ? sizeObj.stock || 0 : 0
            return <StockBadge key={index} size={size} stock={stock} />
          })}
          {product.sizes?.length > 3 && (
            <span className="text-xs text-gray-400 px-2 py-1">
              +{product.sizes.length - 3} more
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {currency}{product.price}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-gray-400 line-through">
                {currency}{product.originalPrice}
              </span>
          )}
        </div>

          {/* Stock Status Icon */}
          <div className="flex items-center">
            {stockInfo.status === 'good' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {stockInfo.status === 'low' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            {stockInfo.status === 'out' && <X className="h-4 w-4 text-red-500" />}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
            <button
            onClick={() => onEdit(product)}
            className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors text-sm font-medium"
            >
            <Edit className="h-3 w-3" />
            Edit
            </button>
            <button
            onClick={() => onDelete(product._id)}
            className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm font-medium"
            >
            <Trash2 className="h-3 w-3" />
            Delete
            </button>
          </div>
      </div>
    </div>
  )
}

// Table Row Component
const ProductTableRow = ({ product, onEdit, onDelete }) => {
  const totalStock = product.sizes?.reduce((sum, sizeObj) => {
    return sum + (typeof sizeObj === 'object' ? sizeObj.stock || 0 : 0)
  }, 0) || 0

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={product.images?.[0] || '/placeholder.svg'}
            alt={product.name}
            className="w-12 h-12 rounded-lg object-cover"
            loading="lazy"
          />
          <div>
            <p className="font-medium text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500">{product.customId || product._id}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <span className="bg-gray-100 px-2 py-1 rounded-md text-xs">
          {product.category || 'Uncategorized'}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          <span className="font-medium">{currency}{product.price}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-gray-400 line-through text-xs">
              {currency}{product.originalPrice}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {product.sizes?.slice(0, 4).map((sizeObj, index) => {
            const size = typeof sizeObj === 'object' ? sizeObj.size : sizeObj
            const stock = typeof sizeObj === 'object' ? sizeObj.stock || 0 : 0
            return <StockBadge key={index} size={size} stock={stock} />
          })}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
              <button
            onClick={() => onEdit(product)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit Product"
          >
            <Edit className="h-4 w-4" />
              </button>
              <button
            onClick={() => onDelete(product._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Product"
          >
            <Trash2 className="h-4 w-4" />
              </button>
            </div>
      </td>
    </tr>
  )
}

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 7
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      
      if (currentPage > 4) {
        pages.push('...')
      }
      
      const start = Math.max(2, currentPage - 2)
      const end = Math.min(totalPages - 1, currentPage + 2)
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }
      
      if (currentPage < totalPages - 3) {
        pages.push('...')
      }
      
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  return (
    <div className="flex items-center justify-between py-6">
      <div className="text-sm text-gray-700">
        Showing page {currentPage} of {totalPages}
      </div>
      
      <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
      </button>

      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : page === '...'
              ? 'text-gray-400 cursor-default'
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
      </button>
    </div>
    </div>
  )
}

// Main List Component
const List = ({ token }) => {
  // Core state
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  
  // UI state
  const [viewMode, setViewMode] = useState('card') // 'card' or 'table'
  const [editingProduct, setEditingProduct] = useState(null)
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [stockFilter, setStockFilter] = useState('') // 'all', 'low', 'out'
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  
  // Categories
  const [categories, setCategories] = useState([])

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/categories`)
        if (response.data.success) {
          setCategories(response.data.data)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: PRODUCTS_PER_PAGE,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      
      // Add filters - use debounced search
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim())
      }
      if (categoryFilter) {
        params.append('categorySlug', categoryFilter)
      }
      if (sizeFilter) {
        params.append('size', sizeFilter)
      }
      if (priceRange.min) {
        params.append('minPrice', priceRange.min)
      }
      if (priceRange.max) {
        params.append('maxPrice', priceRange.max)
      }
      
      const response = await axios.get(`${backendUrl}/api/products?${params}`, {
        headers: { token }
      })
      
      const { products: fetchedProducts, total, pages } = response.data
      
      // Apply stock filter locally (since backend might not support it)
      let filteredProducts = fetchedProducts
      if (stockFilter === 'low') {
        filteredProducts = fetchedProducts.filter(product => {
          const totalStock = product.sizes?.reduce((sum, sizeObj) => {
            return sum + (typeof sizeObj === 'object' ? sizeObj.stock || 0 : 0)
          }, 0) || 0
          return totalStock > 0 && totalStock <= 3
        })
      } else if (stockFilter === 'out') {
        filteredProducts = fetchedProducts.filter(product => {
          const totalStock = product.sizes?.reduce((sum, sizeObj) => {
            return sum + (typeof sizeObj === 'object' ? sizeObj.stock || 0 : 0)
          }, 0) || 0
          return totalStock === 0
        })
      }
      
      setProducts(filteredProducts)
      setTotalPages(pages)
      setTotalProducts(total)
      
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [token, currentPage, debouncedSearchTerm, categoryFilter, sizeFilter, priceRange, stockFilter])

  // Fetch products when dependencies change
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, categoryFilter, sizeFilter, priceRange, stockFilter])

  // Handle product deletion
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return
    }
    
    try {
      await axios.delete(`${backendUrl}/api/products/${productId}`, {
        headers: { token }
      })
      toast.success('Product deleted successfully')
      fetchProducts() // Refresh the list
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Failed to delete product')
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('')
    setSizeFilter('')
    setPriceRange({ min: '', max: '' })
    setStockFilter('')
  }

  // Remove individual filter
  const removeFilter = (filterType) => {
    switch (filterType) {
      case 'search':
        setSearchTerm('')
        break
      case 'category':
        setCategoryFilter('')
        break
      case 'size':
        setSizeFilter('')
        break
      case 'priceMin':
        setPriceRange(prev => ({ ...prev, min: '' }))
        break
      case 'priceMax':
        setPriceRange(prev => ({ ...prev, max: '' }))
        break
      case 'stock':
        setStockFilter('')
        break
    }
  }

  // Get active filters for display
  const getActiveFilters = () => {
    const filters = []
    
    if (searchTerm.trim()) {
      filters.push({
        type: 'search',
        label: `Search: "${searchTerm}"`,
        value: searchTerm
      })
    }
    
    if (categoryFilter) {
      const categoryName = categories.find(cat => cat.slug === categoryFilter)?.name || categoryFilter
      filters.push({
        type: 'category',
        label: `Category: ${categoryName}`,
        value: categoryFilter
      })
    }
    
    if (sizeFilter) {
      filters.push({
        type: 'size',
        label: `Size: ${sizeFilter}`,
        value: sizeFilter
      })
    }
    
    if (priceRange.min) {
      filters.push({
        type: 'priceMin',
        label: `Min Price: ₹${priceRange.min}`,
        value: priceRange.min
      })
    }
    
    if (priceRange.max) {
      filters.push({
        type: 'priceMax',
        label: `Max Price: ₹${priceRange.max}`,
        value: priceRange.max
      })
    }
    
    if (stockFilter) {
      const stockLabels = {
        'low': 'Low Stock',
        'out': 'Out of Stock'
      }
      filters.push({
        type: 'stock',
        label: `Stock: ${stockLabels[stockFilter]}`,
        value: stockFilter
      })
    }
    
    return filters
  }

  const activeFilters = getActiveFilters()
  const activeFiltersCount = activeFilters.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
        <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-6 w-6" />
                Product Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {totalProducts} products • Page {currentPage} of {totalPages}
              </p>
        </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'card'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
            <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
          </div>

            {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Size Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Sizes</option>
                {ALL_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Stock Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
            
            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={activeFiltersCount === 0}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Clear {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min price"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Max price"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Tags */}
          {activeFilters.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                {activeFilters.map((filter, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-200"
                  >
                    {filter.label}
                    <button
                      onClick={() => removeFilter(filter.type)}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      title={`Remove ${filter.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
          /* Loading State */
          <div className={viewMode === 'card' 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6"
            : "space-y-4"
          }>
            {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, index) => (
              <ProductSkeleton key={index} />
              ))}
            </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          /* Products Display */
          <>
              {viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {products.map((product) => (
                    <ProductCard
                    key={product._id}
                    product={product}
                      onEdit={setEditingProduct}
                    onDelete={handleDeleteProduct}
                    />
                  ))}
                </div>
              ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock by Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <ProductTableRow
                        key={product._id}
                        product={product}
                        onEdit={setEditingProduct}
                        onDelete={handleDeleteProduct}
                      />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProduct
          product={editingProduct}
          token={token}
          onClose={() => setEditingProduct(null)}
          onUpdate={() => {
            setEditingProduct(null)
            fetchProducts() // Refresh the list to show changes
          }}
        />
      )}
    </div>
  )
}

export default List