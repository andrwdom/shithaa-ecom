#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking server setup for Shithaa...\n');

// Check upload directories
const uploadDirs = [
    '/var/www/shithaa-ecom/uploads/products',
    '/var/www/shithaa-ecom/uploads/temp',
    path.join(__dirname, '../uploads/products'),
    path.join(__dirname, '../uploads/temp')
];

console.log('📁 Checking upload directories:');
for (const dir of uploadDirs) {
    try {
        if (!fs.existsSync(dir)) {
            console.log(`   ❌ ${dir} - DOES NOT EXIST`);
            try {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`   ✅ Created directory: ${dir}`);
            } catch (error) {
                console.log(`   ❌ Failed to create: ${dir} - ${error.message}`);
            }
        } else {
            console.log(`   ✅ ${dir} - EXISTS`);
            
            // Check permissions
            try {
                const stats = fs.statSync(dir);
                const isWritable = (stats.mode & fs.constants.W_OK) !== 0;
                console.log(`      Permissions: ${isWritable ? '✅ Writable' : '❌ Not writable'}`);
            } catch (error) {
                console.log(`      ❌ Permission check failed: ${error.message}`);
            }
        }
    } catch (error) {
        console.log(`   ❌ Error checking ${dir}: ${error.message}`);
    }
}

// Check if Sharp is available
console.log('\n🖼️ Checking image optimization dependencies:');
try {
    const sharp = await import('sharp');
    console.log('   ✅ Sharp library is available');
    
    // Test Sharp functionality
    try {
        const testBuffer = Buffer.from('fake-image-data');
        await sharp.default(testBuffer).metadata();
        console.log('   ✅ Sharp is working correctly');
    } catch (error) {
        console.log('   ⚠️ Sharp test failed (this is normal for fake data)');
    }
} catch (error) {
    console.log('   ❌ Sharp library is NOT available');
    console.log('   💡 Install with: npm install sharp');
}

// Check MongoDB connection
console.log('\n🗄️ Checking database connection:');
try {
    // Try to import the config file first
    const configPath = path.join(__dirname, '../config/mongodb.js');
    if (!fs.existsSync(configPath)) {
        console.log('   ❌ MongoDB config file not found');
        console.log(`      Expected: ${configPath}`);
    } else {
        try {
            const { connectDB } = await import('../config/mongodb.js');
            if (typeof connectDB === 'function') {
                await connectDB();
                console.log('   ✅ MongoDB connection successful');
            } else {
                console.log('   ❌ connectDB is not a function');
                console.log('      Type:', typeof connectDB);
            }
        } catch (importError) {
            console.log('   ❌ Error importing MongoDB config:');
            console.log(`      ${importError.message}`);
        }
    }
    
    // Test direct MongoDB connection
    try {
        const mongoose = await import('mongoose');
        console.log('   🔄 Testing direct MongoDB connection...');
        await mongoose.default.connect(process.env.MONGODB_URI);
        console.log('   ✅ Direct MongoDB connection successful');
        await mongoose.default.disconnect();
    } catch (directError) {
        console.log('   ❌ Direct MongoDB connection failed:');
        console.log(`      ${directError.message}`);
    }
} catch (error) {
    console.log('   ❌ MongoDB connection failed:');
    console.log(`      ${error.message}`);
}

// Check environment variables
console.log('\n🔧 Checking environment variables:');
const requiredEnvVars = [
    'MONGODB_URI',
    'BASE_URL',
    'JWT_SECRET'
];

for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
        console.log(`   ✅ ${envVar} is set`);
    } else {
        console.log(`   ❌ ${envVar} is NOT set`);
    }
}

// Check file permissions
console.log('\n🔐 Checking file permissions:');
const filesToCheck = [
    path.join(__dirname, '../controllers/productController.js'),
    path.join(__dirname, '../utils/imageOptimizer.js'),
    path.join(__dirname, '../models/productModel.js')
];

for (const file of filesToCheck) {
    try {
        if (fs.existsSync(file)) {
            const stats = fs.statSync(file);
            const isReadable = (stats.mode & fs.constants.R_OK) !== 0;
            console.log(`   ${isReadable ? '✅' : '❌'} ${path.basename(file)} - ${isReadable ? 'Readable' : 'Not readable'}`);
        } else {
            console.log(`   ❌ ${path.basename(file)} - File not found`);
        }
    } catch (error) {
        console.log(`   ❌ Error checking ${path.basename(file)}: ${error.message}`);
    }
}

console.log('\n🎯 Setup check completed!');
console.log('\n📋 Next steps:');
console.log('1. If any directories were created, ensure proper permissions');
console.log('2. Install Sharp: npm install sharp');
console.log('3. Check MongoDB connection string');
console.log('4. Restart the server after making changes'); 