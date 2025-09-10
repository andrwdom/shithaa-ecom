// Force Refresh Products Script
// Run this in your browser console to force refresh product data

// Method 1: Clear all caches and reload
function forceRefreshAll() {
  console.log('🔄 Force refreshing all product data...');
  
  // Clear localStorage
  localStorage.removeItem('products');
  localStorage.removeItem('productCache');
  localStorage.removeItem('cachedProducts');
  
  // Clear sessionStorage
  sessionStorage.removeItem('products');
  sessionStorage.removeItem('productCache');
  
  // Clear any API cache
  if (window.apiManager) {
    window.apiManager.clearCache();
  }
  
  // Force reload with cache clear
  window.location.reload(true);
}

// Method 2: Clear cache without reload
function clearCacheOnly() {
  console.log('🧹 Clearing product cache...');
  
  // Clear localStorage
  localStorage.removeItem('products');
  localStorage.removeItem('productCache');
  localStorage.removeItem('cachedProducts');
  
  // Clear sessionStorage
  sessionStorage.removeItem('products');
  sessionStorage.removeItem('productCache');
  
  // Clear any API cache
  if (window.apiManager) {
    window.apiManager.clearCache();
  }
  
  console.log('✅ Cache cleared! Now refresh the page manually.');
}

// Method 3: Add cache busting to current page
function addCacheBusting() {
  console.log('🔧 Adding cache busting to current page...');
  
  // If on product page, reload with cache busting
  if (window.location.pathname.includes('/product/')) {
    const productId = window.location.pathname.split('/product/')[1];
    const newUrl = window.location.pathname + '?v=' + Date.now();
    window.location.href = newUrl;
  } else {
    // For other pages, just reload with cache clear
    window.location.reload(true);
  }
}

// Make functions available globally
window.forceRefreshAll = forceRefreshAll;
window.clearCacheOnly = clearCacheOnly;
window.addCacheBusting = addCacheBusting;

console.log('🚀 Product refresh functions loaded!');
console.log('Available commands:');
console.log('  forceRefreshAll() - Clear all caches and reload page');
console.log('  clearCacheOnly() - Clear caches without reloading');
console.log('  addCacheBusting() - Add cache busting and reload');

// Auto-run the most common solution
console.log('🔄 Auto-running forceRefreshAll()...');
forceRefreshAll();
