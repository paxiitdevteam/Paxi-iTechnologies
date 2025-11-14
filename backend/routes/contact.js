/**
 * Contact API Route Handler
 * Handles contact form submissions
 * Sends emails directly to Roundcube webmail via Mail Station SMTP
 */

const apiRouter = require('./api-router');
const nodemailer = require('nodemailer');
const os = require('os');
const fs = require('fs');
const PMS = require('../utils/pms'); // Path Manager System - SINGLE SOURCE OF TRUTH

// Detect environment - check if running on NAS (production) or local dev
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.NAS_ENV === 'true' ||
                     os.hostname().toLowerCase().includes('nas') ||
                     process.env.SMTP_HOST !== undefined;

// SMTP Configuration
// In production (NAS): localhost = NAS server (Mail Station SMTP available)
// In local dev (Windows PC): localhost = Windows PC (no SMTP server - emails won't send)
const smtpHost = process.env.SMTP_HOST || 'localhost';
const smtpPort = parseInt(process.env.SMTP_PORT || '25');

console.log(`[Contact API] Environment: ${isProduction ? 'PRODUCTION (NAS)' : 'LOCAL DEV (Windows PC)'}`);
console.log(`[Contact API] SMTP Host: ${smtpHost}:${smtpPort}`);
if (!isProduction) {
    console.log(`[Contact API] ⚠️  WARNING: Running in LOCAL DEV - emails will NOT send (no SMTP server on Windows PC)`);
    console.log(`[Contact API] ⚠️  This is EXPECTED behavior. Emails will work in production (NAS).`);
}

// Configure SMTP transporter for Mail Station/Roundcube
const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: false, // Mail Station typically uses port 25 (non-SSL)
    tls: {
        rejectUnauthorized: false // For localhost SMTP
    },
    connectionTimeout: 10000, // 10 seconds timeout
    greetingTimeout: 5000, // 5 seconds greeting timeout
    socketTimeout: 10000, // 10 seconds socket timeout
    // Retry options for better reliability
    pool: false,
    maxConnections: 1,
    maxMessages: 1
});

/**
 * Escape HTML to prevent XSS in email content
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Load contact messages from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadContactMessages() {
    const messagesPath = PMS.backend('data', 'contact-messages.json');
    
    if (!fs.existsSync(messagesPath)) {
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(messagesPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[CONTACT] Error loading contact messages:', error);
        return [];
    }
}

/**
 * Save contact messages to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveContactMessage(messageData) {
    const messagesPath = PMS.backend('data', 'contact-messages.json');
    const dataDir = PMS.backend('data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    try {
        const messages = loadContactMessages();
        
        // Add new message with ID and timestamp
        const newMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...messageData,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        messages.unshift(newMessage); // Add to beginning (most recent first)
        
        // Keep only last 1000 messages to prevent file from growing too large
        const limitedMessages = messages.slice(0, 1000);
        
        fs.writeFileSync(messagesPath, JSON.stringify(limitedMessages, null, 2), 'utf8');
        
        return newMessage;
    } catch (error) {
        console.error('[CONTACT] Error saving contact message:', error);
        throw error;
    }
}

/**
 * Contact API handler
 */
