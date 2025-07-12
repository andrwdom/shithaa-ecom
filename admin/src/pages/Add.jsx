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

   // New: categories from backend
   const [categories, setCategories] = useState([]);

   const [selectedCategorySlug, setSelectedCategorySlug] = useState("");

   const CATEGORY_OPTIONS = [
     "Maternity Feeding Wear",
     "Zipless Feeding Lounge Wear",
     "Non-Feeding Lounge Wear"
   ];

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

   const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const formData = new FormData()
      formData.append("name",name)
      formData.append("description",description)
      formData.append("price",price)
      formData.append("category", category); // display name
      formData.append("categorySlug", selectedCategorySlug); // correct slug
      formData.append("bestseller",bestseller)
      formData.append("sizes", JSON.stringify(sizes.filter(s => s.stock > 0)))
      formData.append("availableSizes", JSON.stringify(sizes.filter(s => s.stock > 0).map(s => s.size)))
      image1 && formData.append("image1",image1)
      image2 && formData.append("image2",image2)
      image3 && formData.append("image3",image3)
      image4 && formData.append("image4",image4)
      const response = await axios.post(
        import.meta.env.VITE_API_URL + "/api/products",
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
      } else {
        toast.error(response.data.message || "Failed to add product.")
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error(error.message || "Unknown error occurred.")
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
          <p className='mb-2 text-yellow-700 text-sm font-medium'>Image size must be around 2 - 4MB max</p>
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
            <select
              value={selectedCategorySlug}
              onChange={e => {
                setSelectedCategorySlug(e.target.value);
                const cat = categories.find(c => c.slug === e.target.value);
                setCategory(cat ? cat.name : "");
              }}
              className='w-full px-3 py-2 border rounded bg-white text-gray-900'
              required
            >
              <option value="" disabled>Select a Category</option>
              {categories.map(option => (
                <option key={option.slug} value={option.slug}>{option.name}</option>
              ))}
            </select>
          </div>
          <div>
            <p className='mb-2'>Product Price</p>
            <input onChange={(e) => setPrice(e.target.value)} value={price} className='w-full px-3 py-2' type="number" placeholder='25' />
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

        <div className='flex gap-2 mt-2'>
          <input onChange={() => setBestseller(prev => !prev)} checked={bestseller} type="checkbox" id='bestseller' />
          <label className='cursor-pointer' htmlFor="bestseller">Add to bestseller</label>
        </div>

        <button type="submit" className={`w-28 py-3 mt-4 bg-purple-400 hover:bg-purple-600 transition-colors px-5 rounded-xl text-white flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={loading}>
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