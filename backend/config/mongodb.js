import mongoose from "mongoose";

let isConnected = false;

const connectDB = async () => {
    // Check if we are already connected
    if (isConnected) {
        console.log("MongoDB is already connected.");
        return;
    }
    
    // Prevent multiple connections during connection attempts
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        console.log("MongoDB is already connected via readyState.");
        return;
    }

    try {
        mongoose.connection.on('connected', () => {
            console.log("MongoDB Connected Successfully");
            isConnected = true;
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB Connection Error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB Disconnected.');
            isConnected = false;
        });

        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            maxPoolSize: 50,
            retryWrites: true,
        };

        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGODB_URI is not defined in the environment variables.");
        }
        
        await mongoose.connect(uri, options);
        isConnected = true;

    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        isConnected = false;
        // In production, you might want to exit the process if the DB connection fails
        // process.exit(1);
    }
};

export default connectDB;