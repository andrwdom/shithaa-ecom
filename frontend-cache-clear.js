// Frontend Cache Clear Script
// Add this to your frontend to force refresh product data

// Method 1: Add cache-busting parameter to API calls
const addCacheBuster = (url) => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
};

// Method 2: Clear localStorage cache
const clearProductCache = () => {
  // Clear any cached product data
  localStorage.removeItem('products');
  localStorage.removeItem('productCache');
  localStorage.removeItem('cachedProducts');
  
  // Clear sessionStorage
  sessionStorage.removeItem('products');
  sessionStorage.removeItem('productCache');
  
  console.log('✅ Product cache cleared');
};

// Method 3: Force reload with cache clear
const forceReload = () => {
  clearProductCache();
  window.location.reload(true);
};

// Usage: Call clearProductCache() or forceReload() in browser console
console.log('Cache clearing functions loaded. Use clearProductCache() or forceReload()');
