import React, { useState, useEffect } from 'react'
import {assets} from '../assets/assets'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const Add = ({token}) => {

  const [image1,setImage1] = useState(false)
  const [image2,setImage2] = useState(false)
  const [image3,setImage3] = useState(false)
  const [image4,setImage4] = useState(false)

   const [name, setName] = useState("");
   const [description, setDescription] = useState("");
   const [price, setPrice] = useState("");
   const [category, setCategory] = useState("");
   const [subcategory, setSubcategory] = useState("");
   const [itemType, setItemType] = useState("");
   const [bestseller, setBestseller] = useState(false);
   const [sizes, setSizes] = useState([]);
   const [sleeveType, setSleeveType] = useState("");

   // New: categories from backend
   const [categories, setCategories] = useState([]);

   const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
   const [customId, setCustomId] = useState("");

   // Only the 4 required categories as specified
   const CATEGORY_OPTIONS = [
     "Maternity Feeding Wear",
     "Zipless Feeding Lounge Wear",
     "Non-Feeding Lounge Wear",
     "Zipless Feeding Dupatta Lounge Wear"
   ];

   const SLEEVE_TYPE_OPTIONS = ["Puff Sleeve", "Normal Sleeve"];

   const [loading, setLoading] = useState(false)

   // Helper: all possible sizes
   const ALL_SIZES = ["S", "M", "L", "XL", "XXL"];

   useEffect(() => {
     // Fetch categories from backend
     axios.get(`${backendUrl}/api/categories`).then(res => {
       if (res.data.success && Array.isArray(res.data.data)) {
         setCategories(res.data.data);
       }
     });
   }, []);

   // Check token validity on component mount
   useEffect(() => {
     const storedToken = localStorage.getItem('token');
     if (!storedToken || storedToken !== token) {
       console.log('Token mismatch detected:');
       console.log('Stored token:', storedToken);
       console.log('Prop token:', token);
     }
     
     // Test token validity
     testTokenValidity();
   }, [token]);

   // Function to test if the token is valid
   const testTokenValidity = async () => {
     try {
       const response = await axios.get(`${backendUrl}/api/categories`, {
         headers: { token }
       });
       console.log('Token is valid - categories fetched successfully');
     } catch (error) {
       console.error('Token validation failed:', error.response?.status, error.response?.data);
       if (error.response?.status === 401) {
         toast.error("Your session has expired. Please log in again.");
         // Clear invalid token
         localStorage.removeItem('token');
         window.location.href = '/';
       }
     }
   };

   // Function to refresh token if needed
   const refreshToken = async () => {
     try {
       const response = await axios.post(`${backendUrl}/api/user/refresh-token`, {}, {
         withCredentials: true
       });
       if (response.data.success) {
         console.log('Token refreshed successfully');
         return true;
       }
     } catch (error) {
       console.error('Token refresh failed:', error);
     }
     return false;
   };

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

   // Updated function to check if current category should show sleeve type field
   const shouldShowSleeveType = () => {
     return category === "Zipless Feeding Lounge Wear" || 
            category === "Non-Feeding Lounge Wear" || 
            category === "Zipless Feeding Dupatta Lounge Wear";
   };

   const onSubmitHandler = async (e) => {
    e.preventDefault();
    
    // Debug: Log the token to see what's being sent
    console.log('Token being used:', token);
    console.log('Token type:', typeof token);
    console.log('Token length:', token ? token.length : 0);
    
    // Check if token exists
    if (!token || token.trim() === '') {
      toast.error("Authentication token is missing. Please log in again.");
      return;
    }
    
    // Validate category selection
    if (!category) {
      toast.error("Please select a category");
      return;
    }

    // Validate sleeve type for categories that require it
    if (shouldShowSleeveType() && !sleeveType) {
      toast.error("Please select a sleeve type for this category");
      return;
    }

    // Validate that at least one image is selected
    if (!image1 && !image2 && !image3 && !image4) {
      toast.error("Please select at least one image");
      return;
    }

    // Validate that at least one size with stock > 0 is selected
    const sizesWithStock = sizes.filter(s => s.stock > 0);
    if (sizesWithStock.length === 0) {
      toast.error("Please select at least one size with stock greater than 0");
      return;
    }

    if (!customId.trim()) {
      toast.error("Product ID is required");
      return;
    }

    // Validate price
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      toast.error("Please enter a valid price greater than 0");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData()
      formData.append("customId", customId)
      formData.append("name",name)
      formData.append("description",description)
      formData.append("price", Number(price))
      formData.append("category", category); // display name
      formData.append("categorySlug", getCategorySlug(category)); // correct slug
      formData.append("bestseller", bestseller.toString())
      formData.append("sizes", JSON.stringify(sizesWithStock))
      formData.append("availableSizes", JSON.stringify(sizesWithStock.map(s => s.size)))
      image1 && formData.append("image1",image1)
      image2 && formData.append("image2",image2)
      image3 && formData.append("image3",image3)
      image4 && formData.append("image4",image4)
      
      // Add sleeve type if applicable
      if (shouldShowSleeveType() && sleeveType && sleeveType.trim()) {
        formData.append("sleeveType", sleeveType);
      }
      
      // Debug logging
      console.log('Form data being sent:');
      console.log('customId:', customId);
      console.log('name:', name);
      console.log('description:', description);
      console.log('price:', price);
      console.log('category:', category);
      console.log('categorySlug:', getCategorySlug(category));
      console.log('bestseller:', bestseller);
      console.log('sizes:', sizesWithStock);
      console.log('availableSizes:', sizesWithStock.map(s => s.size));
      console.log('sleeveType:', sleeveType);
      console.log('Images:', { image1, image2, image3, image4 });
      
      // Log FormData contents
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
      }
      
      // Debug: Log the request headers
      console.log('Request headers being sent:', { token });
      
      const response = await axios.post(
        backendUrl + "/api/products",
        formData,
        { headers: { token } }
      )
      if (response.status === 201 || response.data.success) {
        toast.success("Product added successfully!")
        setName('')
        setDescription('')
        setImage1(false)
        setImage2(false)
        setImage3(false)
        setImage4(false)
        setPrice('')
        setCategory('')
        setSelectedCategorySlug("");
        setSizes([])
        setBestseller(false)
        setCustomId("");
        setSleeveType(""); // Reset sleeve type
      } else {
        toast.error(response.data.message || "Failed to add product.")
      }
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 401) {
        if (error.response?.data?.message) {
          toast.error(`Authentication failed: ${error.response.data.message}`);
        } else {
          toast.error("Authentication failed. Your session may have expired. Please log in again.");
        }
        // Optionally redirect to login
        // window.location.href = '/';
      } else if (error.response?.status === 403) {
        toast.error("Access denied. You don't have permission to perform this action.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(error.message || "Unknown error occurred.");
      }
    }
    setLoading(false);
   }

  return (
    <>
      {/* Main Add Product Form */}
      <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
        <div>
          <p className='mb-2'>Upload Image</p>
          <div className='flex gap-2'>
            <label htmlFor="image1">
              <img className='w-20' src={!image1 ? assets.upload_area : URL.createObjectURL(image1)} alt="" />
              <input onChange={(e)=>setImage1(e.target.files[0])} type="file" id="image1" hidden/>
            </label>
            <label htmlFor="image2">
              <img className='w-20' src={!image2 ? assets.upload_area : URL.createObjectURL(image2)} alt="" />
              <input onChange={(e)=>setImage2(e.target.files[0])} type="file" id="image2" hidden/>
            </label>
            <label htmlFor="image3">
              <img className='w-20' src={!image3 ? assets.upload_area : URL.createObjectURL(image3)} alt="" />
              <input onChange={(e)=>setImage3(e.target.files[0])} type="file" id="image3" hidden/>
            </label>
            <label htmlFor="image4">
              <img className='w-20' src={!image4 ? assets.upload_area : URL.createObjectURL(image4)} alt="" />
              <input onChange={(e)=>setImage4(e.target.files[0])} type="file" id="image4" hidden/>
            </label>
          </div>
        </div>

        <div className='w-full'>
          <p className='mb-2'>Product ID (unique, required)</p>
          <input onChange={(e)=>setCustomId(e.target.value)} value={customId} className='w-full max-w-[500px] px-3 py-2' type="text" placeholder='Enter unique product ID' required/>
        </div>

        <div className='w-full'>
          <p className='mb-2'>Product name</p>
          <input onChange={(e)=>setName(e.target.value)} value={name} className='w-full max-w-[500px] px-3 py-2' type="text" placeholder='Type here' required/>
        </div>

        <div className='w-full'>
          <p className='mb-2'>Product description</p>
          <textarea onChange={(e)=>setDescription(e.target.value)} value={description} className='w-full max-w-[500px] px-3 py-2' type="text" placeholder='Write content here' required/>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
          <div>
            <p className='mb-2'>Category</p>
            <select onChange={(e) => setCategory(e.target.value)} className='w-full px-3 py-2' required>
              <option value="">Select a Category</option>
              {CATEGORY_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {/* Sleeve Type Field - Only show for Lounge Wear categories */}
          {shouldShowSleeveType() && (
            <div className='w-full'>
              <p className='mb-2'>Sleeve Type</p>
              <select 
                onChange={(e) => setSleeveType(e.target.value)} 
                value={sleeveType}
                className='w-full px-3 py-2'
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
            <input onChange={(e) => setPrice(e.target.value)} value={price} className='w-full px-3 py-2' type="number" placeholder='25' required />
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
                        setSizes(prev => [...prev, { size, stock: 1 }]); // Default to 1 stock when selected
                      } else {
                        setSizes(prev => prev.filter(s => s.size !== size));
                      }
                    }}
                  />
                  <label htmlFor={`size-${size}`} className='w-8'>{size}</label>
                  {checked && (
                    <input
                      type='number'
                      min={1}
                      className='w-24 px-2 py-1 border rounded'
                      placeholder='Stock'
                      value={sizeObj.stock}
                      onChange={e => {
                        const val = Math.max(1, Number(e.target.value)); // Ensure minimum stock of 1
                        setSizes(prev => prev.map(s => s.size === size ? { ...s, stock: val } : s));
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {sizes.length > 0 && (
            <p className='text-sm text-gray-600 mt-2'>
              Selected sizes: {sizes.map(s => `${s.size} (${s.stock})`).join(', ')}
            </p>
          )}
        </div>

        <div className='flex gap-2 mt-2'>
          <input onChange={() => setBestseller(prev => !prev)} checked={bestseller} type="checkbox" id='bestseller' />
          <label className='cursor-pointer' htmlFor="bestseller">Add to bestseller</label>
        </div>

        <button type="submit" className={`w-28 py-3 mt-4 bg-[#4D1E64] hover:bg-[#3a164d] transition-colors px-5 rounded-xl text-white flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={loading}>
          {loading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          )}
          {loading ? 'Processing...' : 'ADD'}
        </button>
      </form>
    </>
  )
}

export default Add
