#!/usr/bin/env node

/**
 * Script to remove debug logging for production optimization
 * This improves performance by removing console.log statements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to remove
const debugPatterns = [
    /console\.log\([^)]*🔧[^)]*\);?\s*/g,
    /console\.log\([^)]*CRITICAL[^)]*\);?\s*/g,
    /console\.log\([^)]*DEBUG[^)]*\);?\s*/g,
    /console\.log\([^)]*FINAL[^)]*\);?\s*/g,
    /console\.log\([^)]*Returning[^)]*\);?\s*/g,
    /console\.log\([^)]*Clearing[^)]*\);?\s*/g,
    /console\.log\([^)]*Processing[^)]*\);?\s*/g,
    /console\.log\([^)]*Product found[^)]*\);?\s*/g,
    /console\.log\([^)]*Is loungewear[^)]*\);?\s*/g,
    /console\.log\([^)]*Using item[^)]*\);?\s*/g,
    /console\.log\([^)]*Loungewear items[^)]*\);?\s*/g,
    /console\.log\([^)]*Offer calculation[^)]*\);?\s*/g,
    /console\.log\([^)]*Original total[^)]*\);?\s*/g,
    /console\.log\([^)]*Final discount[^)]*\);?\s*/g,
    /console\.log\([^)]*Offer validation[^)]*\);?\s*/g,
    /console\.log\([^)]*Items below minimum[^)]*\);?\s*/g,
    /console\.log\([^)]*Loungewear offer calculation[^)]*\);?\s*/g,
    /console\.log\([^)]*complete sets[^)]*\);?\s*/g,
    /console\.log\([^)]*remaining[^)]*\);?\s*/g,
    /console\.log\([^)]*No loungewear offer[^)]*\);?\s*/g,
    /console\.log\([^)]*Returning no offer[^)]*\);?\s*/g,
    /console\.log\([^)]*FINAL RESULT[^)]*\);?\s*/g,
    /console\.log\([^)]*Cart calculation summary[^)]*\);?\s*/g,
    /console\.log\([^)]*Final calculation[^)]*\);?\s*/g,
    /console\.log\([^)]*Returning fresh[^)]*\);?\s*/g,
    /console\.log\([^)]*calculateLoungewearCategoryOffer[^)]*\);?\s*/g,
    /console\.log\([^)]*Items:[^)]*\);?\s*/g,
    /console\.log\([^)]*Only [^)]*item[^)]*\);?\s*/g,
    /console\.log\([^)]*need 3[^)]*\);?\s*/g,
    /console\.log\([^)]*originalTotal:[^)]*\);?\s*/g,
    /console\.log\([^)]*discount:[^)]*\);?\s*/g,
    /console\.log\([^)]*Loungewear items count[^)]*\);?\s*/g,
    /console\.log\([^)]*Loungewear items:[^)]*\);?\s*/g,
    /console\.log\([^)]*loungewearCategoryOffer result[^)]*\);?\s*/g,
    /console\.log\([^)]*Calculation breakdown[^)]*\);?\s*/g,
    /console\.log\([^)]*loungewearOriginalTotal[^)]*\);?\s*/g,
    /console\.log\([^)]*loungewearDiscount[^)]*\);?\s*/g,
    /console\.log\([^)]*otherItemsTotal[^)]*\);?\s*/g,
    /console\.log\([^)]*subtotal[^)]*\);?\s*/g,
    /console\.log\([^)]*rawDiscount[^)]*\);?\s*/g,
    /console\.log\([^)]*offerApplied[^)]*\);?\s*/g,
    /console\.log\([^)]*loungewearItemCount[^)]*\);?\s*/g,
    /console\.log\([^)]*offerDiscount[^)]*\);?\s*/g,
    /console\.log\([^)]*finalTotal[^)]*\);?\s*/g,
    /console\.log\([^)]*Returning fresh cart[^)]*\);?\s*/g
];

function removeDebugLogs(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        debugPatterns.forEach(pattern => {
            const newContent = content.replace(pattern, '');
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        });
        
        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ Cleaned debug logs from: ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}

// Process all controller files
const controllersDir = path.join(__dirname, '..', 'controllers');
const files = fs.readdirSync(controllersDir).filter(file => file.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(controllersDir, file);
    removeDebugLogs(filePath);
});

console.log('🎉 Debug log cleanup completed!');