function contactHandler(req, res) {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    switch (method) {
        case 'POST':
            // Handle contact form submission
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                // Use async IIFE to handle async email sending
                (async () => {
                    try {
                        const contactData = JSON.parse(body);
                        
                        // Validate required fields
                        if (!contactData.name || !contactData.email || !contactData.message) {
                            return apiRouter.sendError(res, {
                                message: 'Missing required fields',
                                errors: {
                                    name: !contactData.name ? 'Name is required' : null,
                                    email: !contactData.email ? 'Email is required' : null,
                                    message: !contactData.message ? 'Message is required' : null
                                },
                                statusCode: 400
                            });
                        }

                        // Validate email format
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(contactData.email)) {
                            return apiRouter.sendError(res, {
                                message: 'Invalid email format',
                                errors: {
                                    email: 'Please enter a valid email address'
                                },
                                statusCode: 400
                            });
                        }

                        // Prepare email content for Roundcube webmail
                        const emailSubject = `[Website Contact] ${contactData.subject || 'General Inquiry'}`;
                        const emailBody = `
New contact form submission from website:

Name: ${contactData.name}
Email: ${contactData.email}
${contactData.phone ? `Phone: ${contactData.phone}` : ''}
Subject: ${contactData.subject || 'General Inquiry'}

Message:
${contactData.message}

---
Submitted: ${new Date().toLocaleString()}
IP Address: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown'}
                        `.trim();

                        // Send email directly to Roundcube webmail inbox
                        try {
                            // Use system email as sender (required for SMTP authentication)
                            // Reply-To contains submitter's email for easy replies
                            const systemEmail = 'website@paxiit.com'; // System sender email
                            const recipientEmail = 'contact@paxiit.com'; // Roundcube inbox
                            
                            // Escape user input to prevent XSS in email
                            const safeName = escapeHtml(contactData.name);
                            const safeEmail = escapeHtml(contactData.email);
                            const safePhone = contactData.phone ? escapeHtml(contactData.phone) : '';
                            const safeSubject = escapeHtml(contactData.subject || 'General Inquiry');
                            const safeMessage = escapeHtml(contactData.message).replace(/\n/g, '<br>');
                            
                            const mailOptions = {
                                from: `"Website Contact Form" <${systemEmail}>`,
                                to: recipientEmail, // Goes directly to Roundcube inbox
                                replyTo: `"${safeName}" <${contactData.email}>`, // Reply goes back to sender
                                subject: emailSubject,
                                text: emailBody,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">New Contact Form Submission</h2>
                                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                            <p style="margin: 5px 0;"><strong>Name:</strong> ${safeName}</p>
                                            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${contactData.email}" style="color: #4CAF50;">${safeEmail}</a></p>
                                            ${safePhone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${safePhone}">${safePhone}</a></p>` : ''}
                                            <p style="margin: 5px 0;"><strong>Subject:</strong> ${safeSubject}</p>
                                        </div>
                                        <div style="background-color: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                                            <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
                                            <p style="white-space: pre-wrap; line-height: 1.6;">${safeMessage}</p>
                                        </div>
                                        <div style="background-color: #e8f5e9; padding: 10px; border-radius: 5px; margin-top: 20px;">
                                            <p style="margin: 5px 0; font-size: 12px; color: #666;">
                                                <strong>Submitted:</strong> ${new Date().toLocaleString()}<br>
                                                <strong>IP Address:</strong> ${escapeHtml(req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown')}
                                            </p>
                                        </div>
                                        <p style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
                                            This email was sent from the website contact form. Click "Reply" to respond directly to ${safeName}.
                                        </p>
                                    </div>
                                `,
                                // Add proper headers for better email delivery
                                headers: {
                                    'X-Mailer': 'Paxiit Website Contact Form',
                                    'X-Priority': '1',
                                    'Importance': 'high',
                                    'Message-ID': `<contact-${Date.now()}@paxiit.com>`
                                }
                            };

                            // Send email via Mail Station SMTP
                            await transporter.sendMail(mailOptions);
                            
                            console.log('✅ Contact form email sent to Roundcube:');
                            console.log('   To:', recipientEmail);
                            console.log('   From:', systemEmail);
                            console.log('   Reply-To:', contactData.email);
                            console.log('   Subject:', emailSubject);
                            console.log('   Environment:', isProduction ? 'PRODUCTION' : 'LOCAL DEV');
                            console.log('   SMTP:', `${smtpHost}:${smtpPort}`);

                            // Save contact message to admin dashboard
                            try {
                                const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
                                saveContactMessage({
                                    name: contactData.name,
                                    email: contactData.email,
                                    phone: contactData.phone || null,
                                    subject: contactData.subject || 'General Inquiry',
                                    message: contactData.message,
                                    ipAddress: ipAddress,
                                    emailSent: true
                                });
                            } catch (saveError) {
                                console.error('[CONTACT] Error saving message to admin dashboard:', saveError);
                                // Don't fail the request if saving fails
                            }

                            // Return success - email sent to Roundcube
                            apiRouter.sendSuccess(res, {
                                message: 'Your message has been sent successfully. We will respond via email soon.',
                                emailSent: true,
                                recipient: 'contact@paxiit.com'
                            }, 'Message sent successfully to Roundcube webmail. We will get back to you soon!', 201);

                        } catch (emailError) {
                            // Detailed error logging for debugging
                            console.error('❌ Error sending contact form email:');
                            console.error('   Error Code:', emailError.code);
                            console.error('   Error Message:', emailError.message);
                            console.error('   SMTP Host:', smtpHost);
                            console.error('   SMTP Port:', smtpPort);
                            console.error('   Environment:', isProduction ? 'PRODUCTION' : 'LOCAL DEV');
                            
                            if (!isProduction) {
                                console.error('   ⚠️  This is EXPECTED in local dev - no SMTP server on Windows PC');
                                console.error('   ✅ Emails will work correctly in production (NAS)');
                            } else {
                                console.error('   ⚠️  This is UNEXPECTED in production - check Mail Station SMTP configuration');
                            }
                            
                            // Save contact message to admin dashboard even if email failed
                            try {
                                const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
                                saveContactMessage({
                                    name: contactData.name,
                                    email: contactData.email,
                                    phone: contactData.phone || null,
                                    subject: contactData.subject || 'General Inquiry',
                                    message: contactData.message,
                                    ipAddress: ipAddress,
                                    emailSent: false,
                                    emailError: emailError.message
                                });
                            } catch (saveError) {
                                console.error('[CONTACT] Error saving message to admin dashboard:', saveError);
                                // Don't fail the request if saving fails
                            }
                            
                            // Still return success to user, but log the error
                            // Email might fail but we don't want to show error to user
                            apiRouter.sendSuccess(res, {
                                message: 'Your message has been received. We will get back to you soon.',
                                emailSent: false,
                                error: isProduction ? 'Email delivery failed - check server logs' : 'Email delivery failed (expected in local dev - will work in production)',
                                environment: isProduction ? 'production' : 'local-dev'
                            }, 'Message received. We will get back to you soon!', 201);
                        }
                    } catch (error) {
                        apiRouter.sendError(res, {
                            message: 'Invalid JSON data',
                            statusCode: 400
                        });
                    }
                })(); // End async IIFE
            });
            break;

        case 'GET':
            // Return contact information
            apiRouter.sendSuccess(res, {
                address: '49 AVE LUCIE AUBRAC, BONNEUIL-SUR-MARNE, VAL DE MARNE 94380, FRANCE',
                phone: '+33 7 82 39 13 11',
                email: 'contact@paxiit.com',
                hours: 'Monday - Friday: 9:00 AM - 6:00 PM',
                timezone: 'CET'
            }, 'Contact information retrieved successfully');
            break;

        default:
            apiRouter.send404(res);
    }
}

// Export functions for admin dashboard
module.exports = contactHandler;
module.exports.loadContactMessages = loadContactMessages;

