import axios from 'axios'
import React, { useEffect, useState, useCallback, memo } from 'react'
import { useRef } from 'react';
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import EditProduct from './EditProduct'
import { X, ChevronDown, Filter, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { GripVertical } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable
} from '@hello-pangea/dnd';
import debounce from 'lodash.debounce';

const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

// Skeleton Loader Component
const ProductCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
    <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
    <div className="space-y-2">
      <div className="bg-gray-200 h-4 rounded w-3/4"></div>
      <div className="bg-gray-200 h-4 rounded w-1/2"></div>
      <div className="bg-gray-200 h-6 rounded w-1/3"></div>
    </div>
  </div>
);

// Memoized Product Card Component
const ProductCard = memo(({ item, onEdit, onDelete, position, isReorderMode, moveUp, moveDown, isFirst, isLast, dragHandleProps, showDragHandle = false }) => {
  const getBadgeVariant = (stock) => {
    if (stock === 0) return "bg-red-100 text-red-800";
    if (stock <= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const StockBadge = ({ stock, size }) => (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getBadgeVariant(stock)}`}>
      {size}: {stock}
    </span>
  );

  const itemSizes = typeof item.sizes[0] === 'string' ? item.sizes : item.sizes.map(s => s.size);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 relative group">
      {/* Drag Handle */}
      {showDragHandle && (
        <div {...dragHandleProps} className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Product Image */}
      <div className="relative mb-4">
        <img 
          src={item.images && item.images[0] ? item.images[0] : '/placeholder.svg'} 
          alt={item.name}
          className="w-full h-48 object-cover rounded-lg"
          loading="lazy"
        />
        
        {/* Stock Badges */}
        <div className="absolute top-2 right-2 space-y-1">
          {item.sizes && item.sizes.slice(0, 3).map((sizeObj, index) => {
            const size = typeof sizeObj === 'string' ? sizeObj : sizeObj.size;
            const stock = typeof sizeObj === 'string' ? 0 : (sizeObj.stock || 0);
            return <StockBadge key={index} stock={stock} size={size} />;
          })}
        </div>
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 line-clamp-2">{item.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">{currency}{item.price}</span>
          <span className="text-sm text-gray-500">{item.category}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(item._id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Reorder Controls */}
        {isReorderMode && (
          <div className="flex space-x-1">
            <button
              onClick={() => moveUp(item)}
              disabled={isFirst}
              className={`p-1 rounded ${isFirst ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              ↑
            </button>
            <button
              onClick={() => moveDown(item)}
              disabled={isLast}
              className={`p-1 rounded ${isLast ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              ↓
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange, isLoading }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className={`p-2 rounded-lg ${
          currentPage === 1 || isLoading
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...' || isLoading}
          className={`px-3 py-2 rounded-lg ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : page === '...'
              ? 'text-gray-400 cursor-default'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className={`p-2 rounded-lg ${
          currentPage === totalPages || isLoading
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

const List = ({ token }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productsPerPage, setProductsPerPage] = useState(20);
  
  // Product list state
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Other state
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [stockMin, setStockMin] = useState('');
  const [stockMax, setStockMax] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('card');
  const [showFilters, setShowFilters] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [manualSort, setManualSort] = useState(true);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [allCategories, setAllCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useRef();

  // Fetch categories on mount
  useEffect(() => {
    axios.get(`${backendUrl}/api/categories`).then(res => {
      if (res.data.success && Array.isArray(res.data.data)) {
        setCategories(res.data.data);
        setAllCategories(res.data.data.map(cat => cat.slug || cat.name));
      }
    });
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchTerm]);

  // Fetch products with pagination
  const fetchList = useCallback(async (page = 1, categorySlug = null) => {
    try {
      setLoading(true);
      const sortBy = manualSort ? 'displayOrder' : 'createdAt';
      const sortOrder = manualSort ? 'asc' : 'desc';
      
      let apiUrl = `${backendUrl}/api/products?page=${page}&limit=${productsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      
      // Add search filter
      if (debouncedSearch) {
        apiUrl += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      
      // Add category filter
      if (categorySlug) {
        apiUrl += `&categorySlug=${encodeURIComponent(categorySlug)}`;
      }
      
      // Add other filters
      if (priceMin) apiUrl += `&minPrice=${priceMin}`;
      if (priceMax) apiUrl += `&maxPrice=${priceMax}`;
      if (sizeFilter) apiUrl += `&size=${sizeFilter}`;
      
      console.log('Fetching from URL:', apiUrl);
      const response = await axios.get(apiUrl, { headers: { token } });
      
      const { products, total, pages } = response.data;
      console.log('Received products:', products.length, 'total:', total, 'pages:', pages);
      
      setList(products);
      setTotalPages(pages);
      setTotalProducts(total);
      setCurrentPage(page);
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [token, manualSort, productsPerPage, debouncedSearch, priceMin, priceMax, sizeFilter]);

  // Fetch products when dependencies change
  useEffect(() => {
    fetchList(currentPage, categoryFilter);
  }, [fetchList, currentPage, categoryFilter]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  const removeProduct = async (id) => {
    try {
      const apiUrl = `${backendUrl}/api/products/${id}`;
      const response = await axios.delete(apiUrl, { headers: { token } });
      if (response.data.success !== false) {
        toast.success('Product deleted');
        // Refresh current page
        fetchList(currentPage, categoryFilter);
      } else {
        toast.error(response.data.message || 'Failed to delete');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const lowStockProducts = list.filter(item => {
    if (!item.sizes || !Array.isArray(item.sizes)) return false;
    return item.sizes.some(sizeObj => {
      const stock = typeof sizeObj === 'string' ? 0 : (sizeObj.stock || 0);
      return stock > 0 && stock <= 3;
    });
  });

  // --- Filtering and Sorting ---
  let filtered = list.filter(item => {
    // Category
    if (categoryFilter && item.category !== categoryFilter) return false;
    // Size (multi-select)
    if (sizeFilter && !item.sizes.some(sz => item.sizes.includes(sz))) return false;
    // Price
    if (priceMin && Number(item.price) < Number(priceMin)) return false;
    if (priceMax && Number(item.price) > Number(priceMax)) return false;
    // Stock
    if (stockMin && Number(item.stock) < Number(stockMin)) return false;
    if (stockMax && Number(item.stock) > Number(stockMax)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    let valA, valB;
    if (sortBy === 'price') {
      valA = Number(a.price);
      valB = Number(b.price);
    } else if (sortBy === 'stock') {
      valA = Number(a.stock);
      valB = Number(b.stock);
    } else if (sortBy === 'createdAt') {
      valA = new Date(a.createdAt || 0);
      valB = new Date(b.createdAt || 0);
    } else {
      valA = a[sortBy];
      valB = b[sortBy];
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Apply search filter (by name or _id)
  let searched = filtered.filter(item => {
    if (!debouncedSearch) return true;
    const s = debouncedSearch.trim().toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(s)) ||
      (item._id && item._id.toLowerCase().includes(s))
    );
  });

  // Filter functions
  function handleFilterChange(field, value) {
    setPendingFilters(prev => ({ ...prev, [field]: value }));
  }

  function handleSizeToggle(size) {
    const currentSizes = pendingFilters.sizes;
    const newSizes = currentSizes.includes(size)
      ? currentSizes.filter(s => s !== size)
      : [...currentSizes, size];
    setPendingFilters(prev => ({ ...prev, sizes: newSizes }));
  }

  function clearAllFilters() {
    setPendingFilters({
      category: '',
      sizes: [],
      priceMin: '',
      priceMax: '',
      stockMin: '',
      stockMax: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(list);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setList(items);

    try {
      const response = await axios.put(
        `${backendUrl}/api/products/reorder`,
        { products: items.map((item, index) => ({ id: item._id, displayOrder: index })) },
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success('Products reordered successfully');
      }
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Failed to reorder products');
    }
  };

  async function handlePinToTop(productId) {
    try {
      const response = await axios.put(
        `${backendUrl}/api/products/${productId}/pin-to-top`,
        {},
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success('Product pinned to top');
        fetchList(currentPage, categoryFilter);
      }
    } catch (error) {
      console.error('Pin to top error:', error);
      toast.error('Failed to pin product');
    }
  }

  async function handleSendToBottom(productId) {
    try {
      const response = await axios.put(
        `${backendUrl}/api/products/${productId}/send-to-bottom`,
        {},
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success('Product sent to bottom');
        fetchList(currentPage, categoryFilter);
      }
    } catch (error) {
      console.error('Send to bottom error:', error);
      toast.error('Failed to send product to bottom');
    }
  }

  const getCategorySlug = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.slug : categoryName.toLowerCase().replace(/\s+/g, '-');
  };

  function moveUp(product) {
    const currentIndex = list.findIndex(item => item._id === product._id);
    if (currentIndex > 0) {
      const newList = [...list];
      [newList[currentIndex], newList[currentIndex - 1]] = [newList[currentIndex - 1], newList[currentIndex]];
      setList(newList);
    }
  }

  function moveDown(product) {
    const currentIndex = list.findIndex(item => item._id === product._id);
    if (currentIndex < list.length - 1) {
      const newList = [...list];
      [newList[currentIndex], newList[currentIndex + 1]] = [newList[currentIndex + 1], newList[currentIndex]];
      setList(newList);
    }
  }

  // UI Components
  const FilterDrawer = ({ isOpen, onClose, children }) => (
    <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Filters</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const FilterPanel = ({ isMobile = false }) => (
    <div className={`${isMobile ? '' : 'hidden lg:block'} space-y-6`}>
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
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

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="Min"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="number"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="Max"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Size Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
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

      {/* Clear Filters */}
      <button
        onClick={() => {
          setCategoryFilter('');
          setPriceMin('');
          setPriceMax('');
          setSizeFilter('');
          setSearchTerm('');
        }}
        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );

  const ToggleGroup = ({ children, className = "" }) => (
    <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`}>
      {children}
    </div>
  );

  const Toggle = ({ value, isActive, onClick, children, disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="text-sm text-gray-600">
                {totalProducts} products • Page {currentPage} of {totalPages}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <ToggleGroup>
                <Toggle
                  value="card"
                  isActive={viewMode === 'card'}
                  onClick={() => setViewMode('card')}
                >
                  Cards
                </Toggle>
                <Toggle
                  value="table"
                  isActive={viewMode === 'table'}
                  onClick={() => setViewMode('table')}
                >
                  Table
                </Toggle>
              </ToggleGroup>

              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <FilterPanel />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: productsPerPage }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <>
                {/* Products Grid */}
                {viewMode === 'card' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {list.map((item, index) => (
                      <ProductCard
                        key={item._id}
                        item={item}
                        onEdit={setEditingProduct}
                        onDelete={removeProduct}
                        position={index}
                        isReorderMode={isReorderMode}
                        moveUp={moveUp}
                        moveDown={moveDown}
                        isFirst={index === 0}
                        isLast={index === list.length - 1}
                        showDragHandle={isReorderMode}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
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
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {list.map((item) => (
                          <tr key={item._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={item.images && item.images[0] ? item.images[0] : '/placeholder.svg'}
                                  alt={item.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                  loading="lazy"
                                />
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                  <div className="text-sm text-gray-500">{item.description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.category}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {currency}{item.price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-1">
                                {item.sizes && item.sizes.slice(0, 3).map((sizeObj, index) => {
                                  const size = typeof sizeObj === 'string' ? sizeObj : sizeObj.size;
                                  const stock = typeof sizeObj === 'string' ? 0 : (sizeObj.stock || 0);
                                  return (
                                    <span
                                      key={index}
                                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                                        stock === 0 ? 'bg-red-100 text-red-800' :
                                        stock <= 3 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }`}
                                    >
                                      {size}: {stock}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingProduct(item)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => removeProduct(item._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
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
                    onPageChange={handlePageChange}
                    isLoading={loading}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <FilterDrawer isOpen={showFilters} onClose={() => setShowFilters(false)}>
        <FilterPanel isMobile={true} />
      </FilterDrawer>

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProduct
          product={editingProduct}
          token={token}
          onClose={() => setEditingProduct(null)}
          onUpdate={() => {
            setEditingProduct(null);
            fetchList(currentPage, categoryFilter);
          }}
        />
      )}
    </div>
  );
};

export default List;