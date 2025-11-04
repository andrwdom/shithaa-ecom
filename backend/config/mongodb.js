import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log("MongoDB Connected Successfully");
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB Connection Error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB Disconnected. Attempting to reconnect...');
        });

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
        // Retry connection after 5 seconds
        setTimeout(() => {
            console.log('Retrying MongoDB connection...');
            connectDB();
        }, 5000);
    }
};

export default connectDB;