import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import EditProduct from './EditProduct'

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
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/products';
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
  }, [])

  // --- Filtering and Sorting ---
  let filtered = list.filter(item => {
    // Category
    if (categoryFilter && item.category !== categoryFilter) return false
    // Size
    if (sizeFilter) {
      if (!Array.isArray(item.sizes)) return false
      if (typeof item.sizes[0] === 'string') {
        if (!item.sizes.includes(sizeFilter)) return false
      } else {
        if (!item.sizes.some(s => s.size === sizeFilter)) return false
      }
    }
    // Price
    if (priceMin && Number(item.price) < Number(priceMin)) return false
    if (priceMax && Number(item.price) > Number(priceMax)) return false
    // Stock
    if (stockMin && Number(item.stock) < Number(stockMin)) return false
    if (stockMax && Number(item.stock) > Number(stockMax)) return false
    return true
  })

  filtered.sort((a, b) => {
    let valA, valB
    if (sortBy === 'price') {
      valA = Number(a.price)
      valB = Number(b.price)
    } else if (sortBy === 'stock') {
      valA = Number(a.stock)
      valB = Number(b.stock)
    } else if (sortBy === 'createdAt') {
      valA = new Date(a.createdAt || 0)
      valB = new Date(b.createdAt || 0)
    } else {
      valA = a[sortBy]
      valB = b[sortBy]
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  return (
    <>
      {editingProduct ? (
        <EditProduct 
          product={editingProduct} 
          token={token} 
          onClose={() => setEditingProduct(null)}
          onUpdate={fetchList}
        />
      ) : (
        <>
          {/* --- Filter/Sort Bar --- */}
          <div className="flex flex-wrap gap-2 mb-4 items-end bg-gray-50 p-3 rounded shadow-sm">
            <div>
              <label className="block text-xs font-semibold mb-1">Category</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2 py-1 border rounded">
                <option value="">All</option>
                {categories.map(cat => (
                  <option key={cat.slug} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Size</label>
              <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="px-2 py-1 border rounded">
                <option value="">All</option>
                {ALL_SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Price</label>
              <div className="flex gap-1">
                <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="Min" className="w-16 px-2 py-1 border rounded" />
                <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="Max" className="w-16 px-2 py-1 border rounded" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Stock</label>
              <div className="flex gap-1">
                <input type="number" value={stockMin} onChange={e => setStockMin(e.target.value)} placeholder="Min" className="w-16 px-2 py-1 border rounded" />
                <input type="number" value={stockMax} onChange={e => setStockMax(e.target.value)} placeholder="Max" className="w-16 px-2 py-1 border rounded" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Sort By</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-2 py-1 border rounded">
                <option value="createdAt">Newest</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Order</label>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="px-2 py-1 border rounded">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
            <button onClick={() => {
              setCategoryFilter(''); setSizeFilter(''); setPriceMin(''); setPriceMax(''); setStockMin(''); setStockMax(''); setSortBy('createdAt'); setSortOrder('desc');
            }} className="ml-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs">Reset</button>
          </div>

          {lowStockProducts.length > 0 && (
            <div className='bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-4 rounded'>
              <b>Low Stock Warning:</b> {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
            </div>
          )}
          <p className='mb-2'>All Products List</p>
          <div className='flex flex-col gap-2'>
            {/* ------ Product List: Compact Card Layout for All Screens ------ */}
            <div className="flex flex-col gap-3">
              {filtered.map((item, index) => {
                // Stock grid for sizes
                let sizeStock = []
                if (Array.isArray(item.sizes)) {
                  if (typeof item.sizes[0] === 'string') {
                    sizeStock = ALL_SIZES.map(sz => ({ size: sz, stock: item.sizes.includes(sz) ? (item.stock || '-') : '-' }))
                  } else {
                    sizeStock = ALL_SIZES.map(sz => {
                      const found = item.sizes.find(s => s.size === sz)
                      return { size: sz, stock: found ? found.stock : '-' }
                    })
                  }
                }
                return (
                  <div key={item._id || index} className="flex flex-row items-center bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 gap-3 hover:shadow-md transition-all">
                    {/* Image + ID */}
                    <div className="flex flex-col items-center min-w-[70px] w-[70px]">
                      <div className="w-14 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={item.images?.[0] || item.image?.[0] || item.image || '/placeholder.svg'}
                          alt={item.name}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="w-full bg-[#4D1E64] text-white text-[10px] text-center rounded-b-lg py-0.5 mt-1 font-semibold truncate" title={item._id || item.customId || 'ID'}>
                        {item._id || item.customId || 'ID'}
                      </div>
                    </div>
                    {/* Info Grid */}
                    <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                        <span className="font-semibold text-gray-700 truncate max-w-[120px]" title={item.name}>🛍️ {item.name}</span>
                        <span className="text-gray-500 truncate max-w-[80px]" title={item.category}>📂 {item.category}</span>
                        <span className="text-gray-700 font-semibold">₹{item.price}</span>
                        <span className="text-gray-500">Sold: <b>{item.piecesSold || 0}</b></span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold text-xs text-gray-600">Stock:</span>
                        <div className="flex flex-row gap-1">
                          {sizeStock.map((sz, i) => (
                            <div key={sz.size} className="flex flex-col items-center">
                              <span className="text-[10px] text-gray-400 font-bold">{sz.size}</span>
                              <span className="text-xs font-semibold text-gray-800">{sz.stock}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-2 min-w-[80px]">
                      <button
                        onClick={() => setEditingProduct(item)}
                        className='px-3 py-1 bg-[#4D1E64] text-white rounded font-semibold hover:bg-[#3a164d] transition-colors text-xs'
                        title="Edit product"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeProduct(item._id)}
                        className='px-3 py-1 bg-red-500 text-white rounded font-semibold hover:bg-red-600 transition-colors text-xs'
                        title="Delete product"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default List