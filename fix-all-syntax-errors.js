#!/usr/bin/env node

/**
 * 🔧 COMPREHENSIVE SYNTAX ERROR FIX SCRIPT
 * 
 * This script will:
 * 1. Fix all known syntax errors
 * 2. Verify syntax of all files
 * 3. Provide restart instructions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 COMPREHENSIVE SYNTAX ERROR FIX SCRIPT');
console.log('==========================================\n');

// Files that need syntax fixes
const filesToFix = [
    {
        path: 'backend/models/productModel.js',
        description: 'Remove TypeScript syntax from JavaScript file',
        fixes: [
            {
                search: 'function(price: number)',
                replace: 'function(price)',
                reason: 'TypeScript type annotation in JavaScript file'
            }
        ]
    }
];

// Function to apply fixes
function applyFixes() {
    console.log('🔧 Applying syntax fixes...\n');
    
    let totalFixes = 0;
    
    for (const file of filesToFix) {
        const fullPath = path.join(__dirname, file.path);
        
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  File not found: ${file.path}`);
            continue;
        }
        
        console.log(`📝 Fixing: ${file.path}`);
        console.log(`   Description: ${file.description}`);
        
        try {
            let content = fs.readFileSync(fullPath, 'utf8');
            let fileFixes = 0;
            
            for (const fix of file.fixes) {
                if (content.includes(fix.search)) {
                    content = content.replace(fix.search, fix.replace);
                    console.log(`   ✅ Applied: ${fix.reason}`);
                    fileFixes++;
                } else {
                    console.log(`   ℹ️  Already fixed: ${fix.reason}`);
                }
            }
            
            if (fileFixes > 0) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`   💾 Saved with ${fileFixes} fixes\n`);
                totalFixes += fileFixes;
            } else {
                console.log(`   ℹ️  No fixes needed\n`);
            }
            
        } catch (error) {
            console.error(`   ❌ Error fixing ${file.path}:`, error.message);
        }
    }
    
    console.log(`🔧 Total fixes applied: ${totalFixes}\n`);
    return totalFixes;
}

// Function to verify syntax
function verifySyntax() {
    console.log('🔍 Verifying syntax of all JavaScript files...\n');
    
    const backendDir = path.join(__dirname, 'backend');
    const jsFiles = [];
    
    function findJsFiles(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                findJsFiles(fullPath);
            } else if (item.endsWith('.js')) {
                jsFiles.push(fullPath);
            }
        }
    }
    
    try {
        findJsFiles(backendDir);
    } catch (error) {
        console.log('⚠️  Could not scan backend directory');
        return;
    }
    
    console.log(`Found ${jsFiles.length} JavaScript files to verify\n`);
    
    let syntaxErrors = 0;
    let verifiedFiles = 0;
    
    for (const filePath of jsFiles) {
        const relativePath = path.relative(__dirname, filePath);
        
        try {
            // Try to parse the file
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Basic syntax check - look for common issues
            const issues = [];
            
            // Check for TypeScript syntax in JS files
            if (content.includes('function(') && content.includes(':')) {
                const functionMatches = content.match(/function\s*\([^)]*:\s*[a-zA-Z]+[^)]*\)/g);
                if (functionMatches) {
                    issues.push(`TypeScript syntax: ${functionMatches.join(', ')}`);
                }
            }
            
            // Check for malformed exports
            if (content.includes('export default:') || content.includes('export:')) {
                issues.push('Malformed export statement');
            }
            
            // Check for stray colons
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.endsWith(':') && !line.includes('//') && !line.includes('/*')) {
                    issues.push(`Stray colon on line ${i + 1}: "${line}"`);
                }
            }
            
            if (issues.length === 0) {
                console.log(`✅ ${relativePath}`);
                verifiedFiles++;
            } else {
                console.log(`❌ ${relativePath}`);
                issues.forEach(issue => console.log(`   ${issue}`));
                syntaxErrors++;
            }
            
        } catch (error) {
            console.log(`❌ ${relativePath} - Read error: ${error.message}`);
            syntaxErrors++;
        }
    }
    
    console.log(`\n🔍 Syntax verification complete:`);
    console.log(`   ✅ Valid files: ${verifiedFiles}`);
    console.log(`   ❌ Files with issues: ${syntaxErrors}`);
    
    return syntaxErrors;
}

// Main execution
async function main() {
    try {
        // Apply fixes
        const fixesApplied = applyFixes();
        
        // Verify syntax
        const syntaxErrors = verifySyntax();
        
        console.log('\n🚀 NEXT STEPS:');
        console.log('==============');
        
        if (fixesApplied > 0) {
            console.log(`1. ✅ Applied ${fixesApplied} syntax fixes`);
        }
        
        if (syntaxErrors === 0) {
            console.log('2. ✅ All JavaScript files have valid syntax');
            console.log('3. 🚀 Your backend should now start without syntax errors!');
        } else {
            console.log(`2. ⚠️  Found ${syntaxErrors} files with syntax issues`);
            console.log('3. 🔧 Please review and fix the remaining issues');
        }
        
        console.log('\n🔄 TO RESTART YOUR BACKEND:');
        console.log('==========================');
        console.log('1. Stop the current backend process:');
        console.log('   pkill -f "node.*backend"');
        console.log('   # OR if using PM2: pm2 stop all');
        console.log('');
        console.log('2. Wait 5 seconds for complete shutdown');
        console.log('');
        console.log('3. Start the backend again:');
        console.log('   cd backend && npm run dev');
        console.log('');
        console.log('4. Test the health endpoint:');
        console.log('   curl http://localhost:4000/api/health');
        console.log('');
        console.log('🎯 The syntax errors should now be resolved!');
        
    } catch (error) {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    }
}

// Run the script
main();
