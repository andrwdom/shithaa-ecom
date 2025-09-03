// Debug script to test checkout offer calculation
console.log('🧪 Testing checkout offer calculation...');

// Test the exact scenario from the user's images
const testItems = [
  {
    name: "Navy blue with heart printed non-feeding lounge wear",
    price: 450,
    quantity: 1,
    categorySlug: "non-feeding-lounge-wear"
  },
  {
    name: "Pink with flower print non-feeding lounge wear",
    price: 450,
    quantity: 1,
    categorySlug: "non-feeding-lounge-wear"
  },
  {
    name: "Black glitter zipless feeding lounge wear",
    price: 450,
    quantity: 1,
    categorySlug: "zipless-feeding-lounge-wear"
  }
];

console.log('\n🔧 Testing with exact checkout scenario:');
testItems.forEach((item, i) => {
  console.log(`${i + 1}. ${item.name} - ₹${item.price} - ${item.categorySlug}`);
});

// Test the offer calculation logic
const loungewearItems = testItems.filter((item) => 
  item.categorySlug === 'zipless-feeding-lounge-wear' || 
  item.categorySlug === 'non-feeding-lounge-wear'
);

console.log(`\n📊 Loungewear items found: ${loungewearItems.length}`);
const totalLoungewearQuantity = loungewearItems.reduce((sum, item) => sum + item.quantity, 0);
console.log(`📊 Total loungewear quantity: ${totalLoungewearQuantity}`);

if (totalLoungewearQuantity >= 3) {
  console.log('✅ Should apply offer: 3+ loungewear items');
  
  // Calculate offer: 3 for ₹1299, remaining at ₹450 each
  const completeSets = Math.floor(totalLoungewearQuantity / 3);
  const remainingItems = totalLoungewearQuantity % 3;
  const loungewearSubtotal = loungewearItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const offerTotal = (completeSets * 1299) + (remainingItems * 450);
  
  console.log(`📊 Calculation:`);
  console.log(`   Complete sets of 3: ${completeSets}`);
  console.log(`   Remaining items: ${remainingItems}`);
  console.log(`   Loungewear subtotal: ₹${loungewearSubtotal}`);
  console.log(`   Offer total: ${completeSets} × ₹1299 + ${remainingItems} × ₹450 = ₹${offerTotal}`);
  
  if (offerTotal < loungewearSubtotal) {
    const offerDiscount = loungewearSubtotal - offerTotal;
    console.log(`   ✅ Discount: ₹${offerDiscount}`);
    
    const rawSubtotal = testItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const finalTotal = rawSubtotal - offerDiscount;
    
    console.log(`\n📊 Final Results:`);
    console.log(`   Raw subtotal: ₹${rawSubtotal}`);
    console.log(`   Offer discount: ₹${offerDiscount}`);
    console.log(`   Final total: ₹${finalTotal}`);
    
    if (offerDiscount === 51 && finalTotal === 1299) {
      console.log('\n🎉 SUCCESS: Offer calculation is working correctly!');
    } else {
      console.log('\n❌ ISSUE: Offer calculation is not working as expected.');
    }
  } else {
    console.log(`❌ No discount: Offer total ₹${offerTotal} >= Loungewear subtotal ₹${loungewearSubtotal}`);
  }
} else {
  console.log(`❌ No offer: Need 3+ loungewear items, have ${totalLoungewearQuantity}`);
}
