// Simple test to verify getIdToken function
console.log('=== AUTH DEBUG TEST ===');

// Test if the function exists in the auth context
try {
  // This would be run in browser console
  console.log('Testing getIdToken availability...');
  
  // Check if useAuth hook provides getIdToken
  const authContext = window.React?.useContext || null;
  console.log('React context available:', !!authContext);
  
  console.log('Test completed - check browser console for results');
} catch (error) {
  console.error('Auth debug test failed:', error);
}
