/**
 * Database Test Endpoint
 * Tests database connection and returns status
 */

const database = require('../models/database.js');

module.exports = async function(req, res) {
    try {
        // Test database connection
        const connectionTest = await database.testConnection();
        const status = database.getStatus();
        
        // Send success response
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        
        res.end(JSON.stringify({
            success: true,
            message: 'Database connection test',
            database: {
                connected: status.connected,
                type: status.type,
                test: connectionTest,
                status: status
            },
            timestamp: new Date().toISOString(),
            server: 'Node.js'
        }));
    } catch (error) {
        // Send error response
        res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        
        res.end(JSON.stringify({
            success: false,
            message: 'Database test failed',
            error: error.message,
            timestamp: new Date().toISOString()
        }));
    }
};

