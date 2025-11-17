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
            // Handle contact form submission (with or without files)
            const contentType = req.headers['content-type'] || '';
            const isMultipart = contentType.includes('multipart/form-data');
            
            if (isMultipart) {
                // Handle multipart/form-data (with files)
                handleContactFormWithFiles(req, res);
            } else {
                // Handle JSON (text-only)
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                req.on('end', () => {
                    // Use async IIFE to handle async email sending
                    (async () => {
                        try {
                            console.log('[CONTACT] Received contact form submission');
                            console.log('[CONTACT] Request body length:', body.length);
                            
                            const contactData = JSON.parse(body);
                            console.log('[CONTACT] Parsed contact data:', {
                                name: contactData.name,
                                email: contactData.email,
                                hasMessage: !!contactData.message
                            });
                        
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

                        // Save contact message to admin dashboard FIRST (before email attempt)
                        // This ensures messages are saved even if email fails
                        let savedMessage = null;
                        try {
                            console.log('[CONTACT] Saving message to admin dashboard...');
                            const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
                            savedMessage = saveContactMessage({
                                name: contactData.name,
                                email: contactData.email,
                                phone: contactData.phone || null,
                                subject: contactData.subject || 'General Inquiry',
                                message: contactData.message,
                                ipAddress: ipAddress,
                                emailSent: false // Will update to true if email succeeds
                            });
                            console.log('[CONTACT] ✅ Message saved to admin dashboard:', savedMessage.id);
                        } catch (saveError) {
                            console.error('[CONTACT] ❌ CRITICAL: Error saving message to admin dashboard:', saveError);
                            console.error('[CONTACT] Save error details:', {
                                message: saveError.message,
                                stack: saveError.stack
                            });
                            // Continue anyway - try to send email even if save failed
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

                            // Update saved message to mark email as sent
                            if (savedMessage) {
                                try {
                                    const messages = loadContactMessages();
                                    const messageIndex = messages.findIndex(m => m.id === savedMessage.id);
                                    if (messageIndex !== -1) {
                                        messages[messageIndex].emailSent = true;
                                        messages[messageIndex].emailError = null;
                                        const messagesPath = PMS.backend('data', 'contact-messages.json');
                                        fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf8');
                                        console.log('[CONTACT] ✅ Updated message to mark email as sent');
                                    }
                                } catch (updateError) {
                                    console.error('[CONTACT] ⚠️  Could not update message email status:', updateError);
                                    // Non-critical - message is already saved
                                }
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
                            
                            // Update saved message to mark email as failed (message already saved above)
                            if (savedMessage) {
                                try {
                                    const messages = loadContactMessages();
                                    const messageIndex = messages.findIndex(m => m.id === savedMessage.id);
                                    if (messageIndex !== -1) {
                                        messages[messageIndex].emailSent = false;
                                        messages[messageIndex].emailError = emailError.message;
                                        const messagesPath = PMS.backend('data', 'contact-messages.json');
                                        fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2), 'utf8');
                                        console.log('[CONTACT] ✅ Updated message to mark email as failed');
                                    }
                                } catch (updateError) {
                                    console.error('[CONTACT] ⚠️  Could not update message email status:', updateError);
                                    // Non-critical - message is already saved
                                }
                            } else {
                                // If initial save failed, try to save now (last resort)
                                try {
                                    console.log('[CONTACT] Attempting to save message (initial save failed)...');
                                    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
                                    const lastResortMessage = saveContactMessage({
                                        name: contactData.name,
                                        email: contactData.email,
                                        phone: contactData.phone || null,
                                        subject: contactData.subject || 'General Inquiry',
                                        message: contactData.message,
                                        ipAddress: ipAddress,
                                        emailSent: false,
                                        emailError: emailError.message
                                    });
                                    console.log('[CONTACT] ✅ Message saved (last resort):', lastResortMessage.id);
                                } catch (saveError) {
                                    console.error('[CONTACT] ❌ CRITICAL: Could not save message at all:', saveError);
                                }
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
            } // End else block
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

/**
 * Handle contact form with file uploads
 */
function handleContactFormWithFiles(req, res) {
    const chunks = [];
    
    req.on('data', chunk => {
        chunks.push(chunk);
    });
    
    req.on('end', () => {
        (async () => {
            try {
                const buffer = Buffer.concat(chunks);
                const body = buffer.toString('binary');
                
                // Extract boundary
                const contentType = req.headers['content-type'] || '';
                const boundary = contentType.split('boundary=')[1];
                if (!boundary) {
                    return apiRouter.sendError(res, {
                        message: 'Invalid multipart form data',
                        statusCode: 400
                    });
                }
                
                // Parse multipart data
                const parts = body.split('--' + boundary);
                
                const contactData = {
                    name: '',
                    email: '',
                    phone: '',
                    subject: '',
                    message: '',
                    files: []
                };
                
                for (const part of parts) {
                    // Extract form fields
                    if (part.includes('Content-Disposition') && !part.includes('filename=')) {
                        const nameMatch = part.match(/name="([^"]+)"/);
                        if (nameMatch) {
                            const fieldName = nameMatch[1];
                            const contentStart = part.indexOf('\r\n\r\n');
                            if (contentStart !== -1) {
                                const value = part.substring(contentStart + 4).replace(/--\r\n$/, '').trim();
                                if (fieldName in contactData) {
                                    contactData[fieldName] = value;
                                }
                            }
                        }
                    }
                    
                    // Extract files
                    if (part.includes('Content-Disposition') && part.includes('filename=')) {
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        if (filenameMatch) {
                            const filename = filenameMatch[1];
                            
                            const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
                            const fileType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
                            
                            const contentStart = part.indexOf('\r\n\r\n');
                            if (contentStart !== -1) {
                                const content = part.substring(contentStart + 4);
                                const cleanContent = content.replace(/--\r\n$/, '').trim();
                                if (cleanContent) {
                                    const fileContent = Buffer.from(cleanContent, 'binary');
                                    
                                    // Validate file size (10MB max)
                                    const maxSize = 10 * 1024 * 1024;
                                    if (fileContent.length > maxSize) {
                                        return apiRouter.sendError(res, {
                                            message: `File "${filename}" is too large. Maximum size is 10MB.`,
                                            statusCode: 400
                                        });
                                    }
                                    
                                    // Save file
                                    const uploadsDir = PMS.backend('data', 'uploads');
                                    if (!fs.existsSync(uploadsDir)) {
                                        fs.mkdirSync(uploadsDir, { recursive: true });
                                    }
                                    
                                    const fileId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                    const fileExtension = filename.split('.').pop();
                                    const savedFilename = `${fileId}.${fileExtension}`;
                                    const filePath = PMS.backend('data', 'uploads', savedFilename);
                                    
                                    fs.writeFileSync(filePath, fileContent);
                                    
                                    contactData.files.push({
                                        originalName: filename,
                                        savedName: savedFilename,
                                        size: fileContent.length,
                                        type: fileType,
                                        path: filePath,
                                        url: `/api/contact/file/${fileId}`
                                    });
                                }
                            }
                        }
                    }
                }
                
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
                
                // Prepare email content with file attachments info
                const emailSubject = `[Website Contact] ${contactData.subject || 'General Inquiry'}`;
                let emailBody = `
New contact form submission from website:

Name: ${contactData.name}
Email: ${contactData.email}
${contactData.phone ? `Phone: ${contactData.phone}` : ''}
Subject: ${contactData.subject || 'General Inquiry'}

Message:
${contactData.message}
`;
                
                if (contactData.files.length > 0) {
                    emailBody += `\n\nAttached Files (${contactData.files.length}):\n`;
                    contactData.files.forEach((file, index) => {
                        emailBody += `${index + 1}. ${file.originalName} (${(file.size / 1024).toFixed(2)} KB)\n`;
                        emailBody += `   Download: ${req.headers.host}${file.url}\n`;
                    });
                }
                
                emailBody += `
---
Submitted: ${new Date().toLocaleString()}
IP Address: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown'}
                `.trim();
                
                // Save message to JSON file
                const messageData = {
                    name: contactData.name,
                    email: contactData.email,
                    phone: contactData.phone || '',
                    subject: contactData.subject || 'General Inquiry',
                    message: contactData.message,
                    files: contactData.files.map(f => ({
                        originalName: f.originalName,
                        savedName: f.savedName,
                        size: f.size,
                        type: f.type,
                        url: f.url
                    }))
                };
                const savedMessage = saveContactMessage(messageData);
                
                // Send email via SMTP (if in production/NAS)
                if (isProduction) {
                    try {
                        const transporter = nodemailer.createTransport({
                            host: smtpHost,
                            port: smtpPort,
                            secure: false,
                            tls: {
                                rejectUnauthorized: false
                            }
                        });
                        
                        const mailOptions = {
                            from: `"${contactData.name}" <${contactData.email}>`,
                            to: 'contact@paxiit.com',
                            replyTo: contactData.email,
                            subject: emailSubject,
                            text: emailBody
                        };
                        
                        await transporter.sendMail(mailOptions);
                        console.log('[CONTACT] ✅ Email sent successfully via SMTP');
                    } catch (emailError) {
                        console.error('[CONTACT] ❌ Error sending email:', emailError);
                        // Don't fail the request if email fails - message is still saved
                    }
                } else {
                    console.log('[CONTACT] ⚠️  Local dev environment - email not sent (would send in production)');
                }
                
                // Return success
                apiRouter.sendSuccess(res, {
                    messageId: savedMessage.id,
                    filesUploaded: contactData.files.length
                }, 'Message sent successfully');
                
            } catch (error) {
                console.error('[CONTACT] Error processing contact form with files:', error);
                apiRouter.sendError(res, {
                    message: 'Error processing contact form',
                    error: error.message,
                    statusCode: 500
                });
            }
        })();
    });
}

// Export functions for admin dashboard
module.exports = contactHandler;
module.exports.loadContactMessages = loadContactMessages;

