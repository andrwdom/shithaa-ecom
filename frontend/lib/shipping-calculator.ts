import { CartItem } from "@/components/cart-context"

export interface ShippingInfo {
  state: string
  city?: string
  pincode?: string
}

export interface ShippingCalculation {
  shippingCost: number
  isFreeShipping: boolean
  shippingMessage: string
}

/**
 * Calculate shipping cost based on cart items and shipping location
 * 
 * SHIPPING LOGIC IMPLEMENTATION:
 * 
 * 1. For all categories EXCEPT "Maternity Feeding Wear":
 *    - Tamil Nadu: FREE shipping
 *    - Other states:
 *       - 1 dress → ₹39
 *       - 2 dresses → ₹59
 *       - 3 dresses → ₹89
 *       - More than 3 dresses → ₹105 (max cap)
 * 
 * 2. For "Maternity Feeding Wear" category (special case):
 *    - Tamil Nadu:
 *       - 1 dress → ₹39
 *       - 2 dresses → ₹59
 *       - 3 dresses → ₹89
 *       - More than 3 dresses → ₹105 (max cap)
 *    - Other states: Same logic as above
 */
export function calculateShippingCost(
  cartItems: CartItem[],
  shippingInfo: ShippingInfo | null
): ShippingCalculation {
  if (!cartItems || cartItems.length === 0) {
    return {
      shippingCost: 0,
      isFreeShipping: false,
      shippingMessage: "No items in cart"
    }
  }

  // Check if shipping info is available
  if (!shippingInfo || !shippingInfo.state) {
    return {
      shippingCost: 0,
      isFreeShipping: false,
      shippingMessage: "Shipping location not set"
    }
  }

  const isTamilNadu = shippingInfo.state.trim().toLowerCase() === 'tamil nadu'
  
  // Count total dresses (items) in cart
  const totalDresses = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  
  // Check if any item is from "Maternity Feeding Wear" category
  const hasMaternityFeedingWear = cartItems.some(item => 
    item.category === "Maternity Feeding Wear" || 
    item.categorySlug === "maternity-feeding-wear"
  )

  let shippingCost = 0
  let isFreeShipping = false
  let shippingMessage = ""

  if (hasMaternityFeedingWear) {
    // Special case: Maternity Feeding Wear - always charge shipping regardless of state
    if (totalDresses === 1) {
      shippingCost = 39
      shippingMessage = "₹39 shipping for 1 item"
    } else if (totalDresses === 2) {
      shippingCost = 59
      shippingMessage = "₹59 shipping for 2 items"
    } else if (totalDresses === 3) {
      shippingCost = 89
      shippingMessage = "₹89 shipping for 3 items"
    } else if (totalDresses > 3) {
      shippingCost = 105
      shippingMessage = "₹105 shipping for 4+ items"
    }
  } else {
    // Regular categories
    if (isTamilNadu) {
      // Free shipping for Tamil Nadu (except Maternity Feeding Wear)
      shippingCost = 0
      isFreeShipping = true
      shippingMessage = "Free shipping within Tamil Nadu!"
    } else {
      // Other states - charge shipping
      if (totalDresses === 1) {
        shippingCost = 39
        shippingMessage = "₹39 shipping for 1 item"
      } else if (totalDresses === 2) {
        shippingCost = 59
        shippingMessage = "₹59 shipping for 2 items"
      } else if (totalDresses === 3) {
        shippingCost = 89
        shippingMessage = "₹89 shipping for 3 items"
      } else if (totalDresses > 3) {
        shippingCost = 105
        shippingMessage = "₹105 shipping for 4+ items"
      }
    }
  }

  return {
    shippingCost,
    isFreeShipping,
    shippingMessage
  }
}

/**
 * Get shipping message for display in cart and checkout
 */
export function getShippingDisplayMessage(
  cartItems: CartItem[],
  shippingInfo: ShippingInfo | null
): string {
  const calculation = calculateShippingCost(cartItems, shippingInfo)
  
  if (!shippingInfo || !shippingInfo.state) {
    return "Shipping calculated based on your location and items"
  }
  
  return "Shipping calculated based on your location and items"
} 