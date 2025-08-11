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
  breakdown: {
    maternityFeeding: { quantity: number; cost: number }
    loungeWear: { quantity: number; cost: number }
    otherCategories: { quantity: number; cost: number }
  }
}

/**
 * NEW COMPREHENSIVE SHIPPING RULES:
 * 
 * 1. MATERNITY FEEDING WEAR:
 *    - Tamil Nadu:
 *      * 1 dress = ₹39
 *      * 2 dresses = ₹49
 *      * 3 dresses = ₹59
 *      * 4 dresses = ₹69
 *      * 5 dresses = ₹79
 *      * 6 dresses = ₹89
 *      * 7+ dresses = ₹99
 *    - Other States:
 *      * 1 dress = ₹49
 *      * 2 dresses = ₹69
 *      * 3 dresses = ₹89
 *      * 4+ dresses = ₹109
 * 
 * 2. LOUNGE WEAR (all categories except maternity feeding):
 *    - Tamil Nadu: FREE shipping
 *    - Other States:
 *      * 1 dress = ₹39
 *      * 2 dresses = ₹49
 *      * 3 dresses = ₹59
 *      * 4 dresses = ₹69
 *      * 5 dresses = ₹79
 *      * 6 dresses = ₹89
 *      * 7+ dresses = ₹99
 * 
 * 3. MIXED CART (maternity feeding + lounge wear):
 *    - Calculate shipping for each category separately
 *    - Add the costs together
 */
export function calculateShippingCost(
  cartItems: CartItem[],
  shippingInfo: ShippingInfo | null
): ShippingCalculation {
  if (!cartItems || cartItems.length === 0) {
    return {
      shippingCost: 0,
      isFreeShipping: false,
      shippingMessage: "No items in cart",
      breakdown: {
        maternityFeeding: { quantity: 0, cost: 0 },
        loungeWear: { quantity: 0, cost: 0 },
        otherCategories: { quantity: 0, cost: 0 }
      }
    }
  }

  // Check if shipping info is available
  if (!shippingInfo || !shippingInfo.state) {
    return {
      shippingCost: 0,
      isFreeShipping: false,
      shippingMessage: "Shipping location not set",
      breakdown: {
        maternityFeeding: { quantity: 0, cost: 0 },
        loungeWear: { quantity: 0, cost: 0 },
        otherCategories: { quantity: 0, cost: 0 }
      }
    }
  }

  const isTamilNadu = shippingInfo.state.trim().toLowerCase() === 'tamil nadu'
  
  // Categorize items
  const maternityFeedingItems = cartItems.filter(item => 
    item.category === "Maternity Feeding Wear" || 
    item.categorySlug === "maternity-feeding-wear"
  )
  
  const loungeWearItems = cartItems.filter(item => 
    (item.category === "Zipless Feeding Lounge Wear" || 
     item.category === "Non-Feeding Lounge Wear" ||
     item.categorySlug === "zipless-feeding-lounge-wear" ||
     item.categorySlug === "non-feeding-lounge-wear") &&
    !(item.category === "Maternity Feeding Wear" || 
      item.categorySlug === "maternity-feeding-wear")
  )
  
  const otherCategoryItems = cartItems.filter(item => 
    !(item.category === "Maternity Feeding Wear" || 
      item.categorySlug === "maternity-feeding-wear") &&
    !(item.category === "Zipless Feeding Lounge Wear" || 
      item.category === "Non-Feeding Lounge Wear" ||
      item.categorySlug === "zipless-feeding-lounge-wear" ||
      item.categorySlug === "non-feeding-lounge-wear")
  )

  // Calculate quantities
  const maternityFeedingQty = maternityFeedingItems.reduce((sum, item) => sum + item.quantity, 0)
  const loungeWearQty = loungeWearItems.reduce((sum, item) => sum + item.quantity, 0)
  const otherCategoriesQty = otherCategoryItems.reduce((sum, item) => sum + item.quantity, 0)

  // Calculate shipping for each category
  const maternityFeedingCost = calculateMaternityFeedingShipping(maternityFeedingQty, isTamilNadu)
  const loungeWearCost = calculateLoungeWearShipping(loungeWearQty, isTamilNadu)
  const otherCategoriesCost = calculateOtherCategoriesShipping(otherCategoriesQty, isTamilNadu)

  // Total shipping cost
  const totalShippingCost = maternityFeedingCost + loungeWearCost + otherCategoriesCost
  
  // Determine if any category has free shipping
  const hasFreeShipping = (loungeWearQty > 0 && isTamilNadu) || 
                         (otherCategoriesQty > 0 && isTamilNadu)

  // Generate shipping message
  const shippingMessage = generateShippingMessage({
    maternityFeeding: { quantity: maternityFeedingQty, cost: maternityFeedingCost },
    loungeWear: { quantity: loungeWearQty, cost: loungeWearCost },
    otherCategories: { quantity: otherCategoriesQty, cost: otherCategoriesCost },
    isTamilNadu,
    totalShippingCost
  })

  return {
    shippingCost: totalShippingCost,
    isFreeShipping: hasFreeShipping && totalShippingCost === 0,
    shippingMessage,
    breakdown: {
      maternityFeeding: { quantity: maternityFeedingQty, cost: maternityFeedingCost },
      loungeWear: { quantity: loungeWearQty, cost: loungeWearCost },
      otherCategories: { quantity: otherCategoriesQty, cost: otherCategoriesCost }
    }
  }
}

