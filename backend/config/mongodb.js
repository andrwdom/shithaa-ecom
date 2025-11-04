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
        
        // Connect with retry mechanism
        await mongoose.connect(uri, options);
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