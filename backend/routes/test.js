/**
 * Test API Route Handler
 * Simple test endpoint to verify frontend-backend connection
 */

/**
 * Test endpoint handler - Direct implementation (no API router dependency)
 */
function testHandler(req, res) {
    const method = req.method;

    // CORS headers - MUST be set first
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Handle GET request
    if (method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Backend connection successful!',
            method: 'GET',
            endpoint: '/api/test',
            timestamp: new Date().toISOString(),
            server: 'Node.js',
            nodeVersion: process.version,
            status: 'connected'
        }));
        return;
    }

    // Handle POST request
    if (method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Backend received POST data successfully!',
                    method: 'POST',
                    endpoint: '/api/test',
                    receivedData: data,
                    timestamp: new Date().toISOString(),
                    server: 'Node.js',
                    status: 'connected'
                }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: 'Invalid JSON in request body',
                    error: error.message
                }));
            }
        });
        return;
    }

    // Handle other methods
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: false,
        message: 'Method not allowed',
        allowedMethods: ['GET', 'POST', 'OPTIONS']
    }));
}

// Export handler
module.exports = testHandler;
module.exports.handler = testHandler;

