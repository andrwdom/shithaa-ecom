import mongoose from "mongoose";

// Track if we're already attempting to reconnect to prevent multiple simultaneous attempts
let isReconnecting = false;
let eventHandlersRegistered = false;

const connectDB = async () => {
    try {
        // Get the expected database name from URI
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shitha-maternity';
        const expectedDbName = uri.split('/').pop().split('?')[0]; // Extract database name from URI
        
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            const currentDbName = mongoose.connection.db?.databaseName;
            
            // 🔍 CRITICAL: Check if we're connected to the wrong database
            if (currentDbName && currentDbName !== expectedDbName) {
                console.error(`🚨 [MongoDB] CRITICAL: Connected to wrong database!`);
                console.error(`🚨 [MongoDB] Current: ${currentDbName}`);
                console.error(`🚨 [MongoDB] Expected: ${expectedDbName}`);
                console.error(`🚨 [MongoDB] Disconnecting and reconnecting to correct database...`);
                
                // Disconnect and reconnect to the correct database
                await mongoose.disconnect();
                // Wait a moment for cleanup
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log(`MongoDB already connected to: ${currentDbName || 'unknown'}`);
                return;
            }
        }

        // Check if already connecting
        if (mongoose.connection.readyState === 2) {
            console.log("MongoDB connection already in progress");
            return;
        }

        // Register event handlers only once
        if (!eventHandlersRegistered) {
            mongoose.connection.on('connected', () => {
                console.log("MongoDB Connected Successfully");
                isReconnecting = false;
            });

            mongoose.connection.on('error', (err) => {
                console.error('MongoDB Connection Error:', err);
                isReconnecting = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.log('MongoDB Disconnected. Attempting to reconnect...');
                // Only reconnect if not already reconnecting
                if (!isReconnecting && mongoose.connection.readyState === 0) {
                    isReconnecting = true;
                    setTimeout(() => {
                        connectDB().catch(err => {
                            console.error('Reconnection attempt failed:', err);
                            isReconnecting = false;
                        });
                    }, 5000);
                }
            });
            
            eventHandlersRegistered = true;
        }

        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            maxPoolSize: 50,
            retryWrites: true,
            auth: process.env.MONGODB_USER && {
                username: process.env.MONGODB_USER,
                password: process.env.MONGODB_PASSWORD
            }
        };

        // 🔍 DEBUG: Log connection info (without credentials)
        const uriForLog = uri.replace(/\/\/.*@/, '//***@');
        console.log('🔍 [MongoDB] Connecting to:', uriForLog);
        console.log('🔍 [MongoDB] Expected database:', expectedDbName);
        console.log('🔍 [MongoDB] Using MONGODB_URI from .env:', !!process.env.MONGODB_URI);
        
        // Connect with retry mechanism
        await mongoose.connect(uri, options);
        
        // 🔍 DEBUG: Log which database we connected to
        const connectedDb = mongoose.connection.db.databaseName;
        console.log('🔍 [MongoDB] Connected to database:', connectedDb);
        
        // 🔍 CRITICAL: Verify we're connected to the correct database
        if (connectedDb !== expectedDbName) {
            console.error(`🚨 [MongoDB] CRITICAL ERROR: Connected to wrong database!`);
            console.error(`🚨 [MongoDB] Connected to: ${connectedDb}`);
            console.error(`🚨 [MongoDB] Expected: ${expectedDbName}`);
            console.error(`🚨 [MongoDB] Disconnecting and will retry...`);
            await mongoose.disconnect();
            throw new Error(`Wrong database connected: ${connectedDb} instead of ${expectedDbName}`);
        }
        
        // 🔍 DEBUG: Quick check - count products in connected database
        try {
            // Use native MongoDB driver to count products (works before models are loaded)
            const productsCollection = mongoose.connection.db.collection('products');
            const productCount = await productsCollection.countDocuments();
            console.log('🔍 [MongoDB] Products in connected database:', productCount);
            if (productCount === 0) {
                console.error('⚠️  [MongoDB] WARNING: Connected database has NO products!');
                console.error('⚠️  [MongoDB] This might be the wrong database!');
                console.error('⚠️  [MongoDB] Expected: shitha_maternity_db (has 152 products)');
            } else {
                console.log(`✅ [MongoDB] Database "${connectedDb}" has ${productCount} products - connection correct!`);
            }
        } catch (err) {
            console.error('🔍 [MongoDB] Error checking products:', err.message);
        }
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        isReconnecting = false;
        
        // Only retry if not already connected/connecting
        if (mongoose.connection.readyState === 0) {
            setTimeout(() => {
                console.log('Retrying MongoDB connection...');
                connectDB().catch(err => {
                    console.error('Retry failed:', err);
                });
            }, 5000);
        }
    }
};

export default connectDB;