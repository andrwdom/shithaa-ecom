// Test script to verify checkout offer calculation
console.log('🧪 Testing checkout offer calculation...');

// Mock the offer calculation logic from the checkout page
function calculateCheckoutOffer(displayItems) {
  console.log(`\n🔧 Testing offer calculation with ${displayItems.length} items:`);
  
  const loungewearItems = displayItems.filter((item) => 
    item.categorySlug === 'zipless-feeding-lounge-wear' || 
    item.categorySlug === 'non-feeding-lounge-wear'
  );
  
  console.log(`📊 Loungewear items found: ${loungewearItems.length}`);
  loungewearItems.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.name} - ₹${item.price} - ${item.categorySlug}`);
  });
  
  const totalLoungewearQuantity = loungewearItems.reduce((sum, item) => sum + item.quantity, 0);
  console.log(`📊 Total loungewear quantity: ${totalLoungewearQuantity}`);
  
  if (totalLoungewearQuantity < 3) {
    console.log(`❌ No offer: Need 3+ loungewear items, have ${totalLoungewearQuantity}`);
    return {
      offerApplied: false,
      offerDiscount: 0,
      offerDetails: null
    };
  }
  
  // Calculate offer: 3 for ₹1299, remaining at ₹450 each
  const completeSets = Math.floor(totalLoungewearQuantity / 3);
  const remainingItems = totalLoungewearQuantity % 3;
  const loungewearSubtotal = loungewearItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const offerTotal = (completeSets * 1299) + (remainingItems * 450);
  
  console.log(`\n📊 Calculation:`);
  console.log(`   Complete sets of 3: ${completeSets}`);
  console.log(`   Remaining items: ${remainingItems}`);
  console.log(`   Loungewear subtotal: ₹${loungewearSubtotal}`);
  console.log(`   Offer total: ${completeSets} × ₹1299 + ${remainingItems} × ₹450 = ₹${offerTotal}`);
  
  if (offerTotal < loungewearSubtotal) {
    const offerDiscount = loungewearSubtotal - offerTotal;
    console.log(`   Discount: ₹${offerDiscount}`);
    
    return {
      offerApplied: true,
      offerDiscount: offerDiscount,
      offerDetails: {
        completeSets,
        remainingItems,
        offerPrice: offerTotal,
        originalPrice: loungewearSubtotal,
        savings: offerDiscount
      }
    };
  } else {
    console.log(`❌ No discount: Offer total ₹${offerTotal} >= Loungewear subtotal ₹${loungewearSubtotal}`);
    return {
      offerApplied: false,
      offerDiscount: 0,
      offerDetails: null
    };
  }
}

// Test with the exact scenario from the user's images
const testItems = [
  {
    name: "Navy blue with heart printed non-feeding lounge wear",
    price: 450,
    quantity: 1,
    categorySlug: "non-feeding-lounge-wear"
  },
  {
    name: "Purple with flower print feeding lounge wear", 
    price: 450,
    quantity: 1,
    categorySlug: "zipless-feeding-lounge-wear"
  },
  {
    name: "Pink with flower print non-feeding lounge wear",
    price: 450,
    quantity: 1,
    categorySlug: "non-feeding-lounge-wear"
  }
];

console.log('\n🧪 Testing with exact checkout scenario:');
testItems.forEach((item, i) => {
  console.log(`${i + 1}. ${item.name} - ₹${item.price} - ${item.categorySlug}`);
});

const result = calculateCheckoutOffer(testItems);

console.log('\n🎯 Final Result:');
console.log(`   Offer Applied: ${result.offerApplied}`);
console.log(`   Offer Discount: ₹${result.offerDiscount}`);

if (result.offerDetails) {
  console.log(`   Offer Details:`, result.offerDetails);
}

// Calculate totals
const subtotal = testItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const finalTotal = subtotal - result.offerDiscount;

console.log('\n📊 Totals:');
console.log(`   Subtotal: ₹${subtotal}`);
console.log(`   Offer Discount: -₹${result.offerDiscount}`);
console.log(`   Final Total: ₹${finalTotal}`);

// Expected result
const expectedDiscount = 51; // 1350 - 1299 = 51
const expectedTotal = 1299;

console.log('\n✅ Expected vs Actual:');
console.log(`   Expected discount: ₹${expectedDiscount}`);
console.log(`   Actual discount: ₹${result.offerDiscount}`);
console.log(`   Expected total: ₹${expectedTotal}`);
console.log(`   Actual total: ₹${finalTotal}`);
console.log(`   Discount match: ${result.offerDiscount === expectedDiscount ? 'YES' : 'NO'}`);
console.log(`   Total match: ${finalTotal === expectedTotal ? 'YES' : 'NO'}`);

if (result.offerDiscount === expectedDiscount && finalTotal === expectedTotal) {
  console.log('\n🎉 SUCCESS: Checkout offer calculation is working correctly!');
  console.log('   The checkout page should now show:');
  console.log('   - Subtotal: ₹1350');
  console.log('   - Loungewear Offer: -₹51');
  console.log('   - Total: ₹1299');
} else {
  console.log('\n❌ ISSUE: Checkout offer calculation is not working as expected.');
}
