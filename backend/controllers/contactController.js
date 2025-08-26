import Contact from '../models/Contact.js';
import { successResponse, errorResponse } from '../utils/response.js';
import sendEmail from '../utils/sendEmail.js';
import { config } from '../config.js';

export const submitContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        
        if (!name || !email || !subject || !message) {
            return errorResponse(res, 400, 'Missing required fields: name, email, subject, message');
        }
        
        if (!email.includes('@')) {
            return errorResponse(res, 400, 'Please enter a valid email address');
        }
        
        const contact = new Contact({
            name,
            email,
            phone: phone || '',
            subject,
            message
        });
        
        await contact.save();
        
        // --- Send Email Notifications ---
        try {
            // 1. Email to support team
            const supportEmailHtml = `
                <h1>New Contact Form Submission</h1>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `;
            await sendEmail({
                to: config.smtp.support_email,
                subject: `New Contact Form Inquiry: ${subject}`,
                html: supportEmailHtml,
            });

            // 2. Confirmation email to the user
            const userConfirmationHtml = `
                <h1>Thank You for Contacting Us!</h1>
                <p>Hi ${name},</p>
                <p>We have received your message and will get back to you within 24 hours. Here is a copy of your submission:</p>
                <hr>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p>Best regards,</p>
                <p>The Shithaa Team</p>
            `;
            await sendEmail({
                to: email,
                subject: 'We have received your message | Shithaa',
                html: userConfirmationHtml,
            });

        } catch (emailError) {
            console.error('Failed to send contact emails:', emailError);
            // Don't block the response for email failure, but log it.
            // The data is already saved to the DB.
        }
        
        successResponse(res, null, 'Contact form submitted successfully', 201);
    } catch (error) {
        console.error('Contact Submission Error:', error);
        errorResponse(res, 500, 'Failed to submit contact form');
    }
}; 