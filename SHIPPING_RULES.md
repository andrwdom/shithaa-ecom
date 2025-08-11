# Shithaa Shipping Rules - Comprehensive Guide

## Overview
This document outlines the comprehensive shipping rules implemented for Shithaa's e-commerce platform. The shipping calculator automatically determines shipping costs based on product categories, quantities, and delivery location.

## Shipping Rules by Category

### 1. Maternity Feeding Wear

#### Tamil Nadu
- 1 dress = ₹39
- 2 dresses = ₹49
- 3 dresses = ₹59
- 4 dresses = ₹69
- 5 dresses = ₹79
- 6 dresses = ₹89
- 7+ dresses = ₹99

#### Other States
- 1 dress = ₹49
- 2 dresses = ₹69
- 3 dresses = ₹89
- 4+ dresses = ₹109

### 2. Lounge Wear (Zipless Feeding & Non-Feeding)

#### Tamil Nadu
- **FREE SHIPPING** for all quantities

#### Other States
- 1 dress = ₹39
- 2 dresses = ₹49
- 3 dresses = ₹59
- 4 dresses = ₹69
- 5 dresses = ₹79
- 6 dresses = ₹89
- 7+ dresses = ₹99

### 3. Other Categories (Dupatta, etc.)

#### Tamil Nadu
- **FREE SHIPPING** for all quantities

#### Other States
- 1 dress = ₹39
- 2 dresses = ₹59
- 3 dresses = ₹89
- 4+ dresses = ₹105

## Mixed Cart Scenarios

The shipping calculator intelligently handles mixed carts by:
1. **Categorizing items** by product type
2. **Calculating shipping separately** for each category
3. **Adding costs together** for the final shipping total

### Examples

#### Example 1: Maternity Feeding + Lounge Wear in Tamil Nadu
- 2 Maternity Feeding dresses = ₹49
- 1 Lounge Wear dress = FREE
- **Total Shipping = ₹49**

#### Example 2: Maternity Feeding + Lounge Wear in Other States
- 1 Maternity Feeding dress = ₹49
- 3 Lounge Wear dresses = ₹59
- **Total Shipping = ₹108**

#### Example 3: All Categories in Tamil Nadu
- 1 Maternity Feeding dress = ₹39
- 2 Lounge Wear dresses = FREE
- 1 Other category dress = FREE
- **Total Shipping = ₹39**

## Technical Implementation

### Frontend (`frontend/lib/shipping-calculator.ts`)
- **Category Detection**: Automatically identifies product categories
- **Location Detection**: Case-insensitive state matching
- **Cost Calculation**: Separate functions for each category
- **Message Generation**: Clear, user-friendly shipping messages

### Backend (`backend/controllers/shippingController.js`)
- **Product Lookup**: Fetches product details for category identification
- **Shipping Calculation**: Same logic as frontend for consistency
- **API Response**: Returns detailed breakdown and total cost

### Integration Points
- **Cart Sidebar**: Shows shipping information
- **Checkout Page**: Calculates final shipping cost
- **Order Summary**: Displays shipping breakdown
- **API Endpoint**: `/api/shipping/calculate`

## Category Detection

The system automatically detects product categories using:

```typescript
// Maternity Feeding Wear
item.category === "Maternity Feeding Wear" || 
item.categorySlug === "maternity-feeding-wear"

// Lounge Wear
(item.category === "Zipless Feeding Lounge Wear" || 
 item.category === "Non-Feeding Lounge Wear" ||
 item.categorySlug === "zipless-feeding-lounge-wear" ||
 item.categorySlug === "non-feeding-lounge-wear") &&
!(item.category === "Maternity Feeding Wear" || 
  item.categorySlug === "maternity-feeding-wear")

// Other Categories
// Everything else not covered above
```

## Location Detection

- **Tamil Nadu**: Case-insensitive matching (`"tamil nadu"`, `"TAMIL NADU"`, etc.)
- **Other States**: Any state not matching "Tamil Nadu"

## Shipping Messages

The system generates clear, informative messages:

- **Free Shipping**: "Free shipping! 🎉"
- **Single Category**: "Shipping: ₹39 for 1 maternity feeding item"
- **Mixed Categories**: "Shipping: ₹49 for 2 maternity feeding items, Free shipping for 1 lounge wear item"

## Testing Scenarios

The shipping calculator handles all edge cases:

1. **Empty Cart**: No shipping cost
2. **No Location**: Shipping not calculated
3. **Single Items**: Basic category rules
4. **Multiple Items**: Quantity-based pricing
5. **Mixed Categories**: Combined calculations
6. **Case Sensitivity**: Robust location matching

## Benefits

1. **Transparent Pricing**: Clear shipping costs for customers
2. **Location-Based**: Fair pricing for different regions
3. **Category-Specific**: Appropriate pricing for different product types
4. **Mixed Cart Support**: Handles complex shopping scenarios
5. **Automatic Calculation**: No manual intervention required
6. **Consistent Logic**: Same rules apply frontend and backend

## Future Enhancements

1. **Dynamic Pricing**: Database-driven shipping rules
2. **Weight-Based**: Shipping by product weight
3. **Zone-Based**: More granular location pricing
4. **Seasonal Rules**: Holiday or promotional shipping
5. **Courier Selection**: Different shipping options

## Support

For questions about shipping rules or technical implementation, refer to:
- **Frontend**: `frontend/lib/shipping-calculator.ts`
- **Backend**: `backend/controllers/shippingController.js`
- **API**: `backend/routes/shippingRoute.js`
- **Integration**: `frontend/app/checkout/CheckoutPage.tsx` 