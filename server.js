/**
 * Development Server - Node.js
 * Serves frontend files and handles API requests
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Path Manager System (PMS) - SINGLE SOURCE OF TRUTH
class ServerPathManager {
    constructor() {
        this.basePath = __dirname;
        this.initialize();
    }

    initialize() {
        this.paths = {
            root: this.basePath,
            frontend: {
                root: path.join(this.basePath, 'frontend'),
                src: path.join(this.basePath, 'frontend', 'src'),
                pages: path.join(this.basePath, 'frontend', 'src', 'pages'),
                components: path.join(this.basePath, 'frontend', 'src', 'components'),
                services: path.join(this.basePath, 'frontend', 'src', 'services'),
                assets: path.join(this.basePath, 'frontend', 'src', 'assets')
            },
            backend: {
                root: path.join(this.basePath, 'backend'),
                config: path.join(this.basePath, 'backend', 'config'),
                models: path.join(this.basePath, 'backend', 'models'),
                routes: path.join(this.basePath, 'backend', 'routes')
            },
            shared: {
                root: path.join(this.basePath, 'shared'),
                constants: path.join(this.basePath, 'shared', 'constants'),
                utils: path.join(this.basePath, 'shared', 'utils')
            }
        };
    }

    get(category, ...subPaths) {
        if (!this.paths[category]) {
            return null;
        }
        
        if (typeof this.paths[category] === 'string') {
            return path.join(this.paths[category], ...subPaths);
        }
        
        if (subPaths.length === 0) {
            return this.paths[category];
        }
        
        const [first, ...rest] = subPaths;
        if (this.paths[category][first]) {
            return path.join(this.paths[category][first], ...rest);
        }
        
        return path.join(this.paths[category].root || this.paths[category], ...subPaths);
    }

    frontend(...subPaths) {
        return this.get('frontend', ...subPaths);
    }

    backend(...subPaths) {
        return this.get('backend', ...subPaths);
    }

    shared(...subPaths) {
        return this.get('shared', ...subPaths);
    }

    resolve(relativePath) {
        if (path.isAbsolute(relativePath)) {
            return relativePath;
        }
        return path.join(this.basePath, relativePath);
    }
}

// Create PMS instance for server - SINGLE SOURCE OF TRUTH
const PMS = new ServerPathManager();

const config = {
    port: process.env.PORT || 8000,
    host: process.env.HOST || '0.0.0.0',
    frontendPath: PMS.frontend('src'),
    backendPath: PMS.backend(),
    enableCORS: true,
    corsOrigin: '*',
    enableLogging: true
};

// Verify PMS paths on startup
console.log('='.repeat(50));
console.log('🔍 Path Manager System (PMS) Verification');
console.log('='.repeat(50));
console.log(`📁 Base path: ${PMS.basePath}`);
console.log(`📁 Frontend root: ${PMS.frontend('root') || PMS.get('frontend', 'root')}`);
console.log(`📁 Frontend src: ${PMS.frontend('src')}`);
console.log(`📁 Backend root: ${PMS.backend('root') || PMS.get('backend', 'root')}`);
console.log(`📁 Backend routes: ${PMS.backend('routes')}`);
console.log('='.repeat(50));

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
};

/**
 * Get MIME type for file extension
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Serve static file
 */
function serveFile(filePath, res) {
    if (res.headersSent) {
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (!res.headersSent) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
            }
            return;
        }

        if (!res.headersSent) {
            const mimeType = getMimeType(filePath);
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        }
    });
}

/**
 * Handle API requests
 */
