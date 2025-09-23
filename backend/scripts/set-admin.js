import mongoose from 'mongoose';
import { config } from '../config.js';
import userModel from '../models/userModel.js';
import connectDB from '../config/mongodb.js';

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address as an argument');
    process.exit(1);
}

async function setAdmin() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        let user = await userModel.findOne({ email });
        if (!user) {
            // console.log('User not found, creating new admin user...');
            user = new userModel({
                name: 'Admin User',
                email: email,
                isAdmin: true
            });
        } else {
            user.isAdmin = true;
        }
        await user.save();
        console.log(`Successfully set ${email} as admin`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

setAdmin();
