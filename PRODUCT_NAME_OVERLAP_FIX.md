# Product Name Overlap Fix

## Issue
Product names in the invoice PDF were still overlapping despite the initial column width increase. Very long product names like "Purple with flower print feeding loungewear set" were still being truncated and overlapping with other content.

## Root Cause
The initial column width increase from 175px to 255px was insufficient for very long product names. Additionally, the text wasn't properly wrapping, causing overlapping issues.

## Solution
Implemented a comprehensive fix with two improvements:

### 1. Significantly Increased Column Width
**Before:**
```javascript
const colX = [40, 300, 350, 420, 490]; // Product column: 255px
```

**After:**
```javascript
const colX = [40, 380, 430, 500, 570]; // Product column: 330px
```

### 2. Added Proper Text Wrapping and Dynamic Height
**Before:**
```javascript
doc.text(item.name, colX[0], y, { width: colX[1] - colX[0] - 5 });
```

**After:**
```javascript
// Calculate proper width and height for text wrapping
const productNameWidth = colX[1] - colX[0] - 10; // Extra padding
const productNameHeight = doc.heightOfString(item.name, { width: productNameWidth });

doc.text(item.name, colX[0], y, { 
  width: productNameWidth,
  align: 'left',
  lineGap: 2
});

// Position other columns based on the product name height
const centerY = y + (productNameHeight / 2);

// Move down based on actual height
doc.moveDown(Math.max(0.2, productNameHeight / 20));
```

## Technical Improvements

### Column Layout
- **Product Name Column**: 330px (increased from 255px)
- **Quantity Column**: 50px
- **Size Column**: 70px  
- **Price Column**: 70px
- **Subtotal Column**: 70px

### Text Wrapping Features
- ✅ Automatic text wrapping for long product names
- ✅ Dynamic row height based on content
- ✅ Proper vertical alignment of other columns
- ✅ Extra padding to prevent edge cases
- ✅ Line gap for better readability

## What This Fixes
- ✅ No more overlapping product names
- ✅ Very long product names wrap properly
- ✅ All table columns remain properly aligned
- ✅ Professional invoice appearance
- ✅ Handles any length of product names

## Testing
Created `test-long-product-names.js` to verify the fix works with:
- Product names up to 100+ characters
- Multiple long product names in the same invoice
- Proper text wrapping and spacing

## Files Modified
- `backend/utils/invoiceGenerator.js` - Updated column widths and text wrapping logic
