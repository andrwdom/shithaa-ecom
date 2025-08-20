import Contact from '../models/Contact.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const submitContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        if (!name || !email || !subject || !message) {
            return errorResponse(res, 400, 'Missing required fields: name, email, subject, message');
        }
        
        // Basic email validation
        if (!email.includes('@')) {
            return errorResponse(res, 400, 'Please enter a valid email address');
        }
        
        const contact = new Contact({
            name,
            email,
            phone: phone || '', // Make phone optional
            subject,
            message
        });
        
        await contact.save();
        
        // Here you can add email sending logic if needed
        // Example: await sendContactEmail(contact);
        
        successResponse(res, null, 'Contact form submitted successfully', 201);
    } catch (error) {
        console.error('Contact Submission Error:', error);
        errorResponse(res, 500, 'Failed to submit contact form');
    }
}; 