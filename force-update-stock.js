// Force update the stock.js file to ensure it has the latest code
const fs = require('fs');
const path = require('path');

console.log('🔄 Force updating stock.js file...');

const sourcePath = './backend/utils/stock.js';
const targetPath = '/var/www/shithaa-ecom/backend/utils/stock.js';

try {
    // Read the current file
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Write to the server location
    fs.writeFileSync(targetPath, content, 'utf8');
    
    console.log('✅ File updated successfully');
    
    // Verify the update
    const updatedContent = fs.readFileSync(targetPath, 'utf8');
    
    if (updatedContent.includes('🔄 Starting batch reservation for')) {
        console.log('✅ New code confirmed in target file');
    } else {
        console.log('❌ New code not found in target file');
    }
    
    if (updatedContent.includes('abortTransaction')) {
        console.log('❌ Old transaction code still present');
    } else {
        console.log('✅ No old transaction code found');
    }
    
} catch (error) {
    console.error('❌ Error updating file:', error.message);
}

