import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const EditProduct = ({ product, token, onClose, onUpdate }) => {
  const [image1, setImage1] = useState(null)
  const [image2, setImage2] = useState(null)
  const [image3, setImage3] = useState(null)
  const [image4, setImage4] = useState(null)
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description)
  const [price, setPrice] = useState(product.price)
  const [category, setCategory] = useState(product.category)
  const [bestseller, setBestseller] = useState(product.bestseller)
  const [loading, setLoading] = useState(false)
  const [stock, setStock] = useState(product.stock || 0)
  const [customId, setCustomId] = useState(product.customId || "");
  const [sleeveType, setSleeveType] = useState(product.sleeveType || "");

  // Debug token on component mount
  useEffect(() => {
    console.log('EditProduct mounted with token:', token);
    console.log('Token from localStorage:', localStorage.getItem('token'));
    console.log('Token comparison:', token === localStorage.getItem('token'));
  }, [token]);

  // Clear sleeveType when category doesn't require it
  useEffect(() => {
    if (!shouldShowSleeveType()) {
      setSleeveType("");
    }
  }, [category]);

  // Only the 4 required categories as specified
  const CATEGORY_OPTIONS = [
    "Maternity Feeding Wear",
    "Zipless Feeding Lounge Wear",
    "Non-Feeding Lounge Wear",
    "Zipless Feeding Dupatta Lounge Wear"
  ];

  const SLEEVE_TYPE_OPTIONS = ["Puff Sleeve", "Normal Sleeve"];

  // Category to slug mapping
  const getCategorySlug = (categoryName) => {
    const categoryMap = {
      "Maternity Feeding Wear": "maternity-feeding-wear",
      "Zipless Feeding Lounge Wear": "zipless-feeding-lounge-wear",
      "Non-Feeding Lounge Wear": "non-feeding-lounge-wear",
      "Zipless Feeding Dupatta Lounge Wear": "zipless-feeding-dupatta-lounge-wear"
    };
    return categoryMap[categoryName] || "";
  };

  // Helper: all possible sizes
  const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

  // Updated function to check if current category should show sleeve type field
  const shouldShowSleeveType = () => {
    return category === "Zipless Feeding Lounge Wear" || 
           category === "Non-Feeding Lounge Wear" || 
           category === "Zipless Feeding Dupatta Lounge Wear" ||
           category === "Lounge Wear";
  };

  // Parse initial sizes: support both ["S", ...] and [{ size, stock }]
  function parseInitialSizes(sizes) {
    if (!Array.isArray(sizes)) return [];
    if (typeof sizes[0] === "string") {
      return sizes.map(size => ({ size, stock: 0 }));
    }
    return sizes.map(s => ({ size: s.size, stock: s.stock || 0 }));
  }

  const [sizes, setSizes] = useState(parseInitialSizes(product.sizes));

  const validateForm = () => {
    if (!name.trim()) return 'Product name is required.';
    if (!description.trim()) return 'Product description is required.';
    if (!price || isNaN(Number(price)) || Number(price) <= 0) return 'Valid price is required.';
    if (!category) return 'Product category is required.';
    if (!Array.isArray(sizes) || sizes.length === 0) return 'At least one size must be selected.';
    
    // Validate that at least one size has stock > 0
    const sizesWithStock = sizes.filter(s => s.stock > 0);
    if (sizesWithStock.length === 0) {
      return 'At least one size must have stock greater than 0.';
    }
    
    // Validate that at least one image is selected (either existing or new)
    const hasExistingImages = product.images && product.images.length > 0;
    const hasNewImages = image1 || image2 || image3 || image4;
    if (!hasExistingImages && !hasNewImages) {
      return 'At least one image is required.';
    }
    
    // Validate sleeveType only if category requires it
    if (shouldShowSleeveType() && !sleeveType) {
      return 'Sleeve type is required for this category.';
    }
    
    return null;
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    
    // Check if token exists
    if (!token || token.trim() === '') {
      toast.error('Authentication token is missing. Please log in again.');
      return;
    }
    
    const errorMsg = validateForm()
    if (errorMsg) {
      toast.error(errorMsg)
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()

      // Send all selected sizes, including those with stock = 0
      // This allows new sizes to be added even if stock hasn't been set yet
      formData.append("name", name)
      formData.append("description", description)
      formData.append("price", price)
      formData.append("category", category)
      formData.append("categorySlug", getCategorySlug(category))
      formData.append("bestseller", bestseller)
      formData.append("sizes", JSON.stringify(sizes))
      formData.append("stock", stock)
      formData.append("customId", customId)
      
      // Add sleeve type only if applicable
      if (shouldShowSleeveType() && sleeveType) {
        formData.append("sleeveType", sleeveType);
      }
      // Don't send sleeveType at all for non-sleeve categories

      if (image1) formData.append("image1", image1)
      if (image2) formData.append("image2", image2)
      if (image3) formData.append("image3", image3)
      if (image4) formData.append("image4", image4)

      // Debug logging
      console.log('Token being sent:', token);
      console.log('Token length:', token ? token.length : 0);
      console.log('Token starts with:', token ? token.substring(0, 20) + '...' : 'No token');
      console.log('API URL:', 'https://shithaa.in/api/products/' + product._id);
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
      }

      const response = await axios.put(
        'https://shithaa.in/api/products/' + product._id,
        formData,
        { 
          headers: { 
            token,
            'Content-Type': 'multipart/form-data'
          } 
        }
      )

      if (response.data.success) {
        toast.success('Product updated successfully');
        if (typeof onUpdate === 'function') {
          onUpdate();
        }
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to update product');
      }
    } catch (error) {
      console.log('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        // Clear token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/';
      } else {
        toast.error(error.response?.data?.message || error.message)
      }
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
        <button
          type="button"
          onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form id="edit-product-form" onSubmit={onSubmitHandler} className='space-y-6'>

            <div className='space-y-3'>
              <label className='block text-sm font-medium text-gray-700'>Product Images</label>
              <div className='grid grid-cols-4 gap-3'>
                <div className="space-y-1">
                  <label htmlFor="image1" className="cursor-pointer block">
                    <img
                      className='w-20 h-20 object-cover border-2 border-gray-300 rounded-lg hover:border-blue-400 transition-colors'
              src={image1 ? URL.createObjectURL(image1) : product.images[0]}
                      alt="Product image 1"
            />
            <input
              onChange={(e) => setImage1(e.target.files[0])}
              type="file"
              id="image1"
                      accept="image/*"
              hidden
            />
          </label>
                  <p className="text-xs text-gray-500 text-center">Main</p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="image2" className="cursor-pointer block">
            <img
                      className='w-20 h-20 object-cover border-2 border-gray-300 rounded-lg hover:border-blue-400 transition-colors'
              src={image2 ? URL.createObjectURL(image2) : (product.images[1] || assets.upload_area)}
                      alt="Product image 2"
            />
            <input
              onChange={(e) => setImage2(e.target.files[0])}
              type="file"
              id="image2"
                      accept="image/*"
              hidden
            />
          </label>
                  <p className="text-xs text-gray-500 text-center">Alt 1</p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="image3" className="cursor-pointer block">
            <img
                      className='w-20 h-20 object-cover border-2 border-gray-300 rounded-lg hover:border-blue-400 transition-colors'
              src={image3 ? URL.createObjectURL(image3) : (product.images[2] || assets.upload_area)}
                      alt="Product image 3"
            />
            <input
              onChange={(e) => setImage3(e.target.files[0])}
              type="file"
              id="image3"
                      accept="image/*"
              hidden
            />
          </label>
                  <p className="text-xs text-gray-500 text-center">Alt 2</p>
                </div>
                <div className="space-y-1">
                  <label htmlFor="image4" className="cursor-pointer block">
            <img
                      className='w-20 h-20 object-cover border-2 border-gray-300 rounded-lg hover:border-blue-400 transition-colors'
              src={image4 ? URL.createObjectURL(image4) : (product.images[3] || assets.upload_area)}
                      alt="Product image 4"
            />
            <input
              onChange={(e) => setImage4(e.target.files[0])}
              type="file"
              id="image4"
                      accept="image/*"
              hidden
            />
          </label>
                  <p className="text-xs text-gray-500 text-center">Alt 3</p>
        </div>
              </div>
              <p className="text-sm text-gray-600">Click on any image to upload a new one. First image is the main product image.</p>
      </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700'>Product ID</label>
        <input
          value={customId}
                className='w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500'
          type="text"
                placeholder='Product ID (auto-generated)'
                readOnly
                disabled
        />
              <p className="text-xs text-gray-500">Product ID cannot be changed after creation</p>
      </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700'>Product Name <span className="text-red-500">*</span></label>
        <input
          onChange={(e) => setName(e.target.value)}
          value={name}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          type="text"
                placeholder='Enter product name'
          required
        />
      </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700'>Product Description <span className="text-red-500">*</span></label>
        <textarea
          onChange={(e) => setDescription(e.target.value)}
          value={description}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          rows="4"
                placeholder='Enter detailed product description'
          required
        />
      </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>Category <span className="text-red-500">*</span></label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'
            required
          >
            <option value="" disabled>Select a Category</option>
            {CATEGORY_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* Sleeve Type Field - Only show for Lounge Wear categories */}
        {shouldShowSleeveType() && (
          <div>
            <p className='mb-2'>Sleeve Type</p>
            <select
              value={sleeveType}
              onChange={e => setSleeveType(e.target.value)}
              className='w-full px-3 py-2 border rounded bg-white text-gray-900'
              required
            >
              <option value="">Select Sleeve Type</option>
              {SLEEVE_TYPE_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <p className='mb-2'>Product Price</p>
          <input
            onChange={(e) => setPrice(e.target.value)}
            value={price}
            className='w-full px-3 py-2 border rounded sm:w-[120px]'
            type="number"
            placeholder='25'
            required
          />
        </div>
      </div>

      <div>
        <p className='mb-2'>Product Sizes & Stock</p>
        <div className='flex flex-col gap-2'>
          {ALL_SIZES.map((size) => {
            const sizeObj = sizes.find(s => s.size === size);
            const checked = !!sizeObj;
            return (
              <div key={size} className='flex items-center gap-3'>
                <input
                  type='checkbox'
                  id={`size-${size}`}
                  checked={checked}
                  onChange={e => {
                    if (e.target.checked) {
                      setSizes(prev => [...prev, { size, stock: 1 }]);
                    } else {
                      setSizes(prev => prev.filter(s => s.size !== size));
                    }
                  }}
                />
                <label htmlFor={`size-${size}`} className='w-8'>{size}</label>
                {checked && (
                  <input
                    type='number'
                    min={0}
                    className='w-24 px-2 py-1 border rounded'
                    placeholder='Stock'
                    value={sizeObj.stock}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSizes(prev => prev.map(s => s.size === size ? { ...s, stock: val } : s));
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className='flex gap-2 mt-2'>
        <input 
          onChange={() => setBestseller(prev => !prev)} 
          checked={bestseller} 
          type="checkbox" 
          id='bestseller' 
        />
        <label className='cursor-pointer' htmlFor="bestseller">Add to bestseller</label>
      </div>

            </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
      <button 
        type="submit" 
            form="edit-product-form"
            className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} 
        disabled={loading}
      >
        {loading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
        )}
            {loading ? 'Updating...' : 'Update Product'}
      </button>
        </div>
      </div>
    </div>
  )
}

export default EditProduct 