function handleAPI(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS headers
    if (config.enableCORS) {
        const origin = config.corsOrigin === '*' ? '*' : config.corsOrigin;
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (origin !== '*') {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API routes - ALL PATHS USE PMS
    if (pathname.startsWith('/api/')) {
        // Use PMS to get backend routes path
        handleSimpleAPI(req, res, parsedUrl, pathname);
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
}

/**
 * Simple API handler - ALL PATHS USE PMS
 */
function handleSimpleAPI(req, res, parsedUrl, pathname) {
    const endpoint = pathname.replace('/api/', '');
    const endpointParts = endpoint.split('/');
    
    // Try to find route handler - check nested routes first (e.g., admin/login -> admin.js)
    // ALL PATHS USE PMS - NO DIRECT PATH OPERATIONS
    let routePath = null;
    let routeHandler = null;
    
    // For admin routes, ALWAYS try admin.js first (most common case) - USE PMS
    if (endpoint.startsWith('admin')) {
        const adminPath = PMS.backend('routes', 'admin.js');
        if (fs.existsSync(adminPath)) {
            routePath = adminPath;
            if (config.enableLogging) {
                console.log(`[API] ✅ Admin route detected, using PMS: ${routePath}`);
            }
        }
    }
    
    // If not admin or admin.js not found, try exact match (e.g., admin/login.js) - USE PMS
    if (!routePath) {
        const exactPath = PMS.backend('routes', `${endpoint}.js`);
        if (fs.existsSync(exactPath)) {
            routePath = exactPath;
        }
    }
    
    // If exact match doesn't exist, try parent route (e.g., admin.js for admin/login) - USE PMS
    if (!routePath && endpointParts.length > 1) {
        const parentRoute = endpointParts[0]; // e.g., 'admin' from 'admin/login'
        const parentPath = PMS.backend('routes', `${parentRoute}.js`);
        if (fs.existsSync(parentPath)) {
            routePath = parentPath;
        }
    }
    
    // Debug logging (only if enabled)
    if (config.enableLogging) {
        console.log(`[API] Route: ${endpoint} -> ${routePath || 'NOT FOUND'}`);
        if (!routePath) {
            const routesDir = PMS.backend('routes');
            console.log(`[API] Routes directory: ${routesDir}`);
            console.log(`[API] Looking for: ${PMS.backend('routes', `${endpoint}.js`)}`);
        }
    }
    
    if (routePath && fs.existsSync(routePath)) {
        try {
            // For admin.js, NEVER clear cache to preserve sessions object
            // For other routes, clear cache to allow hot reloading
            const resolvedPath = require.resolve(routePath);
            const isAdminRoute = routePath.includes('admin.js');
            
            if (!isAdminRoute) {
                // Clear cache for non-admin routes to allow hot reloading
                delete require.cache[resolvedPath];
            }
            // Always use require() - it will use cached version if available
            // For admin.js, cache is never cleared, so sessions persist
            routeHandler = require(routePath);
            
            if (typeof routeHandler === 'function') {
                routeHandler(req, res);
                return;
            } else if (routeHandler.handler) {
                routeHandler.handler(req, res);
                return;
            } else {
                throw new Error('Invalid route handler');
            }
        } catch (error) {
            if (config.enableLogging) {
                console.error(`[API] Error loading route handler:`, error.message);
            }
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false,
                error: 'Internal server error', 
                message: error.message
            }));
            return;
        }
    } else {
        // Log route not found (only if logging enabled) - USE PMS FOR PATHS
        if (config.enableLogging && endpoint.startsWith('admin')) {
            const routesDir = PMS.backend('routes');
            const adminPath = PMS.backend('routes', 'admin.js');
            console.error(`[API] Admin route not found: ${endpoint}`);
            console.error(`[API] Routes dir (PMS): ${routesDir}`);
            console.error(`[API] Admin path (PMS): ${adminPath}`);
            console.error(`[API] Admin path exists: ${fs.existsSync(adminPath)}`);
        }
        
        // Test endpoint - always available (built-in, no file needed)
        if (endpoint === 'test' || endpoint === 'health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'API connection test successful',
                endpoint: endpoint,
                method: req.method,
                timestamp: new Date().toISOString(),
                server: 'Node.js',
                version: process.version,
                pms: 'Path Manager System active',
                backendPath: PMS.backend(),
                routesPath: PMS.backend('routes')
            }));
        } else {
            // 404 - Route not found
            if (config.enableLogging) {
                const routesDir = PMS.backend('routes');
                const expectedPath = PMS.backend('routes', `${endpoint}.js`);
                console.error(`[API] ❌ Route not found: ${endpoint}`);
                console.error(`[API] Expected path: ${expectedPath}`);
                console.error(`[API] Path exists: ${fs.existsSync(expectedPath)}`);
                console.error(`[API] Routes directory exists: ${fs.existsSync(routesDir)}`);
                if (fs.existsSync(routesDir)) {
                    try {
                        const routes = fs.readdirSync(routesDir);
                        console.error(`[API] Available routes: ${routes.join(', ')}`);
                    } catch (e) {
                        console.error(`[API] Cannot read routes directory: ${e.message}`);
                    }
                }
            }
            
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'API endpoint not found',
                endpoint: endpoint,
                method: req.method,
                timestamp: new Date().toISOString(),
                debug: config.enableLogging ? {
                    expectedPath: PMS.backend('routes', `${endpoint}.js`),
                    routesPath: PMS.backend('routes'),
                    routesDirExists: fs.existsSync(PMS.backend('routes'))
                } : undefined
            }));
        }
    }
}

/**
 * Resolve file path - ALL PATHS USE PMS
 */
