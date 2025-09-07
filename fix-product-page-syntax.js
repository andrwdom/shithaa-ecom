const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing syntax error in ProductPageClient.tsx...');

const filePath = path.join(__dirname, 'frontend', 'app', 'product', '[productId]', 'ProductPageClient.tsx');

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the missing semicolon after the handleBuyNow function
  // Look for the pattern where the function ends with } but should end with };
  content = content.replace(
    /(\s+}, 100\);\s+)(\s+}\s+)(\s+// Safety check)/,
    '$1$2;$3'
  );
  
  // Write the fixed content back
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ Syntax error fixed!');
  console.log('📁 File updated:', filePath);
  
} catch (error) {
  console.error('❌ Error fixing syntax:', error.message);
  process.exit(1);
}
