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
 *       - 2 dresses → ₹49
 *       - 3 dresses → ₹59
 *       - 4 dresses → ₹69
 *       - 5 dresses → ₹79
 *       - 6 dresses → ₹89
 *       - 7+ dresses → ₹99
 *    - Other states: Same logic as above
 * 
 * 3. Mixed Cart Handling (Tamil Nadu):
 *    - Only count quantities from PAID shipping categories
 *    - Ignore quantities from FREE shipping categories (Lounge Wear, etc.)
 *    - Example: 4 Maternity Feeding + 4 Lounge Wear = Only 4 items count for shipping
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
  
  // 🔑 DEBUG: Log shipping calculation inputs
  console.log('[ShippingCalculator] 🔍 Inputs:', {
    state: shippingInfo.state,
    isTamilNadu,
    cartItemsCount: cartItems.length,
    cartItems: cartItems.map(item => ({
      name: item.name,
      category: item.category,
      categorySlug: item.categorySlug,
      quantity: item.quantity
    }))
  });
  
  // Helper function to identify free shipping categories in Tamil Nadu
  const isFreeShippingCategory = (category: string, categorySlug: string): boolean => {
    if (!isTamilNadu) return false; // Only free in Tamil Nadu
    
    return (
      category === "Zipless Feeding Lounge Wear" ||
      category === "Non-Feeding Lounge Wear" ||
      categorySlug === "zipless-feeding-lounge-wear" ||
      categorySlug === "non-feeding-lounge-wear" ||
      categorySlug === "zipless-feeding-dupatta-lounge-wear"
    );
  };
  
  // Filter items for shipping calculation based on location
  let itemsForShippingCalculation: CartItem[] = [];
  let freeShippingItems: CartItem[] = [];
  
  if (isTamilNadu) {
    // In Tamil Nadu: separate paid vs free shipping items
    cartItems.forEach(item => {
      if (isFreeShippingCategory(item.category || '', item.categorySlug || '')) {
        freeShippingItems.push(item);
      } else {
        itemsForShippingCalculation.push(item);
      }
    });
  } else {
    // Other states: all items count for shipping
    itemsForShippingCalculation = [...cartItems];
  }
  
  // Count total dresses (items) that actually contribute to shipping cost
  const totalDressesForShipping = itemsForShippingCalculation.reduce((sum, item) => sum + item.quantity, 0);
  const totalFreeShippingItems = freeShippingItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Check if any item is from "Maternity Feeding Wear" category
  const hasMaternityFeedingWear = itemsForShippingCalculation.some(item => 
    item.category === "Maternity Feeding Wear" || 
    item.categorySlug === "maternity-feeding-wear"
  );

  let shippingCost = 0;
  let isFreeShipping = false;
  let shippingMessage = "";

  if (hasMaternityFeedingWear) {
    // New shipping rules for Maternity Feeding Wear
    if (isTamilNadu) {
      // Tamil Nadu rules - only count paid shipping items
      if (totalDressesForShipping === 1) {
        shippingCost = 39;
        shippingMessage = "₹39 shipping for 1 maternity feeding item";
      } else if (totalDressesForShipping === 2) {
        shippingCost = 49;
        shippingMessage = "₹49 shipping for 2 maternity feeding items";
      } else if (totalDressesForShipping === 3) {
        shippingCost = 59;
        shippingMessage = "₹59 shipping for 3 maternity feeding items";
      } else if (totalDressesForShipping === 4) {
        shippingCost = 69;
        shippingMessage = "₹69 shipping for 4 maternity feeding items";
      } else if (totalDressesForShipping === 5) {
        shippingCost = 79;
        shippingMessage = "₹79 shipping for 5 maternity feeding items";
      } else if (totalDressesForShipping === 6) {
        shippingCost = 89;
        shippingMessage = "₹89 shipping for 6 maternity feeding items";
      } else {
        shippingCost = 99;
        shippingMessage = "₹99 shipping for 7+ maternity feeding items";
      }
      
      // Add free shipping message if there are free shipping items
      if (totalFreeShippingItems > 0) {
        shippingMessage += `, ${totalFreeShippingItems} lounge wear item${totalFreeShippingItems > 1 ? 's' : ''} free`;
      }
      
      // Set isFreeShipping based on whether there are any paid shipping items
      isFreeShipping = totalDressesForShipping === 0;
    } else {
      // Other states rules - all items count
      if (totalDressesForShipping === 1) {
        shippingCost = 49;
        shippingMessage = "₹49 shipping for 1 item";
      } else if (totalDressesForShipping === 2) {
        shippingCost = 69;
        shippingMessage = "₹69 shipping for 2 items";
      } else if (totalDressesForShipping === 3) {
        shippingCost = 89;
        shippingMessage = "₹89 shipping for 3 items";
      } else {
        shippingCost = 109;
        shippingMessage = "₹109 shipping for 4+ items";
      }
      
      // Other states are never free shipping for maternity feeding wear
      isFreeShipping = false;
    }
  } else {
    // Regular categories
    if (isTamilNadu) {
      // Free shipping for Tamil Nadu (except Maternity Feeding Wear)
      shippingCost = 0;
      isFreeShipping = true;
      if (totalFreeShippingItems > 0) {
        shippingMessage = `Free shipping for ${totalFreeShippingItems} item${totalFreeShippingItems > 1 ? 's' : ''} within Tamil Nadu!`;
      } else {
        shippingMessage = "Free shipping within Tamil Nadu!";
      }
    } else {
      // Other states - charge shipping
      if (totalDressesForShipping === 1) {
        shippingCost = 39;
        shippingMessage = "₹39 shipping for 1 item";
      } else if (totalDressesForShipping === 2) {
        shippingCost = 59;
        shippingMessage = "₹59 shipping for 2 items";
      } else if (totalDressesForShipping === 3) {
        shippingCost = 89;
        shippingMessage = "₹89 shipping for 3 items";
      } else if (totalDressesForShipping > 3) {
        shippingCost = 105;
        shippingMessage = "₹105 shipping for 4+ items";
      }
      
      // Other states are never free shipping for regular categories
      isFreeShipping = false;
    }
  }

  // 🔑 DEBUG: Log final calculation result
  console.log('[ShippingCalculator] ✅ Final Result:', {
    shippingCost,
    isFreeShipping,
    shippingMessage,
    totalDressesForShipping,
    totalFreeShippingItems,
    hasMaternityFeedingWear,
    isTamilNadu
  });
  
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