// Test to verify cart context is working
console.log('🧪 Testing cart context debug...');

// This is a simple test to verify the cart context logic
// In a real scenario, this would be testing the React context

const mockCartItems = [
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

const mockOfferDetails = {
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

console.log('\n🔧 Mock Cart Context Data:');
console.log('Cart Items:', mockCartItems.length);
console.log('Offer Details:', mockOfferDetails);

// Test the checkout page logic
const displayItems = mockCartItems;
const offerDetails = mockOfferDetails;

console.log('\n🔧 Checkout Page Logic Test:');
console.log('Display Items:', displayItems.length);
console.log('Has Offer Details:', !!offerDetails);
console.log('Offer Applied:', offerDetails?.offerApplied);
console.log('Offer Discount:', offerDetails?.offerDiscount);

// Test the OrderSummary logic
const loungewearItems = displayItems.filter((item) => 
  item.categorySlug === 'zipless-feeding-lounge-wear' || 
  item.categorySlug === 'non-feeding-lounge-wear'
);

const totalLoungewearQuantity = loungewearItems.reduce((sum, item) => sum + item.quantity, 0);
const shouldShowOffer = totalLoungewearQuantity >= 3 && offerDetails?.offerApplied;

console.log('\n🔧 OrderSummary Logic Test:');
console.log('Loungewear Items Count:', loungewearItems.length);
console.log('Total Loungewear Quantity:', totalLoungewearQuantity);
console.log('Should Show Offer:', shouldShowOffer);
console.log('Offer Details Applied:', offerDetails?.offerApplied);

if (shouldShowOffer) {
  console.log('\n✅ SUCCESS: Offer should be displayed in OrderSummary');
  console.log('Expected to show: Loungewear Offer -₹51');
} else {
  console.log('\n❌ ISSUE: Offer should not be displayed');
  console.log('Check why shouldShowOffer is false');
}
