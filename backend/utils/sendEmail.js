import nodemailer from 'nodemailer';
import { config } from '../config.js';

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: true, // true for 465, false for other ports
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
        },
    });

    const mailOptions = {
        from: `"${config.smtp.from_name}" <${config.smtp.from_email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent');
    }
};

export default sendEmail;
