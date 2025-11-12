/**
 * Contact API Route Handler
 * Handles contact form submissions
 */

const apiRouter = require('./api-router');

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

                    // Process contact form (here you would save to database, send email, etc.)
                    const contactSubmission = {
                        id: Date.now(),
                        name: contactData.name,
                        email: contactData.email,
                        phone: contactData.phone || null,
                        subject: contactData.subject || 'General Inquiry',
                        message: contactData.message,
                        status: 'received',
                        timestamp: new Date().toISOString()
                    };

                    // TODO: Save to database, send email notification, etc.
                    console.log('Contact form submission:', contactSubmission);

                    apiRouter.sendSuccess(res, contactSubmission, 'Contact message received successfully. We will get back to you soon!', 201);
                } catch (error) {
                    apiRouter.sendError(res, {
                        message: 'Invalid JSON data',
                        statusCode: 400
                    });
                }
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

module.exports = contactHandler;

