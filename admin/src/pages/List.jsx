import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import EditProduct from './EditProduct'
import { X, ChevronDown, Filter, Edit, Trash2 } from 'lucide-react';
import { GripVertical } from 'lucide-react';
import {
  DragDropContext,
  Droppable,
  Draggable
} from '@hello-pangea/dnd';
import debounce from 'lodash.debounce';

const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

const List = ({ token }) => {
  const [list, setList] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [stockMin, setStockMin] = useState('')
  const [stockMax, setStockMax] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [showFilters, setShowFilters] = useState(false); // for mobile
  const [pendingFilters, setPendingFilters] = useState({
    category: '',
    sizes: [],
    priceMin: '',
    priceMax: '',
    stockMin: '',
    stockMax: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [manualSort, setManualSort] = useState(true); // Manual Sort toggle

  useEffect(() => {
    // Fetch categories for filter
    axios.get(`${backendUrl}/api/categories`).then(res => {
      if (res.data.success && Array.isArray(res.data.data)) {
        setCategories(res.data.data)
      }
    })
  }, [])

  const fetchList = async () => {
    try {
      const sortBy = manualSort ? 'displayOrder' : 'createdAt';
      const sortOrder = manualSort ? 'asc' : 'desc';
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + `/api/products?sortBy=${sortBy}&sortOrder=${sortOrder}`;
      const response = await axios.get(apiUrl, { headers: { token } })
      const products = response.data.products || response.data.data || [];
      setList(products);
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const removeProduct = async (id) => {
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/products/' + id;
      const response = await axios.delete(apiUrl, { headers: { token } })
      if (response.data.success !== false) {
        toast.success('Product deleted')
        await fetchList();
      } else {
        toast.error(response.data.message || 'Failed to delete')
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const lowStockProducts = list.filter(item => typeof item.stock === 'number' && item.stock < 3)

  useEffect(() => {
    fetchList()
  }, [manualSort])

  // --- Filtering and Sorting ---
  let filtered = list.filter(item => {
    // Category
    if (pendingFilters.category && item.category !== pendingFilters.category) return false;
    // Size (multi-select)
    if (pendingFilters.sizes.length > 0) {
      if (!Array.isArray(item.sizes)) return false;
      const itemSizes = typeof item.sizes[0] === 'string' ? item.sizes : item.sizes.map(s => s.size);
      if (!pendingFilters.sizes.some(sz => itemSizes.includes(sz))) return false;
    }
    // Price
    if (pendingFilters.priceMin && Number(item.price) < Number(pendingFilters.priceMin)) return false;
    if (pendingFilters.priceMax && Number(item.price) > Number(pendingFilters.priceMax)) return false;
    // Stock
    if (pendingFilters.stockMin && Number(item.stock) < Number(pendingFilters.stockMin)) return false;
    if (pendingFilters.stockMax && Number(item.stock) > Number(pendingFilters.stockMax)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    let valA, valB;
    if (pendingFilters.sortBy === 'price') {
      valA = Number(a.price);
      valB = Number(b.price);
    } else if (pendingFilters.sortBy === 'stock') {
      valA = Number(a.stock);
      valB = Number(b.stock);
    } else if (pendingFilters.sortBy === 'createdAt') {
      valA = new Date(a.createdAt || 0);
      valB = new Date(b.createdAt || 0);
    } else {
      valA = a[pendingFilters.sortBy];
      valB = b[pendingFilters.sortBy];
    }
    if (valA < valB) return pendingFilters.sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return pendingFilters.sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  function handleFilterChange(field, value) {
    setPendingFilters(prev => ({ ...prev, [field]: value }));
  }
  function handleSizeToggle(size) {
    setPendingFilters(prev => {
      const sizes = prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size];
      return { ...prev, sizes };
    });
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

  const totalProducts = list.length;
  const lowStockCount = list.filter(item => typeof item.stock === 'number' && item.stock > 0 && item.stock < 3).length;
  const outOfStockCount = list.filter(item => Number(item.stock) === 0).length;
  const mostSold = list.reduce((max, item) => (item.piecesSold > (max?.piecesSold || 0) ? item : max), null);

  // --- Drag-and-drop handlers ---
  const handleDragEnd = debounce((result) => {
    if (!result.destination) return;
    // Work with filtered (category) list
    const filteredList = filtered;
    const reordered = Array.from(filteredList);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    // Assign displayOrder = (index+1)*10
    const updated = reordered.map((item, index) => ({
      _id: item._id,
      displayOrder: (index + 1) * 10,
    }));
    fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/products/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify({ products: updated })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        toast.success('Product order updated ✅');
        fetchList();
      } else {
        toast.error(data.message || 'Failed to update product order');
      }
    })
    .catch(error => {
      toast.error('Failed to update product order');
    });
  }, 300, { leading: true, trailing: false });

  async function handlePinToTop(productId) {
    if (!manualSort) return;
    const filteredList = filtered;
    const minOrder = Math.min(...filteredList.map(p => typeof p.displayOrder === 'number' ? p.displayOrder : 0));
    const newOrder = minOrder - 10;
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/products/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify({ products: [{ _id: productId, displayOrder: newOrder }] })
    });
    if (res.ok) {
      toast.success('Product order updated ✅');
      fetchList();
    } else {
      toast.error('Failed to update product order');
    }
  }
  async function handleSendToBottom(productId) {
    if (!manualSort) return;
    const filteredList = filtered;
    const maxOrder = Math.max(...filteredList.map(p => typeof p.displayOrder === 'number' ? p.displayOrder : 0));
    const newOrder = maxOrder + 10;
    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/products/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify({ products: [{ _id: productId, displayOrder: newOrder }] })
    });
    if (res.ok) {
      toast.success('Product order updated ✅');
      fetchList();
    } else {
      toast.error('Failed to update product order');
    }
  }

  // Custom Drawer Component
  const FilterDrawer = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    
    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
        {/* Drawer */}
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
            {/* Sticky Footer */}
            <div className="p-4 border-t bg-white sticky bottom-0">
              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-[#4D1E64] text-white rounded font-semibold shadow-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Filter Panel Component
  const FilterPanel = ({ isMobile = false }) => (
    <div className={`${isMobile ? 'space-y-4' : 'w-full bg-gray-50 rounded shadow-sm p-2 sm:p-4 mb-4 flex flex-col gap-2 sm:gap-4 md:flex-row md:items-end md:gap-4 relative'}`}>
      {/* Category */}
      <div className="flex flex-col min-w-[140px]">
        <label className="text-xs font-semibold mb-1 flex items-center gap-1">
          <ChevronDown className="w-4 h-4 text-gray-400" /> Category
        </label>
        <select
          value={pendingFilters.category}
          onChange={e => handleFilterChange('category', e.target.value)}
          className="px-2 py-1 border rounded focus:ring-2 focus:ring-[#4D1E64]"
        >
          <option value="">All</option>
          {categories.map(cat => (
            <option key={cat.slug} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>
      {/* Size */}
      <div className="flex flex-col min-w-[140px]">
        <label className="text-xs font-semibold mb-1">Size</label>
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {ALL_SIZES.map(size => (
            <label key={size} className="flex items-center gap-1 text-xs font-medium">
              <input
                type="checkbox"
                checked={pendingFilters.sizes.includes(size)}
                onChange={() => handleSizeToggle(size)}
                className="accent-[#4D1E64]"
              />
              {size}
            </label>
          ))}
        </div>
      </div>
      {/* Price Range */}
      <div className="flex flex-col min-w-[140px]">
        <label className="text-xs font-semibold mb-1">Price Range</label>
        <div className="flex gap-1 sm:gap-2">
          <input
            type="number"
            value={pendingFilters.priceMin}
            onChange={e => handleFilterChange('priceMin', e.target.value)}
            placeholder="Min"
            className="w-16 px-2 py-1 border rounded"
          />
          <input
            type="number"
            value={pendingFilters.priceMax}
            onChange={e => handleFilterChange('priceMax', e.target.value)}
            placeholder="Max"
            className="w-16 px-2 py-1 border rounded"
          />
        </div>
      </div>
      {/* Stock Range */}
      <div className="flex flex-col min-w-[140px]">
        <label className="text-xs font-semibold mb-1">Stock Range</label>
        <div className="flex gap-1 sm:gap-2">
          <input
            type="number"
            value={pendingFilters.stockMin}
            onChange={e => handleFilterChange('stockMin', e.target.value)}
            placeholder="Min"
            className="w-16 px-2 py-1 border rounded"
          />
          <input
            type="number"
            value={pendingFilters.stockMax}
            onChange={e => handleFilterChange('stockMax', e.target.value)}
            placeholder="Max"
            className="w-16 px-2 py-1 border rounded"
          />
        </div>
      </div>
      {/* Sort By */}
      <div className="flex flex-col min-w-[120px]">
        <label className="text-xs font-semibold mb-1">Sort By</label>
        <select
          value={pendingFilters.sortBy}
          onChange={e => handleFilterChange('sortBy', e.target.value)}
          className="px-2 py-1 border rounded focus:ring-2 focus:ring-[#4D1E64]"
        >
          <option value="createdAt">Newest</option>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
        </select>
      </div>
      {/* Order */}
      <div className="flex flex-col min-w-[100px]">
        <label className="text-xs font-semibold mb-1">Order</label>
        <select
          value={pendingFilters.sortOrder}
          onChange={e => handleFilterChange('sortOrder', e.target.value)}
          className="px-2 py-1 border rounded focus:ring-2 focus:ring-[#4D1E64]"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>
      {/* Clear All - only show on desktop */}
      {!isMobile && (
        <button
          onClick={clearAllFilters}
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-200 transition"
          title="Clear All Filters"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      )}
    </div>
  );

  // Custom Toggle Components
  const ToggleGroup = ({ children, className = "" }) => (
    <div className={`inline-flex rounded-lg border border-gray-200 bg-white p-1 ${className}`}>
      {children}
    </div>
  );

  const Toggle = ({ value, isActive, onClick, children, disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
        isActive 
          ? 'bg-[#4D1E64] text-white shadow-sm' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  // Stock Status Badge Component
  const StockBadge = ({ stock, size }) => {
    const getBadgeVariant = (stock) => {
      if (stock === 0) return 'bg-red-100 text-red-800 border-red-200';
      if (stock < 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-green-100 text-green-800 border-green-200';
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBadgeVariant(stock)}`}>
        {size}({stock})
      </span>
    );
  };

  // Product Card Component
  const ProductCard = ({ item, onEdit, onDelete, position }) => {
    // Stock grid for sizes
    let sizeStock = [];
    if (Array.isArray(item.sizes)) {
      if (typeof item.sizes[0] === 'string') {
        sizeStock = ALL_SIZES.map(sz => ({ 
          size: sz, 
          stock: item.sizes.includes(sz) ? (item.stock || 0) : 0 
        }));
      } else {
        sizeStock = ALL_SIZES.map(sz => {
          const found = item.sizes.find(s => s.size === sz);
          return { size: sz, stock: found ? found.stock : 0 };
        });
      }
    }

    const totalStock = sizeStock.reduce((sum, sz) => sum + sz.stock, 0);
    const isLowStock = totalStock > 0 && totalStock < 3;
    const isOutOfStock = totalStock === 0;

    return (
      <div className="relative border rounded-md p-3 hover:shadow-sm transition bg-white overflow-hidden">
        {/* Position Tag */}
        {typeof position === 'number' && (
          <span className="absolute top-2 left-2 text-xs text-gray-500 font-semibold z-10 bg-white/80 px-2 py-0.5 rounded">
            #{position + 1}
          </span>
        )}
        {/* Image */}
        <div className="relative h-48 bg-gray-100 rounded-md overflow-hidden">
          <img
            src={item.images?.[0] || item.image?.[0] || item.image || '/placeholder.svg'}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          {/* Product ID Badge */}
          <div className="absolute top-2 left-2 bg-[#4D1E64] text-white text-xs px-2 py-1 rounded font-semibold">
            {item.customId || item._id?.slice(-6) || 'ID'}
          </div>
          {/* Stock Status Badge */}
          <div className="absolute top-2 right-2">
            {isOutOfStock && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                Out of Stock
              </span>
            )}
            {isLowStock && !isOutOfStock && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded font-medium">
                Low Stock
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-2 sm:p-4">
          {/* Title and Category */}
          <h3 className="text-sm font-semibold text-gray-900 truncate mb-1" title={item.name}>
            {item.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1 truncate" title={item.category}>
            {item.category}
          </p>

          {/* Price and Sold Count */}
          <div className="flex justify-between items-center mt-2">
            <span className="text-lg font-bold text-gray-900">₹{item.price}</span>
            <span className="text-xs text-gray-500">
              Sold: <span className="font-medium">{item.piecesSold || 0}</span>
            </span>
          </div>

          {/* Stock Status */}
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2">Stock by Size:</p>
            <div className="flex flex-wrap gap-1">
              {sizeStock.map((sz) => (
                <StockBadge key={sz.size} stock={sz.stock} size={sz.size} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {/* Mobile: Icon-only buttons */}
            <button
              onClick={() => onEdit(item)}
              className="flex-1 sm:flex-none px-2 py-2 sm:px-3 sm:py-2 bg-[#4D1E64] text-white text-xs font-semibold rounded hover:bg-[#3a164d] transition-colors flex items-center justify-center gap-1"
            >
              <Edit className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => onDelete(item._id)}
              className="flex-1 sm:flex-none px-2 py-2 sm:px-3 sm:py-2 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Table View Component
  const ProductTable = ({ products, onEdit, onDelete }) => {
    return (
      <div className="hidden md:block bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Sizes
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Sold
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((item, index) => {
                // Stock grid for sizes
                let sizeStock = [];
                if (Array.isArray(item.sizes)) {
                  if (typeof item.sizes[0] === 'string') {
                    sizeStock = ALL_SIZES.map(sz => ({ 
                      size: sz, 
                      stock: item.sizes.includes(sz) ? (item.stock || 0) : 0 
                    }));
                  } else {
                    sizeStock = ALL_SIZES.map(sz => {
                      const found = item.sizes.find(s => s.size === sz);
                      return { size: sz, stock: found ? found.stock : 0 };
                    });
                  }
                }

                const totalStock = sizeStock.reduce((sum, sz) => sum + sz.stock, 0);
                const isLowStock = totalStock > 0 && totalStock < 3;
                const isOutOfStock = totalStock === 0;

                return (
                  <tr key={item._id || index} className="hover:bg-gray-50 transition-colors">
                    {/* Image */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 flex-shrink-0">
                          <img
                            className="h-12 w-12 rounded-lg object-cover"
                            src={item.images?.[0] || item.image?.[0] || item.image || '/placeholder.svg'}
                            alt={item.name}
                          />
                        </div>
                      </div>
                    </td>
                    
                    {/* Product Info */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {item.customId || item._id?.slice(-6) || 'N/A'}
                        </div>
                      </div>
                    </td>
                    
                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{item.category}</span>
                    </td>
                    
                    {/* Price */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">₹{item.price}</span>
                    </td>
                    
                    {/* Stock Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900">{totalStock}</span>
                        {isOutOfStock && (
                          <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <span className="text-xs text-yellow-600 font-medium">Low Stock</span>
                        )}
                      </div>
                    </td>
                    
                    {/* Sizes */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {sizeStock.map((sz) => (
                          <StockBadge key={sz.size} stock={sz.stock} size={sz.size} />
                        ))}
                      </div>
                    </td>
                    
                    {/* Sold */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{item.piecesSold || 0}</span>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(item)}
                          className="px-3 py-1 bg-[#4D1E64] text-white text-xs font-semibold rounded hover:bg-[#3a164d] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(item._id)}
                          className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your filters or add new products.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Manual Sort Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Products</h2>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-gray-600">Manual Sort</span>
          {/* Simple Switch */}
          <span className={`relative inline-block w-10 h-6 transition duration-200 align-middle select-none ${manualSort ? 'bg-[#4D1E64]' : 'bg-gray-300'} rounded-full`} onClick={() => setManualSort(v => !v)}>
            <span className={`absolute left-1 top-1 w-4 h-4 transition-transform duration-200 transform ${manualSort ? 'translate-x-4' : ''} bg-white rounded-full shadow`}></span>
          </span>
        </label>
      </div>
      {editingProduct ? (
        <EditProduct 
          product={editingProduct} 
          token={token} 
          onClose={() => setEditingProduct(null)}
          onUpdate={fetchList}
        />
      ) : (
        <>
          {/* --- Top Summary Widgets --- */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white shadow-sm rounded-lg p-3 flex flex-col items-center">
              <p className="text-xs font-medium text-gray-500">Total Products</p>
              <h2 className="text-lg font-bold text-gray-800">{totalProducts}</h2>
            </div>
            <div className="bg-yellow-50 shadow-sm rounded-lg p-3 flex flex-col items-center border border-yellow-200">
              <p className="text-xs font-medium text-yellow-700">Low Stock (&lt;3)</p>
              <h2 className="text-lg font-bold text-yellow-700">{lowStockCount}</h2>
            </div>
            <div className="bg-red-50 shadow-sm rounded-lg p-3 flex flex-col items-center border border-red-200">
              <p className="text-xs font-medium text-red-700">Out of Stock</p>
              <h2 className="text-lg font-bold text-red-700">{outOfStockCount}</h2>
            </div>
            <div className="bg-green-50 shadow-sm rounded-lg p-3 flex flex-col items-center border border-green-200">
              <p className="text-xs font-medium text-green-700">Most Sold</p>
              <h2 className="text-base font-semibold text-green-700 truncate max-w-[120px]">{mostSold?.name || '-'}</h2>
              <span className="text-xs text-green-700">{mostSold?.piecesSold ? `${mostSold.piecesSold} sold` : ''}</span>
            </div>
          </div>
          {/* --- Filter Controls --- */}
          <div className="flex items-center justify-between mb-4 p-2 sm:p-0">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 md:hidden"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            {/* View Toggle */}
            <div className="flex gap-2 items-center">
              <ToggleGroup className="mb-0">
                <Toggle 
                  value="card" 
                  isActive={viewMode === 'card'} 
                  onClick={() => setViewMode('card')}
                >
                  Card View
                </Toggle>
                <Toggle 
                  value="table" 
                  isActive={viewMode === 'table'} 
                  onClick={() => setViewMode('table')}
                  disabled={false}
                >
                  Table View
                </Toggle>
              </ToggleGroup>
            </div>
            </div>

          {/* Desktop Filter Panel */}
          <div className="hidden md:block">
            <FilterPanel />
          </div>

          {/* Mobile Filter Drawer */}
          <FilterDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
            <FilterPanel isMobile={true} />
            {/* Clear All for mobile */}
            <button
              onClick={clearAllFilters}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium"
            >
              Clear All Filters
            </button>
          </FilterDrawer>

          {lowStockProducts.length > 0 && (
            <div className='bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-4 rounded'>
              <b>Low Stock Warning:</b> {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
            </div>
          )}
          <p className='mb-2'>All Products List</p>
          <div className='flex flex-col gap-2'>
            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filtered.length} of {totalProducts} products
              </p>
                      </div>

            {/* Product Grid/Table */}
            <div className="p-2 sm:p-0">
              {viewMode === 'card' ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="products">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                        {filtered.map((item, index) => (
                          <Draggable key={item._id} draggableId={item._id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="relative"
                              >
                                <div {...provided.dragHandleProps} className="absolute left-2 top-2 z-10 cursor-grab text-gray-400 hover:text-gray-700">
                                  <GripVertical size={18} />
                      </div>
                                <ProductCard
                                  item={item}
                                  onEdit={setEditingProduct}
                                  onDelete={removeProduct}
                                  position={index}
                                />
                                {manualSort && (
                                  <div className="flex gap-2 ml-auto mt-2">
                                    <button
                                      className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 border border-gray-300"
                                      title="Pin to Top"
                                      onClick={() => handlePinToTop(item._id)}
                                    >📌</button>
                                    <button
                                      className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 border border-gray-300"
                                      title="Send to Bottom"
                                      onClick={() => handleSendToBottom(item._id)}
                                    >⬇️</button>
                    </div>
                                )}
                      </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <ProductTable
                  products={filtered}
                  onEdit={setEditingProduct}
                  onDelete={removeProduct}
                />
              )}
            </div>

            {/* Empty State for Card View */}
            {viewMode === 'card' && filtered.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500">Try adjusting your filters or add new products.</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default List