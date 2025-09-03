// Test the frontend offer calculation logic
console.log('🧪 Testing frontend offer calculation logic...');

// Mock the exact logic from CheckoutPage.tsx
function calculateFrontendOffer(displayItems, isBuyNowMode, offerDetails) {
  console.log(`\n🔧 Testing frontend calculation with ${displayItems.length} items:`);
  console.log(`   isBuyNowMode: ${isBuyNowMode}`);
  console.log(`   hasOfferDetails: ${!!offerDetails}`);
  
  const rawSubtotal = displayItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  console.log(`   Raw subtotal: ₹${rawSubtotal}`);
  
  let offerDiscount = 0;
  let calculatedOfferDetails = null;
  
  if (isBuyNowMode || !offerDetails) {
    console.log('   🔧 Calculating offer directly (buy-now mode or no cart offer details)');
    
    const loungewearItems = displayItems.filter((item) => 
      item.categorySlug === 'zipless-feeding-lounge-wear' || 
      item.categorySlug === 'non-feeding-lounge-wear'
    );
    
    console.log(`   📊 Loungewear items found: ${loungewearItems.length}`);
    loungewearItems.forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.name} - ₹${item.price} - ${item.categorySlug}`);
    });
    
    const totalLoungewearQuantity = loungewearItems.reduce((sum, item) => sum + item.quantity, 0);
    console.log(`   📊 Total loungewear quantity: ${totalLoungewearQuantity}`);
    
    if (totalLoungewearQuantity >= 3) {
      // Calculate offer: 3 for ₹1299, remaining at ₹450 each
      const completeSets = Math.floor(totalLoungewearQuantity / 3);
      const remainingItems = totalLoungewearQuantity % 3;
      const loungewearSubtotal = loungewearItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const offerTotal = (completeSets * 1299) + (remainingItems * 450);
      
      console.log(`   📊 Calculation:`);
      console.log(`      Complete sets of 3: ${completeSets}`);
      console.log(`      Remaining items: ${remainingItems}`);
      console.log(`      Loungewear subtotal: ₹${loungewearSubtotal}`);
      console.log(`      Offer total: ${completeSets} × ₹1299 + ${remainingItems} × ₹450 = ₹${offerTotal}`);
      
      if (offerTotal < loungewearSubtotal) {
        offerDiscount = loungewearSubtotal - offerTotal;
        calculatedOfferDetails = {
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
        console.log(`      ✅ Discount calculated: ₹${offerDiscount}`);
      } else {
        console.log(`      ❌ No discount: Offer total ₹${offerTotal} >= Loungewear subtotal ₹${loungewearSubtotal}`);
      }
    } else {
      console.log(`   ❌ No offer: Need 3+ loungewear items, have ${totalLoungewearQuantity}`);
    }
  } else {
    console.log('   🔧 Using offer details from cart context');
    offerDiscount = offerDetails?.offerDiscount || 0;
    calculatedOfferDetails = offerDetails;
    console.log(`   📊 Cart offer discount: ₹${offerDiscount}`);
  }
  
  // Safety check
  const safeOfferDiscount = Math.max(0, Math.min(offerDiscount, rawSubtotal));
  if (offerDiscount !== safeOfferDiscount) {
    console.log(`   🔧 Safety adjustment: ₹${offerDiscount} → ₹${safeOfferDiscount}`);
  }
  
  const amountAfterOffer = rawSubtotal - safeOfferDiscount;
  const finalTotal = amountAfterOffer; // No coupon or shipping for this test
  
  console.log(`\n📊 Final Results:`);
  console.log(`   Raw subtotal: ₹${rawSubtotal}`);
  console.log(`   Offer discount: ₹${safeOfferDiscount}`);
  console.log(`   Amount after offer: ₹${amountAfterOffer}`);
  console.log(`   Final total: ₹${finalTotal}`);
  
  return {
    rawSubtotal,
    offerDiscount: safeOfferDiscount,
    calculatedOfferDetails,
    finalTotal
  };
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

console.log('\n🧪 Test Case 1: Buy-Now Mode (no cart offer details)');
const result1 = calculateFrontendOffer(testItems, true, null);

console.log('\n🧪 Test Case 2: Cart Mode (with cart offer details)');
const cartOfferDetails = {
  offerApplied: true,
  offerDiscount: 51,
  offerDetails: {
    completeSets: 1,
    remainingItems: 0,
    offerPrice: 1299,
    originalPrice: 1350,
    savings: 51
  }
};
const result2 = calculateFrontendOffer(testItems, false, cartOfferDetails);

console.log('\n🧪 Test Case 3: Cart Mode (no cart offer details)');
const result3 = calculateFrontendOffer(testItems, false, null);

// Expected results
const expectedDiscount = 51;
const expectedTotal = 1299;

console.log('\n✅ Expected vs Actual Results:');
console.log(`   Expected discount: ₹${expectedDiscount}`);
console.log(`   Expected total: ₹${expectedTotal}`);
console.log(`   Test 1 (Buy-Now): Discount ₹${result1.offerDiscount}, Total ₹${result1.finalTotal}`);
console.log(`   Test 2 (Cart with offer): Discount ₹${result2.offerDiscount}, Total ₹${result2.finalTotal}`);
console.log(`   Test 3 (Cart without offer): Discount ₹${result3.offerDiscount}, Total ₹${result3.finalTotal}`);

const allTestsPass = [
  result1.offerDiscount === expectedDiscount && result1.finalTotal === expectedTotal,
  result2.offerDiscount === expectedDiscount && result2.finalTotal === expectedTotal,
  result3.offerDiscount === expectedDiscount && result3.finalTotal === expectedTotal
].every(Boolean);

if (allTestsPass) {
  console.log('\n🎉 SUCCESS: All frontend offer calculations are working correctly!');
  console.log('   The checkout page should now show:');
  console.log('   - Subtotal: ₹1350');
  console.log('   - Loungewear Offer: -₹51');
  console.log('   - Total: ₹1299');
} else {
  console.log('\n❌ ISSUE: Some frontend offer calculations are not working as expected.');
  console.log('   Check the logic in CheckoutPage.tsx');
}