function resolveFilePath(requestPath) {
    const cleanPath = requestPath.split('?')[0];
    
    if (cleanPath === '/' || cleanPath === '') {
        return null;
    }

    let relativePath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
    
    // Handle /pages/ prefix - strip it since pages are in frontend/src/pages/
    if (relativePath.startsWith('pages/')) {
        relativePath = relativePath.replace(/^pages\//, '');
    }
    
    // Determine if this is a static asset request (services, components, assets, cls)
    const isStaticAsset = relativePath.startsWith('services/') || 
                          relativePath.startsWith('components/') || 
                          relativePath.startsWith('assets/') || 
                          relativePath.startsWith('cls/');
    
    // For static assets, check frontend/src FIRST
    // For HTML pages, check pages directory FIRST
    if (isStaticAsset) {
        // CRITICAL: Try frontend/src directory FIRST for static assets
        // This handles /services/, /components/, /assets/, /cls/ paths
        let filePath = PMS.frontend('src', relativePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return filePath;
        }
    } else {
        // For HTML pages, try pages directory FIRST - USE PMS
        let filePath = PMS.frontend('pages', relativePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return filePath;
        }

        // Try with .html extension in pages - USE PMS
        filePath = PMS.frontend('pages', relativePath + '.html');
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return filePath;
        }
    }
    
    // If not found in priority location, try the other location
    let filePath;
    if (!isStaticAsset) {
        // Try frontend/src directory for non-HTML files
        filePath = PMS.frontend('src', relativePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return filePath;
        }
    } else {
        // Try pages directory as fallback for static assets (unlikely but possible)
        filePath = PMS.frontend('pages', relativePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return filePath;
        }
    }

    // Try root directory as last resort - USE PMS
    filePath = PMS.resolve(relativePath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return filePath;
    }

    return null;
}

/**
 * Request handler
 */
function requestHandler(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Logging
    if (config.enableLogging) {
        console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
    }

    if (pathname === '/' || pathname === '') {
        const srcIndexPath = PMS.frontend('src', 'index.html');
        
        if (fs.existsSync(srcIndexPath)) {
            try {
                const data = fs.readFileSync(srcIndexPath);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
                return;
            } catch (e) {
                console.error('Error reading index:', e.message);
            }
        }
        
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<!DOCTYPE html><html><head><title>404</title></head><body><h1>404 - Homepage Not Found</h1></body></html>');
        return;
    }

    // Handle API requests - after root check
    if (pathname.startsWith('/api/')) {
        handleAPI(req, res);
        return;
    }

    // Serve static files
    const filePath = resolveFilePath(pathname);
    
    if (config.enableLogging && pathname !== '/favicon.ico') {
        console.log(`[RESOLVE] Pathname: ${pathname} -> Resolved: ${filePath || 'NULL'}`);
    }
    
    if (filePath && fs.existsSync(filePath)) {
        try {
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                if (config.enableLogging && pathname !== '/favicon.ico') {
                    console.log(`[SERVE] ✅ Serving file: ${filePath}`);
                }
                serveFile(filePath, res);
                return;
            } else {
                if (config.enableLogging) {
                    console.error(`[SERVE] ❌ Path exists but is not a file: ${filePath}`);
                }
            }
        } catch (e) {
            if (config.enableLogging) {
                console.error(`[SERVE] ❌ Error accessing file: ${filePath}`, e.message);
            }
        }
    }
    
    if (!res.headersSent) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html><html><head><title>404</title></head><body><h1>404 - Not Found</h1><p>${pathname}</p><p><a href="/">Home</a></p></body></html>`);
    }
}

/**
 * Create and start server
 */
function startServer() {
    const server = http.createServer(requestHandler);

    server.listen(config.port, config.host, () => {
        console.log('='.repeat(50));
        console.log('🚀 Development Server Started');
        console.log('='.repeat(50));
        console.log(`📍 Server running at: http://${config.host}:${config.port}`);
        console.log(`📁 Frontend path: ${PMS.frontend('src')}`);
        console.log(`🔧 Backend path: ${PMS.backend()}`);
        console.log(`🌐 CORS: ${config.enableCORS ? 'Enabled' : 'Disabled'}`);
        console.log(`📝 Logging: ${config.enableLogging ? 'Enabled' : 'Disabled'}`);
        console.log(`✅ Path Manager System (PMS): Active`);
        console.log('='.repeat(50));
        console.log('Press Ctrl+C to stop the server');
        console.log('='.repeat(50));
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${config.port} is already in use.`);
            console.error(`   Stop the other process or use: PORT=8001 npm start`);
        } else {
            console.error('❌ Server error:', err);
        }
        process.exit(1);
    });
}

// Start server
startServer();

