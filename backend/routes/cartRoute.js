import express from 'express'
import { addToCart, getUserCart, updateCart, removeFromCart, calculateCartTotal, getBulkStock, getCartItemsByUserId } from '../controllers/cartController.js'
import { verifyToken } from '../middleware/auth.js'
import productModel from '../models/productModel.js'

const cartRouter = express.Router()

cartRouter.post('/get', verifyToken, getUserCart)
cartRouter.post('/add', verifyToken, addToCart)
cartRouter.post('/update', verifyToken, updateCart)
cartRouter.post('/remove', verifyToken, removeFromCart)
cartRouter.post('/calculate-total', calculateCartTotal) // No auth required - frontend needs this
cartRouter.post('/get-stock', verifyToken, getBulkStock)
cartRouter.post('/get-items', getCartItemsByUserId) // No auth required - for frontend restoration

// Stock validation endpoint - check for out-of-stock items
cartRouter.post('/validate-stock', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const outOfStockItems = [];
    
    for (const item of items) {
      if (!item._id || !item.size || !item.quantity) {
        continue; // Skip invalid items
      }
      
      try {
        const product = await productModel.findById(item._id);
        if (!product) {
          outOfStockItems.push({
            ...item,
            reason: 'Product not found'
          });
          continue;
        }
        
        const sizeObj = product.sizes.find(s => s.size === item.size);
        if (!sizeObj) {
          outOfStockItems.push({
            ...item,
            reason: 'Size not available'
          });
          continue;
        }
        
        // Check if stock is sufficient
        if (sizeObj.stock < item.quantity) {
          outOfStockItems.push({
            ...item,
            reason: `Insufficient stock. Available: ${sizeObj.stock}, Requested: ${item.quantity}`,
            availableStock: sizeObj.stock
          });
        }
        
        // Check for corrupted stock data
        if (sizeObj.stock < 0) {
          outOfStockItems.push({
            ...item,
            reason: `Corrupted stock data: ${sizeObj.stock}`,
            availableStock: 0
          });
        }
        
      } catch (error) {
        console.error(`Error checking stock for item ${item._id}:`, error);
        outOfStockItems.push({
          ...item,
          reason: 'Error checking stock'
        });
      }
    }
    
    res.json({
      success: true,
      outOfStockItems,
      hasOutOfStockItems: outOfStockItems.length > 0,
      message: outOfStockItems.length > 0 
        ? `${outOfStockItems.length} item(s) are out of stock` 
        : 'All items are in stock'
    });
    
  } catch (error) {
    console.error('Stock validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate stock',
      error: error.message
    });
  }
});

export default cartRouter