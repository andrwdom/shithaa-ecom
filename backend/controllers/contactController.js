import Contact from '../models/Contact.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const submitContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        if (!name || !email || !subject || !message) {
            return errorResponse(res, 'Missing required fields: name, email, subject, message', 400);
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return errorResponse(res, 'Please enter a valid email address', 400);
        }
        
        const contact = new Contact({
            name,
            email,
            phone,
            subject,
            message
        });
        
        await contact.save();
        
        // Here you can add email sending logic if needed
        // Example: await sendContactEmail(contact);
        
        successResponse(res, null, 'Contact form submitted successfully', 201);
    } catch (error) {
        console.error('Contact Submission Error:', error);
        errorResponse(res, 'Failed to submit contact form');
    }
}; 