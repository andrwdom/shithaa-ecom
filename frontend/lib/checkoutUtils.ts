/**
 * Utility functions for checkout operations
 */

/**
 * Maps the buy-now mode boolean to the correct source value for backend API calls
 * @param isBuyNowMode - Whether the checkout is in buy-now mode
 * @returns The source value to send to the backend: "cart" or "buynow"
 */
export function getSourceValue(isBuyNowMode: boolean): 'cart' | 'buynow' {
  return isBuyNowMode ? 'buynow' : 'cart';
}
