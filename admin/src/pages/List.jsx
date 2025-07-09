import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import EditProduct from './EditProduct'

const List = ({ token }) => {
  const [list, setList] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)

  const fetchList = async () => {
    try {
      // Use RESTful GET /api/products
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/products';
      const response = await axios.get(apiUrl, { headers: { token } })
      const products = response.data.products || response.data.data || [];
      // Sort newest first by createdAt or _id
      products.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return b._id.localeCompare(a._id);
      });
      setList(products);
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const removeProduct = async (id) => {
    try {
      // Use RESTful DELETE /api/products/:id
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
          {lowStockProducts.length > 0 && (
            <div className='bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 mb-4 rounded'>
              <b>Low Stock Warning:</b> {lowStockProducts.map(p => `${p.name} (${p.stock})`).join(', ')}
            </div>
          )}
          <p className='mb-2'>All Products List</p>
          <div className='flex flex-col gap-2'>
            {/* ------- List Table Title ---------- */}
            <div className='hidden md:grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center py-1 px-2 border bg-gray-100 text-sm'>
              <b>Image</b>
              <b>Name</b>
              <b>Category</b>
              <b>Price</b>
              <b>Sizes</b>
              <b>Stock</b>
              <b className='text-center'>Edit</b>
              <b className='text-center'>Remove</b>
            </div>

            {/* ------ Product List ------ */}
            {list.map((item, index) => (
              <div className='grid grid-cols-[1fr_2fr_1fr] md:grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-2 py-1 px-2 border text-sm' key={item._id || index}>
                <img className='w-12 h-12 object-cover rounded' src={item.images?.[0] || item.image?.[0] || item.image || '/placeholder.svg'} alt={item.name} />
                <p>{item.name}</p>
                <p>{item.category}</p>
                <p>{currency}{item.price}</p>
                <p>{Array.isArray(item.sizes) ? (typeof item.sizes[0] === 'string' ? item.sizes.join(', ') : item.sizes.map(s => s.size).join(', ')) : ''}</p>
                <p>{typeof item.stock === 'number' ? item.stock : '-'}</p>
                <button
                  onClick={() => setEditingProduct(item)}
                  className='text-center py-1 px-2 bg-purple-400 text-white rounded hover:bg-purple-600 transition-colors'
                >
                  Edit
                </button>
                <button
                  onClick={() => removeProduct(item._id)}
                  className='text-center py-1 px-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors'
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

export default List