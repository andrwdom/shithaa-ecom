import mongoose from "mongoose";

// Track if we're already attempting to reconnect to prevent multiple simultaneous attempts
let isReconnecting = false;
let eventHandlersRegistered = false;

const connectDB = async () => {
    try {
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            console.log("MongoDB already connected");
            return;
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

        // Construct MongoDB URI based on environment
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shitha-maternity';
        
        // 🔍 DEBUG: Log connection info (without credentials)
        const uriForLog = uri.replace(/\/\/.*@/, '//***@');
        console.log('🔍 [MongoDB] Connecting to:', uriForLog);
        console.log('🔍 [MongoDB] Using MONGODB_URI from .env:', !!process.env.MONGODB_URI);
        
        // Connect with retry mechanism
        await mongoose.connect(uri, options);
        
        // 🔍 DEBUG: Log which database we connected to
        const connectedDb = mongoose.connection.db.databaseName;
        console.log('🔍 [MongoDB] Connected to database:', connectedDb);
        
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
                console.log('✅ [MongoDB] Database has products, connection looks correct!');
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