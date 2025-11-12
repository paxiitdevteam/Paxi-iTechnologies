/**
 * Example API Route Handler
 * Template for creating new API route handlers
 */

const apiRouter = require('./api-router');
const apiConfig = require('../config/api-config');

/**
 * Example: Users API handler
 */
function usersHandler(req, res) {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    switch (method) {
        case 'GET':
            if (pathname === '/api/users') {
                // List users
                apiRouter.sendSuccess(res, {
                    users: [
                        { id: 1, name: 'John Doe', email: 'john@example.com' },
                        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
                    ]
                }, 'Users retrieved successfully');
            } else {
                // Get single user
                const userId = pathname.split('/').pop();
                apiRouter.sendSuccess(res, {
                    id: userId,
                    name: 'John Doe',
                    email: 'john@example.com'
                }, 'User retrieved successfully');
            }
            break;

        case 'POST':
            // Create user
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const userData = JSON.parse(body);
                    apiRouter.sendSuccess(res, {
                        id: Date.now(),
                        ...userData
                    }, 'User created successfully', 201);
                } catch (error) {
                    apiRouter.sendError(res, {
                        message: 'Invalid JSON data',
                        statusCode: 400
                    });
                }
            });
            break;

        case 'PUT':
        case 'PATCH':
            // Update user
            let updateBody = '';
            req.on('data', chunk => {
                updateBody += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const userData = JSON.parse(updateBody);
                    const userId = pathname.split('/').pop();
                    apiRouter.sendSuccess(res, {
                        id: userId,
                        ...userData
                    }, 'User updated successfully');
                } catch (error) {
                    apiRouter.sendError(res, {
                        message: 'Invalid JSON data',
                        statusCode: 400
                    });
                }
            });
            break;

        case 'DELETE':
            // Delete user
            const userId = pathname.split('/').pop();
            apiRouter.sendSuccess(res, null, 'User deleted successfully');
            break;

        default:
            apiRouter.send404(res);
    }
}

/**
 * Example: Contact API handler
 */
function contactHandler(req, res) {
    if (req.method !== 'POST') {
        return apiRouter.send404(res);
    }

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

            // Process contact form (here you would save to database, send email, etc.)
            apiRouter.sendSuccess(res, {
                id: Date.now(),
                ...contactData,
                status: 'received'
            }, 'Contact message received successfully', 201);
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Invalid JSON data',
                statusCode: 400
            });
        }
    });
}

// Register handlers
apiRouter.registerRoute('users', 'list', usersHandler);
apiRouter.registerRoute('users', 'get', usersHandler);
apiRouter.registerRoute('users', 'create', usersHandler);
apiRouter.registerRoute('users', 'update', usersHandler);
apiRouter.registerRoute('users', 'delete', usersHandler);

apiRouter.registerRoute('contact', 'send', contactHandler);

module.exports = {
    usersHandler,
    contactHandler
};

