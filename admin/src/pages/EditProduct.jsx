import React, { useState } from 'react'
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

  const CATEGORY_OPTIONS = [
    "Maternity Feeding Wear",
    "Zipless Feeding Lounge Wear",
    "Non-Feeding Lounge Wear"
  ];

  // Helper: all possible sizes
  const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

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
    return null;
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    const errorMsg = validateForm()
    if (errorMsg) {
      toast.error(errorMsg)
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()

      formData.append("name", name)
      formData.append("description", description)
      formData.append("price", price)
      formData.append("category", category)
      formData.append("bestseller", bestseller)
      formData.append("sizes", JSON.stringify(sizes.filter(s => s.stock > 0)))
      formData.append("stock", stock)

      if (image1) formData.append("image1", image1)
      if (image2) formData.append("image2", image2)
      if (image3) formData.append("image3", image3)
      if (image4) formData.append("image4", image4)

      const response = await axios.put(
        (import.meta.env.VITE_API_URL || 'http://localhost:5000') + `/api/products/${product._id}`,
        formData,
        { headers: { token } }
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
      console.log(error)
      toast.error(error.message)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
      <div className="flex justify-between items-center w-full">
        <h2 className="text-xl font-semibold">Edit Product</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div>
        <p className='mb-2'>Product Images</p>
        <div className='flex gap-2'>
          <label htmlFor="image1" className="cursor-pointer">
            <img
              className='w-20 h-20 object-cover border rounded'
              src={image1 ? URL.createObjectURL(image1) : product.images[0]}
              alt=""
            />
            <input
              onChange={(e) => setImage1(e.target.files[0])}
              type="file"
              id="image1"
              hidden
            />
          </label>
          <label htmlFor="image2" className="cursor-pointer">
            <img
              className='w-20 h-20 object-cover border rounded'
              src={image2 ? URL.createObjectURL(image2) : (product.images[1] || assets.upload_area)}
              alt=""
            />
            <input
              onChange={(e) => setImage2(e.target.files[0])}
              type="file"
              id="image2"
              hidden
            />
          </label>
          <label htmlFor="image3" className="cursor-pointer">
            <img
              className='w-20 h-20 object-cover border rounded'
              src={image3 ? URL.createObjectURL(image3) : (product.images[2] || assets.upload_area)}
              alt=""
            />
            <input
              onChange={(e) => setImage3(e.target.files[0])}
              type="file"
              id="image3"
              hidden
            />
          </label>
          <label htmlFor="image4" className="cursor-pointer">
            <img
              className='w-20 h-20 object-cover border rounded'
              src={image4 ? URL.createObjectURL(image4) : (product.images[3] || assets.upload_area)}
              alt=""
            />
            <input
              onChange={(e) => setImage4(e.target.files[0])}
              type="file"
              id="image4"
              hidden
            />
          </label>
        </div>
      </div>

      <div className='w-full'>
        <p className='mb-2'>Product name</p>
        <input
          onChange={(e) => setName(e.target.value)}
          value={name}
          className='w-full max-w-[500px] px-3 py-2 border rounded'
          type="text"
          placeholder='Type here'
          required
        />
      </div>

      <div className='w-full'>
        <p className='mb-2'>Product description</p>
        <textarea
          onChange={(e) => setDescription(e.target.value)}
          value={description}
          className='w-full max-w-[500px] px-3 py-2 border rounded'
          rows="4"
          placeholder='Write content here'
          required
        />
      </div>

      <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
        <div>
          <p className='mb-2'>Category</p>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className='w-full px-3 py-2 border rounded bg-white text-gray-900'
            required
          >
            <option value="" disabled>Select a Category</option>
            {CATEGORY_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

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
                      setSizes(prev => [...prev, { size, stock: 0 }]);
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

      <div className='w-full'>
        <p className='mb-2'>Product Stock</p>
        <input
          onChange={(e) => setStock(Number(e.target.value))}
          value={stock}
          className='w-full max-w-[200px] px-3 py-2 border rounded'
          type="number"
          min={0}
          placeholder='Stock count'
          required
        />
      </div>

      <div className='flex gap-2 mt-2'>
        <input
          onChange={() => setBestseller(prev => !prev)}
          checked={bestseller}
          type="checkbox"
          id='bestseller'
        />
        <label className='cursor-pointer' htmlFor="bestseller">
          Add to bestseller
        </label>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          className={`px-6 py-2 bg-purple-400 text-white rounded hover:bg-purple-600 transition-colors flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={loading}
        >
          {loading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          )}
          {loading ? 'Processing...' : 'Update'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className='px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors'
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default EditProduct 