/**
 * Calculate shipping for Maternity Feeding Wear
 */
function calculateMaternityFeedingShipping(quantity: number, isTamilNadu: boolean): number {
  if (quantity === 0) return 0
  
  if (isTamilNadu) {
    // Tamil Nadu rules
    if (quantity === 1) return 39
    if (quantity === 2) return 49
    if (quantity === 3) return 59
    if (quantity === 4) return 69
    if (quantity === 5) return 79
    if (quantity === 6) return 89
    return 99 // 7+ items
  } else {
    // Other states rules
    if (quantity === 1) return 49
    if (quantity === 2) return 69
    if (quantity === 3) return 89
    return 109 // 4+ items
  }
}

/**
 * Calculate shipping for Lounge Wear
 */
function calculateLoungeWearShipping(quantity: number, isTamilNadu: boolean): number {
  if (quantity === 0) return 0
  
  if (isTamilNadu) {
    // Free shipping for Tamil Nadu
    return 0
  } else {
    // Other states rules
    if (quantity === 1) return 39
    if (quantity === 2) return 49
    if (quantity === 3) return 59
    if (quantity === 4) return 69
    if (quantity === 5) return 79
    if (quantity === 6) return 89
    return 99 // 7+ items
  }
}

/**
 * Calculate shipping for Other Categories
 */
function calculateOtherCategoriesShipping(quantity: number, isTamilNadu: boolean): number {
  if (quantity === 0) return 0
  
  if (isTamilNadu) {
    // Free shipping for Tamil Nadu
    return 0
  } else {
    // Other states rules
    if (quantity === 1) return 39
    if (quantity === 2) return 59
    if (quantity === 3) return 89
    return 105 // 4+ items
  }
}

/**
 * Generate comprehensive shipping message
 */
function generateShippingMessage(breakdown: {
  maternityFeeding: { quantity: number; cost: number }
  loungeWear: { quantity: number; cost: number }
  otherCategories: { quantity: number; cost: number }
  isTamilNadu: boolean
  totalShippingCost: number
}): string {
  const { maternityFeeding, loungeWear, otherCategories, isTamilNadu, totalShippingCost } = breakdown
  
  if (totalShippingCost === 0) {
    return "Free shipping! 🎉"
  }

  const messages: string[] = []
  
  if (maternityFeeding.quantity > 0) {
    if (maternityFeeding.cost === 0) {
      messages.push(`Free shipping for ${maternityFeeding.quantity} maternity feeding item${maternityFeeding.quantity > 1 ? 's' : ''}`)
    } else {
      messages.push(`₹${maternityFeeding.cost} for ${maternityFeeding.quantity} maternity feeding item${maternityFeeding.quantity > 1 ? 's' : ''}`)
    }
  }
  
  if (loungeWear.quantity > 0) {
    if (loungeWear.cost === 0) {
      messages.push(`Free shipping for ${loungeWear.quantity} lounge wear item${loungeWear.quantity > 1 ? 's' : ''}`)
    } else {
      messages.push(`₹${loungeWear.cost} for ${loungeWear.quantity} lounge wear item${loungeWear.quantity > 1 ? 's' : ''}`)
    }
  }
  
  if (otherCategories.quantity > 0) {
    if (otherCategories.cost === 0) {
      messages.push(`Free shipping for ${otherCategories.quantity} other item${otherCategories.quantity > 1 ? 's' : ''}`)
    } else {
      messages.push(`₹${otherCategories.cost} for ${otherCategories.quantity} other item${otherCategories.quantity > 1 ? 's' : ''}`)
    }
  }
  
  if (messages.length === 1) {
    return `Shipping: ${messages[0]}`
  } else {
    return `Shipping: ${messages.join(', ')}`
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
  
  if (calculation.isFreeShipping) {
    return "Free shipping! 🎉"
  }
  
  return calculation.shippingMessage
} 