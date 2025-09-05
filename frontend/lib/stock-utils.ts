/**
 * Stock Utilities
 * Provides consistent stock calculations across the application
 */

export interface StockInfo {
  stock: number;
  reserved: number;
  available: number;
}

/**
 * Calculate available stock from raw stock and reserved amounts
 */
export function calculateAvailableStock(stock: number, reserved: number = 0): number {
  return Math.max(0, stock - reserved);
}

/**
 * Get stock info object with all calculated values
 */
export function getStockInfo(stock: number, reserved: number = 0): StockInfo {
  const available = calculateAvailableStock(stock, reserved);
  return {
    stock,
    reserved,
    available
  };
}

/**
 * Check if a quantity can be purchased
 */
export function canPurchaseQuantity(availableStock: number, requestedQuantity: number): boolean {
  return availableStock >= requestedQuantity;
}

/**
 * Get the maximum purchasable quantity for a product
 */
export function getMaxPurchasableQuantity(availableStock: number, maxPerOrder: number = 10): number {
  return Math.min(availableStock, maxPerOrder);
}

/**
 * Format stock information for display
 */
export function formatStockInfo(stockInfo: StockInfo): string {
  if (stockInfo.available === 0) {
    return 'Out of Stock';
  } else if (stockInfo.available <= 5) {
    return `Only ${stockInfo.available} left`;
  } else {
    return `${stockInfo.available} available`;
  }
}

/**
 * Get stock status for UI styling
 */
export function getStockStatus(stockInfo: StockInfo): 'in-stock' | 'low-stock' | 'out-of-stock' {
  if (stockInfo.available === 0) {
    return 'out-of-stock';
  } else if (stockInfo.available <= 5) {
    return 'low-stock';
  } else {
    return 'in-stock';
  }
}

/**
 * Validate product data and ensure stock fields are present
 */
export function validateProductStockData(product: any): boolean {
  return product && 
         typeof product.stock === 'number' && 
         typeof product.reserved === 'number' &&
         product.stock >= 0 && 
         product.reserved >= 0;
}

/**
 * Safely get stock info from product data
 */
export function getProductStockInfo(product: any): StockInfo {
  if (!validateProductStockData(product)) {
    console.warn('Invalid product stock data:', product);
    return { stock: 0, reserved: 0, available: 0 };
  }
  
  return getStockInfo(product.stock, product.reserved);
}

/**
 * Get stock info for a specific size
 */
export function getSizeStockInfo(product: any, size: string): StockInfo {
  if (!product || !product.sizes || !Array.isArray(product.sizes)) {
    return { stock: 0, reserved: 0, available: 0 };
  }
  
  const sizeObj = product.sizes.find((s: any) => s.size === size);
  if (!sizeObj) {
    return { stock: 0, reserved: 0, available: 0 };
  }
  
  return getStockInfo(sizeObj.stock || 0, sizeObj.reserved || 0);
}
