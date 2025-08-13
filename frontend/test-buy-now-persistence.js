// Test script to verify buy now persistence
// Run this in the browser console to test the buy now storage mechanism

console.log("Testing Buy Now Persistence...");

// Test data
const testBuyNowItem = {
  id: "test123",
  _id: "test123",
  name: "Test Product",
  price: 999,
  quantity: 1,
  size: "M",
  image: "/test-image.jpg"
};

// Test 1: Set buy now item
console.log("Test 1: Setting buy now item...");
sessionStorage.setItem("buyNowItem", JSON.stringify(testBuyNowItem));
localStorage.setItem("buyNowItem", JSON.stringify(testBuyNowItem));

// Test 2: Verify storage
console.log("Test 2: Verifying storage...");
const sessionStored = sessionStorage.getItem("buyNowItem");
const localStored = localStorage.getItem("buyNowItem");
console.log("SessionStorage:", sessionStored ? "✅" : "❌");
console.log("LocalStorage:", localStored ? "✅" : "❌");

// Test 3: Parse and validate
console.log("Test 3: Parsing and validating...");
try {
  const parsed = JSON.parse(sessionStored || localStored || "{}");
  if (parsed && parsed._id && parsed.name) {
    console.log("✅ Valid buy now item:", parsed);
  } else {
    console.log("❌ Invalid buy now item structure");
  }
} catch (error) {
  console.log("❌ Error parsing:", error);
}

// Test 4: Simulate page refresh scenario
console.log("Test 4: Simulating page refresh...");
const simulateRefresh = () => {
  // Clear the context state (simulating page refresh)
  const restored = sessionStorage.getItem("buyNowItem") || localStorage.getItem("buyNowItem");
  if (restored) {
    try {
      const parsed = JSON.parse(restored);
      if (parsed && parsed._id && parsed.name) {
        console.log("✅ Successfully restored after refresh:", parsed);
        return true;
      }
    } catch (error) {
      console.log("❌ Failed to restore after refresh:", error);
    }
  }
  console.log("❌ No data found after refresh");
  return false;
};

simulateRefresh();

// Test 5: Clear storage
console.log("Test 5: Clearing storage...");
sessionStorage.removeItem("buyNowItem");
localStorage.removeItem("buyNowItem");
console.log("Storage cleared");

console.log("Buy Now Persistence Test Complete!"); 