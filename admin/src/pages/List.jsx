import React, { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../config'
import { toast } from 'react-toastify'
import EditProduct from './EditProduct'
import {
  FiSearch, 
  FiFilter, 
  FiEdit, 
  FiTrash2, 
  FiChevronLeft, 
  FiChevronRight, 
  FiGrid, 
  FiList,
  FiPackage,
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiMenu,
  FiSave,
  FiChevronUp,
  FiChevronDown,
  FiSettings,
  FiDollarSign,
  FiTag,
  FiBarChart
} from 'react-icons/fi'

// Constants
const ALL_SIZES = ["S", "M", "L", "XL", "XXL"]
const PRODUCTS_PER_PAGE = 24

const List = ({ token }) => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${backendUrl}/api/products`, {
        headers: { token }
      })
      
      if (response.data.success) {
        setProducts(response.data.products)
      } else {
        toast.error('Failed to fetch products')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

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
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Failed to delete product')
    }
  }

  if (loading) {
    return <div>Loading products...</div>
  }

  return (
        <div>
      <h1>Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(product => (
          <div key={product._id} className="border p-4 rounded">
            <h3>{product.name}</h3>
            <p>{currency}{product.price}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditingProduct(product)}
                className="bg-blue-500 text-white px-2 py-1 rounded"
              >
                Edit
              </button>
    <button
                onClick={() => handleDeleteProduct(product._id)}
                className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                Delete
    </button>
            </div>
            </div>
        ))}
                  </div>

      {editingProduct && (
        <EditProduct
          product={editingProduct}
          token={token}
          onClose={() => setEditingProduct(null)}
          onUpdate={() => {
            setEditingProduct(null)
            fetchProducts()
          }}
        />
      )}
    </div>
  )
}

export default List