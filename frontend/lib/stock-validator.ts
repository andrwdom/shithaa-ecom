/**
 * Stock Validation Utility
 * Validates stock availability before checkout to prevent errors
 */

export interface StockValidationItem {
  productId: string;
  size: string;
  quantity: number;
  name: string;
}

export interface StockValidationResult {
  isValid: boolean;
  unavailableItems: Array<{
    productId: string;
    name: string;
    size: string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
  message?: string;
}

/**
 * Validates stock availability for checkout items
 */
export const validateStockAvailability = async (
  items: StockValidationItem[],
  token?: string
): Promise<StockValidationResult> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/checkout/validate-stock?t=${Date.now()}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to validate stock');
    }

    return {
      isValid: data.isValid || false,
      unavailableItems: data.unavailableItems || [],
      message: data.message || 'Stock validation completed'
    };
  } catch (error) {
    console.error('Stock validation error:', error);
    return {
      isValid: false,
      unavailableItems: [],
      message: 'Failed to validate stock availability. Please try again.'
    };
  }
};

/**
 * Quick stock check for a single item
 */
export const quickStockCheck = async (
  productId: string,
  size: string,
  quantity: number,
  token?: string
): Promise<boolean> => {
  try {
    const result = await validateStockAvailability([{
      productId,
      size,
      quantity,
      name: ''
    }], token);
    
    return result.isValid;
  } catch (error) {
    console.error('Quick stock check error:', error);
    return false;
  }
};
