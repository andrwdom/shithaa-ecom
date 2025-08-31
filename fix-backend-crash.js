// 🚨 EMERGENCY BACKEND CRASH FIX
// This script fixes the critical syntax error that's causing 502 errors

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixBackendCrash() {
    console.log('🚨 EMERGENCY: Fixing Backend Crash Issues...\n');
    
    try {
        // 1. Fix the syntax error in heroImagesController.js
        console.log('1️⃣ Fixing syntax error in heroImagesController.js...');
        const heroControllerPath = path.join(__dirname, 'backend/controllers/heroImagesController.js');
        
        if (await fs.access(heroControllerPath).then(() => true).catch(() => false)) {
            let content = await fs.readFile(heroControllerPath, 'utf8');
            
            // Fix the stray semicolon before array destructuring
            const fixedContent = content.replace(
                /;\[shuffled\[i\], shuffled\[j\]\] = \[shuffled\[j\], shuffled\[i\]\]/g,
                '[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]'
            );
            
            if (content !== fixedContent) {
                await fs.writeFile(heroControllerPath, fixedContent, 'utf8');
                console.log('✅ Fixed syntax error in heroImagesController.js');
            } else {
                console.log('✅ No syntax errors found in heroImagesController.js');
            }
        } else {
            console.log('⚠️ heroImagesController.js not found');
        }
        
        // 2. Verify all required routes exist
        console.log('\n2️⃣ Verifying required routes...');
        const requiredRoutes = [
            'backend/routes/heroImagesRoute.js',
            'backend/routes/userRoute.js',
            'backend/routes/cartRoute.js',
            'backend/routes/wishlistRoutes.js',
            'backend/routes/checkoutRoute.js'
        ];
        
        for (const route of requiredRoutes) {
            const routePath = path.join(__dirname, route);
            if (await fs.access(routePath).then(() => true).catch(() => false)) {
                console.log(`✅ ${route} exists`);
            } else {
                console.log(`❌ ${route} missing`);
            }
        }
        
        // 3. Verify all required controllers exist
        console.log('\n3️⃣ Verifying required controllers...');
        const requiredControllers = [
            'backend/controllers/heroImagesController.js',
            'backend/controllers/userController.js',
            'backend/controllers/cartController.js',
            'backend/controllers/wishlistController.js',
            'backend/controllers/checkoutController.js'
        ];
        
        for (const controller of requiredControllers) {
            const controllerPath = path.join(__dirname, controller);
            if (await fs.access(controllerPath).then(() => true).catch(() => false)) {
                console.log(`✅ ${controller} exists`);
            } else {
                console.log(`❌ ${controller} missing`);
            }
        }
        
        // 4. Verify all required models exist
        console.log('\n4️⃣ Verifying required models...');
        const requiredModels = [
            'backend/models/productModel.js',
            'backend/models/userModel.js',
            'backend/models/orderModel.js',
            'backend/models/CheckoutSession.js',
            'backend/models/Wishlist.js'
        ];
        
        for (const model of requiredModels) {
            const modelPath = path.join(__dirname, model);
            if (await fs.access(modelPath).then(() => true).catch(() => false)) {
                console.log(`✅ ${model} exists`);
            } else {
                console.log(`❌ ${model} missing`);
            }
        }
        
        // 5. Check server.js for proper route registration
        console.log('\n5️⃣ Checking server.js route registration...');
        const serverPath = path.join(__dirname, 'backend/server.js');
        
        if (await fs.access(serverPath).then(() => true).catch(() => false)) {
            const serverContent = await fs.readFile(serverPath, 'utf8');
            
            const requiredImports = [
                'import heroImagesRouter from',
                'import userRouter from',
                'import cartRouter from',
                'import wishlistRouter from',
                'import checkoutRouter from'
            ];
            
            const requiredRoutes = [
                'app.use(\'/api/hero-images\'',
                'app.use(\'/api/user\'',
                'app.use(\'/api/cart\'',
                'app.use(\'/api/wishlist\'',
                'app.use(\'/api/checkout\''
            ];
            
            for (const import_ of requiredImports) {
                if (serverContent.includes(import_)) {
                    console.log(`✅ ${import_} found`);
                } else {
                    console.log(`❌ ${import_} missing`);
                }
            }
            
            for (const route of requiredRoutes) {
                if (serverContent.includes(route)) {
                    console.log(`✅ ${route} found`);
                } else {
                    console.log(`❌ ${route} missing`);
                }
            }
        }
        
        // 6. Check for health endpoint
        console.log('\n6️⃣ Checking health endpoint...');
        if (await fs.access(serverPath).then(() => true).catch(() => false)) {
            const serverContent = await fs.readFile(serverPath, 'utf8');
            if (serverContent.includes('app.get(\'/api/health\'')) {
                console.log('✅ Health endpoint exists');
            } else {
                console.log('❌ Health endpoint missing');
            }
        }
        
        console.log('\n🎉 Backend crash fixes completed!');
        console.log('\n📋 Next steps:');
        console.log('1. Restart your backend server');
        console.log('2. Test /api/health endpoint');
        console.log('3. Test /api/hero-images endpoint');
        console.log('4. Check logs for any remaining errors');
        
    } catch (error) {
        console.error('❌ Error fixing backend crash:', error);
    }
}

// Run the fix
fixBackendCrash();
