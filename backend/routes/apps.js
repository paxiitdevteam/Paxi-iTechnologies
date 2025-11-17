/**
 * Apps API Route Handler
 * Handles app-related API requests (public endpoint)
 */

const apiRouter = require('./api-router');
const fs = require('fs');
const PMS = require('../utils/pms'); // Path Manager System

/**
 * Load apps data from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadAppsData() {
    const appsPath = PMS.backend('data', 'apps.json');
    
    if (!fs.existsSync(appsPath)) {
        console.warn('[APPS API] Apps data file not found, returning empty array');
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(appsPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[APPS API] Error loading apps data:', error);
        return [];
    }
}

/**
 * Apps API handler
 */
function appsHandler(req, res) {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(p => p);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    switch (method) {
        case 'GET':
            // Get apps list or single app
            if (pathname === '/api/apps' || pathname === '/api/apps/') {
                // List all apps
                const appsData = loadAppsData();
                apiRouter.sendSuccess(res, {
                    apps: appsData,
                    count: appsData.length
                }, 'Apps retrieved successfully');
            } else if (pathname.startsWith('/api/apps/')) {
                // Get single app by ID
                const appId = parseInt(pathParts[pathParts.length - 1]);
                const appsData = loadAppsData();
                const app = appsData.find(a => a.id === appId);
                
                if (app) {
                    apiRouter.sendSuccess(res, app, 'App retrieved successfully');
                } else {
                    apiRouter.sendError(res, {
                        message: 'App not found',
                        statusCode: 404
                    });
                }
            } else {
                apiRouter.send404(res);
            }
            break;

        default:
            apiRouter.send404(res);
    }
}

module.exports = appsHandler;

