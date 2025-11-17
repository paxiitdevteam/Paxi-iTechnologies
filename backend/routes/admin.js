/**
 * Admin API Route Handler
 * Handles admin dashboard API requests
 */

const apiRouter = require('./api-router');
const fs = require('fs');
const path = require('path');
const PMS = require('../utils/pms'); // Path Manager System - SINGLE SOURCE OF TRUTH
const passwordUtils = require('../utils/password'); // Password hashing utilities
const { loadContactMessages } = require('./contact'); // Contact messages for admin dashboard
const visitorTracking = require('../services/visitor-tracking'); // Visitor tracking service

// Import chat functions - need to access loadConversations
// Since chat.js exports the handler, we'll load conversations directly
function loadChatConversations() {
    const conversationsPath = PMS.backend('data', 'chat-conversations.json');
    if (!fs.existsSync(conversationsPath)) {
        return [];
    }
    try {
        const fileContent = fs.readFileSync(conversationsPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[ADMIN] Error loading chat conversations:', error);
        return [];
    }
}

// Session storage - using JSON file for persistence
let sessions = {};

/**
 * Load sessions from file - USING PMS (NO HARDCODED PATHS)
 */
function loadSessions() {
    const sessionsPath = PMS.backend('data', 'sessions.json');
    
    if (!fs.existsSync(sessionsPath)) {
        return {};
    }
    
    try {
        const data = fs.readFileSync(sessionsPath, 'utf8');
        const loaded = JSON.parse(data);
        // Clean expired sessions on load
        const now = Date.now();
        const active = {};
        for (const [sessionId, session] of Object.entries(loaded)) {
            if (new Date(session.expiresAt).getTime() > now) {
                active[sessionId] = session;
            }
        }
        return active;
    } catch (error) {
        console.error('[SESSIONS] Error loading sessions:', error);
        return {};
    }
}

/**
 * Save sessions to file - USING PMS (NO HARDCODED PATHS)
 */
function saveSessions() {
    const sessionsPath = PMS.backend('data', 'sessions.json');
    const dataDir = PMS.backend('data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    try {
        fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
    } catch (error) {
        console.error('[SESSIONS] Error saving sessions:', error);
    }
}

// Load sessions on startup
sessions = loadSessions();
console.log(`[SESSIONS] Loaded ${Object.keys(sessions).length} active sessions`);

/**
 * Admin API handler
 */
function adminHandler(req, res) {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(p => p);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Extract endpoint (e.g., /api/admin/login -> login)
    const endpoint = pathParts.length > 2 ? pathParts[2] : '';

    switch (method) {
        case 'POST':
            if (endpoint === 'login') {
                handleLogin(req, res);
            } else if (endpoint === 'logout') {
                handleLogout(req, res);
                saveSessions(); // Save sessions after logout
            } else if (endpoint === 'pages') {
                handleCreatePage(req, res);
            } else if (endpoint === 'services') {
                handleCreateService(req, res);
            } else if (endpoint === 'apps') {
                handleCreateApp(req, res);
            } else if (endpoint === 'content') {
                handleCreateContentBlock(req, res);
            } else if (endpoint === 'users') {
                handleCreateUser(req, res);
            } else if (endpoint === 'password-reset-request') {
                handlePasswordResetRequest(req, res);
            } else if (endpoint === 'password-reset') {
                handlePasswordReset(req, res);
            } else if (endpoint === 'change-password') {
                handleChangePassword(req, res);
            } else if (endpoint === 'permissions') {
                handleGetPermissions(req, res);
            } else {
                apiRouter.send404(res);
            }
            break;

        case 'GET':
            if (endpoint === 'status' || endpoint === '') {
                handleStatus(req, res);
            } else if (endpoint === 'overview' || endpoint === 'stats' || endpoint === 'dashboard') {
                handleGetDashboardStats(req, res);
            } else if (endpoint === 'pages') {
                handleGetPages(req, res);
            } else if (endpoint.startsWith('pages/')) {
                // GET /api/admin/pages/:pageName - Get single page content
                const pageName = endpoint.replace('pages/', '');
                handleGetPage(req, res, pageName);
            } else if (endpoint === 'services') {
                handleGetServices(req, res);
            } else if (endpoint.startsWith('services/')) {
                // GET /api/admin/services/:id - Get single service
                const serviceId = endpoint.replace('services/', '');
                handleGetService(req, res, serviceId);
            } else if (endpoint === 'apps') {
                handleGetApps(req, res);
            } else if (endpoint.startsWith('apps/')) {
                // GET /api/admin/apps/:id - Get single app
                const appId = endpoint.replace('apps/', '');
                handleGetApp(req, res, appId);
            } else if (endpoint === 'content') {
                handleGetContentBlocks(req, res);
            } else if (endpoint.startsWith('content/')) {
                // GET /api/admin/content/:id - Get single content block
                const contentId = endpoint.replace('content/', '');
                handleGetContentBlock(req, res, contentId);
            } else if (endpoint === 'settings') {
                handleGetSettings(req, res);
            } else if (endpoint === 'users') {
                handleGetUsers(req, res);
            } else if (endpoint.startsWith('users/')) {
                // GET /api/admin/users/:id - Get single user
                const userId = endpoint.replace('users/', '');
                handleGetUser(req, res, userId);
            } else if (endpoint === 'permissions') {
                handleGetPermissions(req, res);
            } else if (endpoint === 'contact-messages' || endpoint === 'messages') {
                handleGetContactMessages(req, res);
            } else if (endpoint === 'media') {
                handleGetMedia(req, res);
            } else if (endpoint.startsWith('media/')) {
                // GET /api/admin/media/:filename - Get single media file info
                const filename = endpoint.replace('media/', '');
                handleGetMediaFile(req, res, filename);
            } else if (endpoint === 'visitors' || endpoint === 'visitor-stats') {
                handleGetVisitorStats(req, res);
            } else if (endpoint === 'chat-conversations' || endpoint === 'chats') {
                handleGetChatConversations(req, res);
            } else {
                apiRouter.send404(res);
            }
            break;

        case 'PUT':
            if (endpoint === 'pages') {
                handleUpdatePage(req, res);
            } else if (endpoint.startsWith('pages/')) {
                // PUT /api/admin/pages/:pageName - Update specific page
                const pageName = endpoint.replace('pages/', '');
                handleUpdatePage(req, res, pageName);
            } else if (endpoint === 'services') {
                handleUpdateService(req, res);
            } else if (endpoint.startsWith('services/')) {
                // PUT /api/admin/services/:id - Update specific service
                const serviceId = endpoint.replace('services/', '');
                handleUpdateService(req, res, serviceId);
            } else if (endpoint.startsWith('apps/')) {
                // PUT /api/admin/apps/:id - Update specific app
                const appId = endpoint.replace('apps/', '');
                handleUpdateApp(req, res, appId);
            } else if (endpoint === 'content') {
                handleUpdateContentBlock(req, res);
            } else if (endpoint.startsWith('content/')) {
                // PUT /api/admin/content/:id - Update specific content block
                const contentId = endpoint.replace('content/', '');
                handleUpdateContentBlock(req, res, contentId);
            } else if (endpoint === 'settings') {
                handleUpdateSettings(req, res);
            } else if (endpoint === 'users') {
                handleUpdateUser(req, res);
            } else if (endpoint.startsWith('users/')) {
                // PUT /api/admin/users/:id - Update specific user
                const userId = endpoint.replace('users/', '');
                handleUpdateUser(req, res, userId);
            } else if (endpoint === 'permissions') {
                handleUpdatePermissions(req, res);
            } else {
                apiRouter.send404(res);
            }
            break;

        case 'DELETE':
            if (endpoint.startsWith('pages/')) {
                // DELETE /api/admin/pages/:pageName - Delete page
                const pageName = endpoint.replace('pages/', '');
                handleDeletePage(req, res, pageName);
            } else if (endpoint.startsWith('services/')) {
                // DELETE /api/admin/services/:id - Delete service
                const serviceId = endpoint.replace('services/', '');
                handleDeleteService(req, res, serviceId);
            } else if (endpoint.startsWith('apps/')) {
                // DELETE /api/admin/apps/:id - Delete app
                const appId = endpoint.replace('apps/', '');
                handleDeleteApp(req, res, appId);
            } else if (endpoint.startsWith('content/')) {
                // DELETE /api/admin/content/:id - Delete content block
                const contentId = endpoint.replace('content/', '');
                handleDeleteContentBlock(req, res, contentId);
            } else if (endpoint.startsWith('users/')) {
                // DELETE /api/admin/users/:id - Delete user
                const userId = endpoint.replace('users/', '');
                handleDeleteUser(req, res, userId);
            } else if (endpoint.startsWith('media/')) {
                // DELETE /api/admin/media/:filename - Delete media file
                const filename = endpoint.replace('media/', '');
                handleDeleteMedia(req, res, filename);
            } else {
                apiRouter.send404(res);
            }
            break;

        default:
            apiRouter.send404(res);
    }
}

/**
 * Handle login
 */
async function handleLogin(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            console.log(`[ADMIN] Login request body: ${body}`);
            const credentials = JSON.parse(body);
            
            // Trim whitespace from credentials (common issue with form inputs)
            const receivedUsername = (credentials.username || '').trim();
            const receivedPassword = (credentials.password || '').trim();
            
            console.log(`[ADMIN] Received credentials - Username: "${receivedUsername}", Password length: ${receivedPassword.length}`);
            
            // Load users from file
            const users = loadUsers();
            const user = users.find(u => 
                u.username === receivedUsername && 
                u.status === 'active'
            );
            
            if (!user) {
                console.log(`[ADMIN] User not found or inactive: ${receivedUsername}`);
            }
            
            // Check credentials with password verification
            if (user) {
                // Verify password using bcrypt (handles legacy plain text passwords)
                console.log(`[ADMIN] Verifying password for user: ${user.username}, hash length: ${user.passwordHash ? user.passwordHash.length : 0}`);
                const passwordValid = await passwordUtils.verifyPassword(receivedPassword, user.passwordHash);
                console.log(`[ADMIN] Password valid: ${passwordValid}`);
                
                if (passwordValid) {
                    // Upgrade password hash if it's plain text (migration)
                    const needsUpgrade = passwordUtils.needsUpgrade(user.passwordHash);
                    console.log(`[ADMIN] Password needs upgrade: ${needsUpgrade}, hash length: ${user.passwordHash.length}`);
                    if (needsUpgrade) {
                        console.log(`[ADMIN] Upgrading password hash for user: ${user.username}`);
                        try {
                            user.passwordHash = await passwordUtils.hashPassword(receivedPassword);
                            console.log(`[ADMIN] Password hashed successfully, new length: ${user.passwordHash.length}`);
                            saveUsers(users);
                            console.log(`[ADMIN] Users saved`);
                        } catch (hashError) {
                            console.error(`[ADMIN] Error hashing password:`, hashError);
                        }
                    }
                    
                    // Update last login
                    user.lastLogin = new Date().toISOString();
                    saveUsers(users);
                    
                    // Create session
                    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    sessions[sessionId] = {
                        username: user.username,
                        userId: user.id,
                        role: user.role,
                        createdAt: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
                    };
                    
                    // Save sessions to file
                    saveSessions();
                    
                    // Log session creation for debugging
                    console.log('[ADMIN] Session created:', {
                        sessionId: sessionId,
                        username: user.username,
                        role: user.role,
                        totalSessions: Object.keys(sessions).length
                    });

                    // Send success response with proper structure
                    // Include sessionId at root level for compatibility, and in data for standard structure
                    const responseData = {
                        success: true,
                        message: 'Login successful',
                        sessionId: sessionId, // Root level for compatibility
                        data: {
                            sessionId: sessionId,
                            username: user.username,
                            role: user.role,
                            expiresAt: sessions[sessionId].expiresAt
                        }
                    };
                    
                    // Log response for debugging
                    console.log('[ADMIN] Login successful response:', JSON.stringify(responseData, null, 2));
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(responseData));
                    return;
                }
            }
            
            // Invalid credentials
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: 'Invalid credentials',
                statusCode: 401
            }));
        } catch (error) {
            console.error('[ADMIN] Login error:', error);
            console.error('[ADMIN] Error stack:', error.stack);
            apiRouter.sendError(res, {
                message: 'Invalid request data',
                error: error.message,
                statusCode: 400
            });
        }
    });
}

/**
 * Handle logout
 * Logout is idempotent - always succeeds even if session doesn't exist
 */
function handleLogout(req, res) {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    // Log logout attempt for debugging
    console.log('[ADMIN] Logout attempt:', {
        hasAuthHeader: !!authHeader,
        sessionId: sessionId ? sessionId.substring(0, 20) + '...' : 'none',
        sessionExists: sessionId ? !!sessions[sessionId] : false
    });
    
    // Delete session if it exists
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
        console.log('[ADMIN] Session deleted successfully');
    } else if (sessionId) {
        console.log('[ADMIN] Session not found (may have already been deleted)');
    } else {
        console.log('[ADMIN] No session ID provided');
    }
    
    // Always return success - logout is idempotent
    // Even if session doesn't exist, logout should succeed
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        message: 'Logout successful'
    }));
}

/**
 * Handle status check
 */
function handleStatus(req, res) {
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    // Allow status check without auth for connection testing
    if (!sessionId || !sessions[sessionId]) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Backend is reachable',
            authenticated: false,
            data: {
                authenticated: false
            },
            endpoint: '/api/admin/status'
        }));
        return;
    }

    // Check if session expired
    const session = sessions[sessionId];
    if (new Date(session.expiresAt) < new Date()) {
        delete sessions[sessionId];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Session expired',
            authenticated: false,
            data: {
                authenticated: false,
                reason: 'Session expired'
            }
        }));
        return;
    }

    // Session is valid - always return consistent structure with data object
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: true,
        message: 'Session valid',
        authenticated: true,
        data: {
            authenticated: true,
            username: session.username || 'Admin',
            expiresAt: session.expiresAt
        }
    }));
}

/**
 * Handle get pages
 */
function handleGetPages(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    // Debug logging
    console.log('[ADMIN] GetPages - Request received:', {
        hasAuthHeader: !!authHeader,
        authHeaderValue: authHeader ? authHeader.substring(0, 30) + '...' : 'none',
        sessionId: sessionId ? sessionId.substring(0, 30) + '...' : 'none',
        sessionIdLength: sessionId ? sessionId.length : 0,
        totalSessions: Object.keys(sessions).length,
        sessionKeys: Object.keys(sessions).map(k => k.substring(0, 20) + '...'),
        sessionExists: sessionId ? !!sessions[sessionId] : false
    });
    
    if (!sessionId) {
        console.log('[ADMIN] GetPages - No sessionId provided');
        return apiRouter.sendError(res, {
            message: 'Unauthorized - No session ID provided',
            statusCode: 401
        });
    }
    
    if (!sessions[sessionId]) {
        console.log('[ADMIN] GetPages - Session not found:', {
            sessionId: sessionId.substring(0, 30) + '...',
            availableSessions: Object.keys(sessions)
        });
        return apiRouter.sendError(res, {
            message: 'Unauthorized - Session not found or expired',
            statusCode: 401
        });
    }
    
    console.log('[ADMIN] GetPages - Session validated successfully');

    // Get pages from frontend/src/pages directory - USING PMS (NO HARDCODED PATHS)
    const pagesPath = PMS.frontend('pages');
    const pages = [];

    try {
        if (!fs.existsSync(pagesPath)) {
            throw new Error(`Pages directory not found: ${pagesPath}`);
        }
        
        const files = fs.readdirSync(pagesPath);
        files.forEach(file => {
            if (file.endsWith('.html')) {
                const filePath = PMS.frontend('pages', file);
                const stats = fs.statSync(filePath);
                
                pages.push({
                    name: file,
                    path: `/pages/${file}`, // URL path (not filesystem path)
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    url: `/${file}` // Public URL
                });
            }
        });

        apiRouter.sendSuccess(res, {
            pages: pages,
            count: pages.length
        }, 'Pages retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error reading pages directory',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get services
 */
function handleGetServices(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const servicesData = loadServicesData();
        apiRouter.sendSuccess(res, {
            services: servicesData,
            count: servicesData.length
        }, 'Services retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving services',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Load services data from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadServicesData() {
    const servicesPath = PMS.backend('data', 'services.json');
    
    if (!fs.existsSync(servicesPath)) {
        console.warn('[ADMIN] Services data file not found, returning empty array');
        return [];
    }
    
    const fileContent = fs.readFileSync(servicesPath, 'utf8');
    return JSON.parse(fileContent);
}

/**
 * Save services data to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveServicesData(servicesData) {
    const servicesPath = PMS.backend('data', 'services.json');
    
    // Ensure data directory exists
    const dataDir = PMS.backend('data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(servicesPath, JSON.stringify(servicesData, null, 2), 'utf8');
}

/**
 * Handle get single page content
 */
function handleGetPage(req, res, pageName) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        // Decode page name (in case it has special characters)
        const decodedPageName = decodeURIComponent(pageName);
        
        // Get page file path using PMS
        const pageFilePath = PMS.frontend('pages', decodedPageName);
        
        // Verify page exists
        if (!fs.existsSync(pageFilePath)) {
            return apiRouter.sendError(res, {
                message: `Page not found: ${decodedPageName}`,
                statusCode: 404
            });
        }

        // Read page content
        const content = fs.readFileSync(pageFilePath, 'utf8');
        const stats = fs.statSync(pageFilePath);

        apiRouter.sendSuccess(res, {
            name: decodedPageName,
            content: content,
            path: pageFilePath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            url: `/${decodedPageName}`
        }, 'Page retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error reading page',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle create new page
 */
function handleCreatePage(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const pageData = JSON.parse(body);
            
            if (!pageData.name || !pageData.content) {
                return apiRouter.sendError(res, {
                    message: 'Missing required fields: name and content',
                    statusCode: 400
                });
            }

            // Ensure page name ends with .html
            const pageName = pageData.name.endsWith('.html') ? pageData.name : pageData.name + '.html';
            
            // Get page file path using PMS
            const pageFilePath = PMS.frontend('pages', pageName);
            
            // Check if page already exists
            if (fs.existsSync(pageFilePath)) {
                return apiRouter.sendError(res, {
                    message: `Page already exists: ${pageName}`,
                    statusCode: 409
                });
            }

            // Write page content
            fs.writeFileSync(pageFilePath, pageData.content, 'utf8');
            const stats = fs.statSync(pageFilePath);

            apiRouter.sendSuccess(res, {
                name: pageName,
                path: pageFilePath,
                size: stats.size,
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString(),
                url: `/${pageName}`
            }, 'Page created successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error creating page',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle update page
 */
function handleUpdatePage(req, res, pageNameFromUrl) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const pageData = JSON.parse(body);
            
            // Use pageName from URL if provided, otherwise from body
            const pageName = pageNameFromUrl ? decodeURIComponent(pageNameFromUrl) : pageData.name;
            
            if (!pageName || !pageData.content) {
                return apiRouter.sendError(res, {
                    message: 'Missing required fields: name and content',
                    statusCode: 400
                });
            }

            // Ensure page name ends with .html
            const finalPageName = pageName.endsWith('.html') ? pageName : pageName + '.html';

            // Get page file path using PMS
            const pageFilePath = PMS.frontend('pages', finalPageName);
            
            // Verify page exists
            if (!fs.existsSync(pageFilePath)) {
                return apiRouter.sendError(res, {
                    message: `Page not found: ${finalPageName}`,
                    statusCode: 404
                });
            }

            // Backup original content (optional - for safety)
            const backupPath = pageFilePath + '.backup';
            if (fs.existsSync(pageFilePath)) {
                fs.copyFileSync(pageFilePath, backupPath);
            }

            // Write updated content
            fs.writeFileSync(pageFilePath, pageData.content, 'utf8');
            const stats = fs.statSync(pageFilePath);

            // Clean up backup after successful write (optional)
            if (fs.existsSync(backupPath)) {
                setTimeout(() => {
                    try {
                        fs.unlinkSync(backupPath);
                    } catch (e) {
                        // Ignore backup cleanup errors
                    }
                }, 5000);
            }

            apiRouter.sendSuccess(res, {
                name: finalPageName,
                path: pageFilePath,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                url: `/${finalPageName}`
            }, 'Page updated successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error updating page',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle delete page
 */
function handleDeletePage(req, res, pageName) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        // Decode page name
        const decodedPageName = decodeURIComponent(pageName);
        
        // Prevent deletion of admin.html and index.html
        if (decodedPageName === 'admin.html' || decodedPageName === 'index.html') {
            return apiRouter.sendError(res, {
                message: 'Cannot delete protected pages: admin.html and index.html',
                statusCode: 403
            });
        }
        
        // Get page file path using PMS
        const pageFilePath = PMS.frontend('pages', decodedPageName);
        
        // Verify page exists
        if (!fs.existsSync(pageFilePath)) {
            return apiRouter.sendError(res, {
                message: `Page not found: ${decodedPageName}`,
                statusCode: 404
            });
        }

        // Delete page file
        fs.unlinkSync(pageFilePath);

        apiRouter.sendSuccess(res, {
            name: decodedPageName,
            deleted: true
        }, 'Page deleted successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error deleting page',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get single service
 */
function handleGetService(req, res, serviceId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const servicesData = loadServicesData();
        const id = parseInt(serviceId);
        const service = servicesData.find(s => s.id === id);
        
        if (!service) {
            return apiRouter.sendError(res, {
                message: `Service not found with ID: ${serviceId}`,
                statusCode: 404
            });
        }

        apiRouter.sendSuccess(res, service, 'Service retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving service',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle create service
 */
function handleCreateService(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const serviceData = JSON.parse(body);
            
            // Validate required fields
            if (!serviceData.name || !serviceData.description) {
                return apiRouter.sendError(res, {
                    message: 'Missing required fields: name and description',
                    statusCode: 400
                });
            }

            const servicesData = loadServicesData();
            
            // Generate new ID
            const newId = servicesData.length > 0 
                ? Math.max(...servicesData.map(s => s.id)) + 1 
                : 1;
            
            // Create new service
            const newService = {
                id: newId,
                name: serviceData.name,
                icon: serviceData.icon || '📋',
                category: serviceData.category || 'general',
                description: serviceData.description,
                details: serviceData.details || [],
                ...(serviceData.certifications && { certifications: serviceData.certifications }),
                ...(serviceData.technologies && { technologies: serviceData.technologies }),
                ...(serviceData.platforms && { platforms: serviceData.platforms }),
                ...(serviceData.experience && { experience: serviceData.experience }),
                ...(serviceData.methodology && { methodology: serviceData.methodology })
            };
            
            servicesData.push(newService);
            saveServicesData(servicesData);

            apiRouter.sendSuccess(res, newService, 'Service created successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error creating service',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle update service
 */
function handleUpdateService(req, res, serviceIdFromUrl) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const serviceData = JSON.parse(body);
            const servicesData = loadServicesData();
            
            // Use serviceId from URL if provided, otherwise from body
            const serviceId = serviceIdFromUrl ? parseInt(serviceIdFromUrl) : serviceData.id;
            
            if (!serviceId) {
                return apiRouter.sendError(res, {
                    message: 'Service ID is required',
                    statusCode: 400
                });
            }
            
            const serviceIndex = servicesData.findIndex(s => s.id === serviceId);
            
            if (serviceIndex === -1) {
                return apiRouter.sendError(res, {
                    message: `Service not found with ID: ${serviceId}`,
                    statusCode: 404
                });
            }

            // Update service (preserve ID)
            const updatedService = {
                ...servicesData[serviceIndex],
                ...serviceData,
                id: serviceId // Ensure ID cannot be changed
            };
            
            servicesData[serviceIndex] = updatedService;
            saveServicesData(servicesData);

            apiRouter.sendSuccess(res, updatedService, 'Service updated successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error updating service',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle delete service
 */
function handleDeleteService(req, res, serviceId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const id = parseInt(serviceId);
        const servicesData = loadServicesData();
        const serviceIndex = servicesData.findIndex(s => s.id === id);
        
        if (serviceIndex === -1) {
            return apiRouter.sendError(res, {
                message: `Service not found with ID: ${serviceId}`,
                statusCode: 404
            });
        }

        // Remove service
        const deletedService = servicesData.splice(serviceIndex, 1)[0];
        saveServicesData(servicesData);

        apiRouter.sendSuccess(res, {
            id: deletedService.id,
            name: deletedService.name,
            deleted: true
        }, 'Service deleted successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error deleting service',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * ========== APPS MANAGEMENT ==========
 */

/**
 * Load apps data from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadAppsData() {
    const appsPath = PMS.backend('data', 'apps.json');
    
    if (!fs.existsSync(appsPath)) {
        console.warn('[ADMIN] Apps data file not found, returning empty array');
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(appsPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[ADMIN] Error loading apps data:', error);
        return [];
    }
}

/**
 * Save apps data to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveAppsData(appsData) {
    const appsPath = PMS.backend('data', 'apps.json');
    
    // Ensure data directory exists
    const dataDir = PMS.backend('data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    try {
        fs.writeFileSync(appsPath, JSON.stringify(appsData, null, 2), 'utf8');
    } catch (error) {
        console.error('[ADMIN] Error saving apps data:', error);
        throw error;
    }
}

/**
 * Handle get apps
 */
function handleGetApps(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const appsData = loadAppsData();
        apiRouter.sendSuccess(res, {
            apps: appsData,
            count: appsData.length
        }, 'Apps retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving apps',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get single app
 */
function handleGetApp(req, res, appId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const id = parseInt(appId);
        const appsData = loadAppsData();
        const app = appsData.find(a => a.id === id);
        
        if (!app) {
            return apiRouter.sendError(res, {
                message: `App not found with ID: ${appId}`,
                statusCode: 404
            });
        }
        
        apiRouter.sendSuccess(res, app, 'App retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving app',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle create app
 */
function handleCreateApp(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const appData = JSON.parse(body);
            
            // Validate required fields
            if (!appData.name || !appData.description) {
                return apiRouter.sendError(res, {
                    message: 'Missing required fields: name and description',
                    statusCode: 400
                });
            }

            const appsData = loadAppsData();
            
            // Generate new ID
            const newId = appsData.length > 0 
                ? Math.max(...appsData.map(a => a.id)) + 1 
                : 1;
            
            // Create new app
            const newApp = {
                id: newId,
                name: appData.name,
                icon: appData.icon || '🚀',
                description: appData.description,
                status: appData.status || 'coming-soon',
                link: appData.link || ''
            };
            
            appsData.push(newApp);
            saveAppsData(appsData);

            apiRouter.sendSuccess(res, newApp, 'App created successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error creating app',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle update app
 */
function handleUpdateApp(req, res, appId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const appData = JSON.parse(body);
            const id = parseInt(appId);
            const appsData = loadAppsData();
            
            if (!appId || isNaN(id)) {
                return apiRouter.sendError(res, {
                    message: 'App ID is required',
                    statusCode: 400
                });
            }
            
            const appIndex = appsData.findIndex(a => a.id === id);
            
            if (appIndex === -1) {
                return apiRouter.sendError(res, {
                    message: `App not found with ID: ${appId}`,
                    statusCode: 404
                });
            }

            // Update app (preserve ID)
            const updatedApp = {
                ...appsData[appIndex],
                ...appData,
                id: id // Ensure ID cannot be changed
            };
            
            appsData[appIndex] = updatedApp;
            saveAppsData(appsData);

            apiRouter.sendSuccess(res, updatedApp, 'App updated successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error updating app',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle delete app
 */
function handleDeleteApp(req, res, appId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const id = parseInt(appId);
        const appsData = loadAppsData();
        const appIndex = appsData.findIndex(a => a.id === id);
        
        if (appIndex === -1) {
            return apiRouter.sendError(res, {
                message: `App not found with ID: ${appId}`,
                statusCode: 404
            });
        }

        // Remove app
        const deletedApp = appsData.splice(appIndex, 1)[0];
        saveAppsData(appsData);

        apiRouter.sendSuccess(res, {
            id: deletedApp.id,
            name: deletedApp.name,
            deleted: true
        }, 'App deleted successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error deleting app',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * ========== CONTENT BLOCKS MANAGEMENT ==========
 */

/**
 * Load content blocks data from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadContentBlocks() {
    const contentPath = PMS.backend('data', 'content-blocks.json');
    
    if (!fs.existsSync(contentPath)) {
        console.warn('[ADMIN] Content blocks file not found, returning empty array');
        return [];
    }
    
    const fileContent = fs.readFileSync(contentPath, 'utf8');
    return JSON.parse(fileContent);
}

/**
 * Save content blocks data to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveContentBlocks(contentBlocks) {
    const contentPath = PMS.backend('data', 'content-blocks.json');
    
    // Ensure data directory exists
    const dataDir = PMS.backend('data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(contentPath, JSON.stringify(contentBlocks, null, 2), 'utf8');
}

/**
 * Handle get content blocks
 */
function handleGetContentBlocks(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const contentBlocks = loadContentBlocks();
        apiRouter.sendSuccess(res, {
            contentBlocks: contentBlocks,
            count: contentBlocks.length
        }, 'Content blocks retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving content blocks',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get single content block
 */
function handleGetContentBlock(req, res, contentId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const contentBlocks = loadContentBlocks();
        const id = parseInt(contentId);
        const contentBlock = contentBlocks.find(c => c.id === id);
        
        if (!contentBlock) {
            return apiRouter.sendError(res, {
                message: `Content block not found with ID: ${contentId}`,
                statusCode: 404
            });
        }

        apiRouter.sendSuccess(res, contentBlock, 'Content block retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving content block',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle create content block
 */
function handleCreateContentBlock(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const contentData = JSON.parse(body);
            
            // Validate required fields
            if (!contentData.key || !contentData.content) {
                return apiRouter.sendError(res, {
                    message: 'Missing required fields: key and content',
                    statusCode: 400
                });
            }

            const contentBlocks = loadContentBlocks();
            
            // Check if key already exists
            if (contentBlocks.find(c => c.key === contentData.key)) {
                return apiRouter.sendError(res, {
                    message: `Content block with key "${contentData.key}" already exists`,
                    statusCode: 409
                });
            }
            
            // Generate new ID
            const newId = contentBlocks.length > 0 
                ? Math.max(...contentBlocks.map(c => c.id)) + 1 
                : 1;
            
            // Create new content block
            const now = new Date().toISOString();
            const newContentBlock = {
                id: newId,
                key: contentData.key,
                type: contentData.type || 'text',
                category: contentData.category || 'general',
                content: contentData.content || {},
                description: contentData.description || '',
                created: now,
                modified: now
            };
            
            contentBlocks.push(newContentBlock);
            saveContentBlocks(contentBlocks);

            apiRouter.sendSuccess(res, newContentBlock, 'Content block created successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error creating content block',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle update content block
 */
function handleUpdateContentBlock(req, res, contentIdFromUrl) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const contentData = JSON.parse(body);
            const contentBlocks = loadContentBlocks();
            
            // Use contentId from URL if provided, otherwise from body
            const contentId = contentIdFromUrl ? parseInt(contentIdFromUrl) : contentData.id;
            
            if (!contentId) {
                return apiRouter.sendError(res, {
                    message: 'Content block ID is required',
                    statusCode: 400
                });
            }
            
            const contentIndex = contentBlocks.findIndex(c => c.id === contentId);
            
            if (contentIndex === -1) {
                return apiRouter.sendError(res, {
                    message: `Content block not found with ID: ${contentId}`,
                    statusCode: 404
                });
            }

            // Update content block (preserve ID, created date)
            const updatedContentBlock = {
                ...contentBlocks[contentIndex],
                ...contentData,
                id: contentId, // Ensure ID cannot be changed
                created: contentBlocks[contentIndex].created, // Preserve created date
                modified: new Date().toISOString() // Update modified date
            };
            
            contentBlocks[contentIndex] = updatedContentBlock;
            saveContentBlocks(contentBlocks);

            apiRouter.sendSuccess(res, updatedContentBlock, 'Content block updated successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error updating content block',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle delete content block
 */
function handleDeleteContentBlock(req, res, contentId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const id = parseInt(contentId);
        const contentBlocks = loadContentBlocks();
        const contentIndex = contentBlocks.findIndex(c => c.id === id);
        
        if (contentIndex === -1) {
            return apiRouter.sendError(res, {
                message: `Content block not found with ID: ${contentId}`,
                statusCode: 404
            });
        }

        // Remove content block
        const deletedContentBlock = contentBlocks.splice(contentIndex, 1)[0];
        saveContentBlocks(contentBlocks);

        apiRouter.sendSuccess(res, {
            id: deletedContentBlock.id,
            key: deletedContentBlock.key,
            deleted: true
        }, 'Content block deleted successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error deleting content block',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * ========== SETTINGS MANAGEMENT ==========
 */

/**
 * Load settings from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadSettings() {
    const settingsPath = PMS.backend('data', 'settings.json');
    
    if (!fs.existsSync(settingsPath)) {
        console.warn('[ADMIN] Settings file not found, returning default settings');
        return {
            site: { name: 'Paxi iTechnologies', domain: 'paxiit.com' },
            seo: {},
            social: {},
            features: {},
            updated: new Date().toISOString()
        };
    }
    
    const fileContent = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(fileContent);
}

/**
 * Save settings to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveSettings(settings) {
    const settingsPath = PMS.backend('data', 'settings.json');
    
    // Ensure data directory exists
    const dataDir = PMS.backend('data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Update timestamp
    settings.updated = new Date().toISOString();
    
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

/**
 * Handle get settings
 */
function handleGetSettings(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const settings = loadSettings();
        apiRouter.sendSuccess(res, settings, 'Settings retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving settings',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle update settings
 */
function handleUpdateSettings(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const settingsData = JSON.parse(body);
            const currentSettings = loadSettings();
            
            // Merge settings (preserve structure)
            const updatedSettings = {
                ...currentSettings,
                ...settingsData,
                updated: new Date().toISOString()
            };
            
            saveSettings(updatedSettings);

            apiRouter.sendSuccess(res, updatedSettings, 'Settings updated successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error updating settings',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * ========== USER MANAGEMENT ==========
 */

/**
 * Load users data from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadUsers() {
    const usersPath = PMS.backend('data', 'users.json');
    
    if (!fs.existsSync(usersPath)) {
        console.warn('[ADMIN] Users file not found, returning empty array');
        return [];
    }
    
    const fileContent = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(fileContent);
}

/**
 * Save users data to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveUsers(users) {
    const usersPath = PMS.backend('data', 'users.json');
    
    // Ensure data directory exists
    const dataDir = PMS.backend('data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

/**
 * Handle get users
 */
function handleGetUsers(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const users = loadUsers();
        // Don't send password hashes to frontend
        const safeUsers = users.map(user => {
            const { passwordHash, ...safeUser } = user;
            return safeUser;
        });
        
        apiRouter.sendSuccess(res, {
            users: safeUsers,
            count: safeUsers.length
        }, 'Users retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving users',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get single user
 */
function handleGetUser(req, res, userId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const users = loadUsers();
        const id = parseInt(userId);
        const user = users.find(u => u.id === id);
        
        if (!user) {
            return apiRouter.sendError(res, {
                message: `User not found with ID: ${userId}`,
                statusCode: 404
            });
        }

        // Don't send password hash
        const { passwordHash, ...safeUser } = user;
        apiRouter.sendSuccess(res, safeUser, 'User retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving user',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle create user
 */
async function handleCreateUser(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const userData = JSON.parse(body);
            
            // Validate required fields
            if (!userData.username || !userData.password || !userData.email) {
                return apiRouter.sendError(res, {
                    message: 'Missing required fields: username, password, and email',
                    statusCode: 400
                });
            }

            const users = loadUsers();
            
            // Check if username already exists
            if (users.find(u => u.username === userData.username)) {
                return apiRouter.sendError(res, {
                    message: `User with username "${userData.username}" already exists`,
                    statusCode: 409
                });
            }
            
            // Check if email already exists
            if (users.find(u => u.email === userData.email)) {
                return apiRouter.sendError(res, {
                    message: `User with email "${userData.email}" already exists`,
                    statusCode: 409
                });
            }
            
            // Generate new ID
            const newId = users.length > 0 
                ? Math.max(...users.map(u => u.id)) + 1 
                : 1;
            
            // Create new user
            const now = new Date().toISOString();
            const newUser = {
                id: newId,
                username: userData.username,
                email: userData.email,
                passwordHash: await passwordUtils.hashPassword(userData.password),
                role: userData.role || 'admin',
                status: userData.status || 'active',
                created: now,
                modified: now,
                lastLogin: null
            };
            
            users.push(newUser);
            saveUsers(users);

            // Don't send password hash
            const { passwordHash, ...safeUser } = newUser;
            apiRouter.sendSuccess(res, safeUser, 'User created successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error creating user',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle update user
 */
async function handleUpdateUser(req, res, userIdFromUrl) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const userData = JSON.parse(body);
            const users = loadUsers();
            
            // Use userId from URL if provided, otherwise from body
            const userId = userIdFromUrl ? parseInt(userIdFromUrl) : userData.id;
            
            if (!userId) {
                return apiRouter.sendError(res, {
                    message: 'User ID is required',
                    statusCode: 400
                });
            }
            
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex === -1) {
                return apiRouter.sendError(res, {
                    message: `User not found with ID: ${userId}`,
                    statusCode: 404
                });
            }

            // Check for duplicate username (if changing username)
            if (userData.username && userData.username !== users[userIndex].username) {
                if (users.find(u => u.id !== userId && u.username === userData.username)) {
                    return apiRouter.sendError(res, {
                        message: `Username "${userData.username}" is already taken`,
                        statusCode: 409
                    });
                }
            }
            
            // Check for duplicate email (if changing email)
            if (userData.email && userData.email !== users[userIndex].email) {
                if (users.find(u => u.id !== userId && u.email === userData.email)) {
                    return apiRouter.sendError(res, {
                        message: `Email "${userData.email}" is already taken`,
                        statusCode: 409
                    });
                }
            }

            // Update user (preserve ID, created date, passwordHash unless changing password)
            const updatedUser = {
                ...users[userIndex],
                ...userData,
                id: userId, // Ensure ID cannot be changed
                created: users[userIndex].created, // Preserve created date
                modified: new Date().toISOString() // Update modified date
            };
            
            // Update password if provided
            if (userData.password) {
                updatedUser.passwordHash = await passwordUtils.hashPassword(userData.password);
            } else {
                // Keep existing password hash
                updatedUser.passwordHash = users[userIndex].passwordHash;
            }
            
            users[userIndex] = updatedUser;
            saveUsers(users);

            // Don't send password hash
            const { passwordHash, ...safeUser } = updatedUser;
            apiRouter.sendSuccess(res, safeUser, 'User updated successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error updating user',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle delete user
 */
function handleDeleteUser(req, res, userId) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const id = parseInt(userId);
        const users = loadUsers();
        const userIndex = users.findIndex(u => u.id === id);
        
        if (userIndex === -1) {
            return apiRouter.sendError(res, {
                message: `User not found with ID: ${userId}`,
                statusCode: 404
            });
        }

        // Prevent deletion of the last super_admin
        const deletedUser = users[userIndex];
        const remainingSuperAdmins = users.filter(u => u.id !== id && u.role === 'super_admin');
        
        if (deletedUser.role === 'super_admin' && remainingSuperAdmins.length === 0) {
            return apiRouter.sendError(res, {
                message: 'Cannot delete the last super admin user',
                statusCode: 403
            });
        }

        // Remove user
        users.splice(userIndex, 1);
        saveUsers(users);

        apiRouter.sendSuccess(res, {
            id: deletedUser.id,
            username: deletedUser.username,
            deleted: true
        }, 'User deleted successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error deleting user',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * ========== PASSWORD RESET MANAGEMENT ==========
 */

/**
 * Load password reset tokens from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadPasswordResets() {
    const resetsPath = PMS.backend('data', 'password-resets.json');
    
    if (!fs.existsSync(resetsPath)) {
        return [];
    }
    
    const fileContent = fs.readFileSync(resetsPath, 'utf8');
    return JSON.parse(fileContent);
}

/**
 * Save password reset tokens to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function savePasswordResets(resets) {
    const resetsPath = PMS.backend('data', 'password-resets.json');
    
    // Ensure data directory exists
    const dataDir = PMS.backend('data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(resetsPath, JSON.stringify(resets, null, 2), 'utf8');
}

/**
 * Generate reset token
 */
function generateResetToken() {
    return 'reset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
}

/**
 * Handle password reset request
 */
function handlePasswordResetRequest(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const email = (data.email || '').trim();
            
            if (!email) {
                return apiRouter.sendError(res, {
                    message: 'Email is required',
                    statusCode: 400
                });
            }
            
            const users = loadUsers();
            const user = users.find(u => u.email === email && u.status === 'active');
            
            // Always return success (security: don't reveal if email exists)
            if (user) {
                const resets = loadPasswordResets();
                
                // Remove old tokens for this user
                const filteredResets = resets.filter(r => r.userId !== user.id);
                
                // Create new reset token
                const token = generateResetToken();
                const resetData = {
                    userId: user.id,
                    email: user.email,
                    token: token,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
                    used: false
                };
                
                filteredResets.push(resetData);
                savePasswordResets(filteredResets);
                
                // In production, send email with reset link
                // For now, return token in response (remove in production!)
                console.log(`[PASSWORD RESET] Token for ${email}: ${token}`);
            }
            
            apiRouter.sendSuccess(res, {
                message: 'If the email exists, a password reset link has been sent.'
            }, 'Password reset request processed');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error processing password reset request',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle password reset with token
 */
async function handlePasswordReset(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const token = (data.token || '').trim();
            const newPassword = (data.password || '').trim();
            
            if (!token || !newPassword) {
                return apiRouter.sendError(res, {
                    message: 'Token and new password are required',
                    statusCode: 400
                });
            }
            
            if (newPassword.length < 6) {
                return apiRouter.sendError(res, {
                    message: 'Password must be at least 6 characters',
                    statusCode: 400
                });
            }
            
            const resets = loadPasswordResets();
            const reset = resets.find(r => r.token === token && !r.used);
            
            if (!reset) {
                return apiRouter.sendError(res, {
                    message: 'Invalid or expired reset token',
                    statusCode: 400
                });
            }
            
            // Check if token expired
            if (new Date(reset.expiresAt) < new Date()) {
                return apiRouter.sendError(res, {
                    message: 'Reset token has expired',
                    statusCode: 400
                });
            }
            
            // Update user password
            const users = loadUsers();
            const userIndex = users.findIndex(u => u.id === reset.userId);
            
            if (userIndex === -1) {
                return apiRouter.sendError(res, {
                    message: 'User not found',
                    statusCode: 404
                });
            }
            
            users[userIndex].passwordHash = await passwordUtils.hashPassword(newPassword);
            users[userIndex].modified = new Date().toISOString();
            saveUsers(users);
            
            // Mark token as used
            reset.used = true;
            savePasswordResets(resets);
            
            apiRouter.sendSuccess(res, {
                message: 'Password reset successfully'
            }, 'Password reset successful');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error resetting password',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle change password (for logged-in users)
 */
async function handleChangePassword(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const currentPassword = (data.currentPassword || '').trim();
            const newPassword = (data.newPassword || '').trim();
            
            if (!currentPassword || !newPassword) {
                return apiRouter.sendError(res, {
                    message: 'Current password and new password are required',
                    statusCode: 400
                });
            }
            
            if (newPassword.length < 6) {
                return apiRouter.sendError(res, {
                    message: 'New password must be at least 6 characters',
                    statusCode: 400
                });
            }
            
            const session = sessions[sessionId];
            const users = loadUsers();
            const userIndex = users.findIndex(u => u.id === session.userId);
            
            if (userIndex === -1) {
                return apiRouter.sendError(res, {
                    message: 'User not found',
                    statusCode: 404
                });
            }
            
            // Verify current password using bcrypt
            const passwordValid = await passwordUtils.verifyPassword(currentPassword, users[userIndex].passwordHash);
            if (!passwordValid) {
                return apiRouter.sendError(res, {
                    message: 'Current password is incorrect',
                    statusCode: 401
                });
            }
            
            // Update password with hashing
            users[userIndex].passwordHash = await passwordUtils.hashPassword(newPassword);
            users[userIndex].modified = new Date().toISOString();
            saveUsers(users);
            
            apiRouter.sendSuccess(res, {
                message: 'Password changed successfully'
            }, 'Password changed successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error changing password',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * ========== PERMISSIONS MANAGEMENT ==========
 */

/**
 * Load permissions from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadPermissions() {
    const permissionsPath = PMS.backend('data', 'permissions.json');
    
    if (!fs.existsSync(permissionsPath)) {
        console.warn('[ADMIN] Permissions file not found, returning default permissions');
        return {
            roles: {
                super_admin: { name: 'Super Administrator', permissions: [] },
                admin: { name: 'Administrator', permissions: [] },
                editor: { name: 'Editor', permissions: [] }
            }
        };
    }
    
    const fileContent = fs.readFileSync(permissionsPath, 'utf8');
    return JSON.parse(fileContent);
}

/**
 * Save permissions to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function savePermissions(permissions) {
    const permissionsPath = PMS.backend('data', 'permissions.json');
    
    // Ensure data directory exists
    const dataDir = PMS.backend('data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(permissionsPath, JSON.stringify(permissions, null, 2), 'utf8');
}

/**
 * Check if user has permission
 */
function hasPermission(userRole, permission) {
    const permissions = loadPermissions();
    const role = permissions.roles[userRole];
    
    if (!role) {
        return false;
    }
    
    // Super admin has all permissions
    if (userRole === 'super_admin') {
        return true;
    }
    
    return role.permissions.includes(permission);
}

/**
 * Handle get permissions
 */
function handleGetPermissions(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }
    
    try {
        const permissions = loadPermissions();
        apiRouter.sendSuccess(res, permissions, 'Permissions retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving permissions',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Update permissions (only super_admin)
 */
function handleUpdatePermissions(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }
    
    const session = sessions[sessionId];
    
    // Only super_admin can update permissions
    if (session.role !== 'super_admin') {
        return apiRouter.sendError(res, {
            message: 'Only super administrators can update permissions',
            statusCode: 403
        });
    }
    
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const permissionsData = JSON.parse(body);
            savePermissions(permissionsData);
            
            apiRouter.sendSuccess(res, permissionsData, 'Permissions updated successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error updating permissions',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * ========== DASHBOARD STATISTICS ==========
 */

/**
 * Handle get dashboard statistics
 */
function handleGetDashboardStats(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        // Load all data sources
        const pages = handleGetPagesSync();
        const services = loadServicesData();
        const contentBlocks = loadContentBlocks();
        const users = loadUsers();
        const settings = loadSettings();
        const contactMessages = loadContactMessages();
        const visitorStats = visitorTracking.getVisitorStats();
        
        // Calculate statistics
        const stats = {
            pages: {
                total: pages.length,
                recent: pages.filter(p => {
                    const pagePath = PMS.frontend('pages', p.name);
                    if (!fs.existsSync(pagePath)) return false;
                    const stats = fs.statSync(pagePath);
                    const daysSinceModified = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
                    return daysSinceModified <= 7; // Last 7 days
                }).length
            },
            services: {
                total: services.length,
                byCategory: services.reduce((acc, service) => {
                    const category = service.category || 'uncategorized';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                }, {})
            },
            content: {
                total: contentBlocks.length,
                byCategory: contentBlocks.reduce((acc, block) => {
                    const category = block.category || 'general';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                }, {}),
                byLanguage: contentBlocks.reduce((acc, block) => {
                    const languages = Object.keys(block.content || {});
                    languages.forEach(lang => {
                        acc[lang] = (acc[lang] || 0) + 1;
                    });
                    return acc;
                }, {})
            },
            users: {
                total: users.length,
                active: users.filter(u => u.status === 'active').length,
                byRole: users.reduce((acc, user) => {
                    const role = user.role || 'admin';
                    acc[role] = (acc[role] || 0) + 1;
                    return acc;
                }, {}),
                recentLogins: users.filter(u => {
                    if (!u.lastLogin) return false;
                    const daysSinceLogin = (Date.now() - new Date(u.lastLogin).getTime()) / (1000 * 60 * 60 * 24);
                    return daysSinceLogin <= 7; // Last 7 days
                }).length
            },
            contact: {
                total: contactMessages.length,
                unread: contactMessages.filter(m => !m.read).length,
                recent: contactMessages.filter(m => {
                    const daysSinceMessage = (Date.now() - new Date(m.timestamp).getTime()) / (1000 * 60 * 60 * 24);
                    return daysSinceMessage <= 7; // Last 7 days
                }).length,
                emailSent: contactMessages.filter(m => m.emailSent === true).length,
                emailFailed: contactMessages.filter(m => m.emailSent === false).length
            },
            system: {
                lastUpdated: settings.updated || new Date().toISOString(),
                maintenanceMode: settings.features?.maintenanceMode || false,
                totalDataFiles: 6 // pages, services, content, users, settings, contact-messages
            },
            visitors: {
                totalVisitors: visitorStats.totalVisitors || 0,
                totalPageViews: visitorStats.totalPageViews || 0,
                uniqueVisitors: visitorStats.uniqueVisitors || 0,
                firstVisit: visitorStats.firstVisit,
                lastVisit: visitorStats.lastVisit,
                topPages: visitorStats.topPages || []
            },
            recentActivity: getRecentActivity()
        };
        
        apiRouter.sendSuccess(res, stats, 'Dashboard statistics retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving dashboard statistics',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get visitor statistics
 */
function handleGetVisitorStats(req, res) {
    // Verify session
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const visitorStats = visitorTracking.getVisitorStats();
        apiRouter.sendSuccess(res, visitorStats, 'Visitor statistics retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving visitor statistics',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get chat conversations
 */
function handleGetChatConversations(req, res) {
    // Verify session
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }

    try {
        const conversations = loadChatConversations();
        
        // Sort by timestamp (most recent first)
        const sortedConversations = conversations.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
        });
        
        // Group by session for better organization
        const sessionsMap = {};
        sortedConversations.forEach(conv => {
            const sessionId = conv.sessionId || 'unknown';
            if (!sessionsMap[sessionId]) {
                sessionsMap[sessionId] = [];
            }
            sessionsMap[sessionId].push(conv);
        });
        
        apiRouter.sendSuccess(res, {
            conversations: sortedConversations,
            sessions: sessionsMap,
            total: sortedConversations.length,
            uniqueSessions: Object.keys(sessionsMap).length
        }, 'Chat conversations retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving chat conversations',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Get pages synchronously (helper for stats)
 */
function handleGetPagesSync() {
    const pagesPath = PMS.frontend('pages');
    
    if (!fs.existsSync(pagesPath)) {
        return [];
    }
    
    const files = fs.readdirSync(pagesPath);
    return files
        .filter(file => file.endsWith('.html'))
        .map(file => ({
            name: file,
            path: file
        }));
}

/**
 * Get recent activity
 */
function getRecentActivity() {
    const activities = [];
    
    try {
        // Check recent page modifications
        const pagesPath = PMS.frontend('pages');
        if (fs.existsSync(pagesPath)) {
            const files = fs.readdirSync(pagesPath);
            files.filter(f => f.endsWith('.html')).forEach(file => {
                const filePath = PMS.frontend('pages', file);
                const stats = fs.statSync(filePath);
                if (stats.mtimeMs > Date.now() - 7 * 24 * 60 * 60 * 1000) {
                    activities.push({
                        type: 'page',
                        action: 'modified',
                        item: file,
                        timestamp: stats.mtime.toISOString()
                    });
                }
            });
        }
        
        // Check recent user logins
        const users = loadUsers();
        users.forEach(user => {
            if (user.lastLogin) {
                const loginTime = new Date(user.lastLogin).getTime();
                if (loginTime > Date.now() - 7 * 24 * 60 * 60 * 1000) {
                    activities.push({
                        type: 'user',
                        action: 'login',
                        item: user.username,
                        timestamp: user.lastLogin
                    });
                }
            }
        });
        
        // Check recent contact messages
        const contactMessages = loadContactMessages();
        contactMessages.slice(0, 10).forEach(message => {
            const messageTime = new Date(message.timestamp).getTime();
            if (messageTime > Date.now() - 7 * 24 * 60 * 60 * 1000) {
                activities.push({
                    type: 'contact',
                    action: 'submitted',
                    item: `${message.name} - ${message.subject || 'General Inquiry'}`,
                    timestamp: message.timestamp,
                    email: message.email,
                    read: message.read || false
                });
            }
        });
        
        // Sort by timestamp (most recent first)
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Return top 10
        return activities.slice(0, 10);
    } catch (error) {
        console.error('[ADMIN] Error getting recent activity:', error);
        return [];
    }
}

/**
 * ========== CONTACT MESSAGES MANAGEMENT ==========
 */

/**
 * Handle get contact messages
 */
function handleGetContactMessages(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    // Reload sessions from file to get latest (in case they were updated)
    sessions = loadSessions();
    
    if (!sessionId) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized - No session ID provided',
            statusCode: 401
        });
    }
    
    if (!sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized - Session not found or expired',
            statusCode: 401
        });
    }
    
    // Check if session expired
    const session = sessions[sessionId];
    if (new Date(session.expiresAt) < new Date()) {
        delete sessions[sessionId];
        saveSessions();
        return apiRouter.sendError(res, {
            message: 'Unauthorized - Session expired',
            statusCode: 401
        });
    }
    
    try {
        const messages = loadContactMessages();
        
        // Get query parameters for filtering
        const url = new URL(req.url, `http://${req.headers.host}`);
        const unreadOnly = url.searchParams.get('unread') === 'true';
        const limit = parseInt(url.searchParams.get('limit') || '50');
        
        let filteredMessages = messages;
        
        if (unreadOnly) {
            filteredMessages = messages.filter(m => !m.read);
        }
        
        // Limit results
        filteredMessages = filteredMessages.slice(0, limit);
        
        apiRouter.sendSuccess(res, {
            messages: filteredMessages,
            total: messages.length,
            unread: messages.filter(m => !m.read).length
        }, 'Contact messages retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving contact messages',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * ========== MEDIA MANAGEMENT ==========
 */

/**
 * Handle media upload
 */
function handleMediaUpload(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }
    
    // Check content type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        return apiRouter.sendError(res, {
            message: 'Content-Type must be multipart/form-data',
            statusCode: 400
        });
    }
    
    // Parse multipart form data manually (simple implementation)
    const chunks = [];
    let boundary = '';
    
    req.on('data', chunk => {
        chunks.push(chunk);
    });
    
    req.on('end', () => {
        try {
            const buffer = Buffer.concat(chunks);
            const body = buffer.toString('binary');
            
            // Extract boundary
            const contentTypeHeader = req.headers['content-type'] || '';
            boundary = contentTypeHeader.split('boundary=')[1];
            
            if (!boundary) {
                return apiRouter.sendError(res, {
                    message: 'Invalid multipart form data',
                    statusCode: 400
                });
            }
            
            // Split by boundary
            const parts = body.split('--' + boundary);
            
            let filename = null;
            let fileContent = null;
            let fileType = null;
            
            for (const part of parts) {
                if (part.includes('Content-Disposition')) {
                    // Extract filename
                    const filenameMatch = part.match(/filename="([^"]+)"/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                    
                    // Extract Content-Type
                    const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
                    if (contentTypeMatch) {
                        fileType = contentTypeMatch[1].trim();
                    }
                    
                    // Extract file content (after headers and empty line)
                    const contentStart = part.indexOf('\r\n\r\n');
                    if (contentStart !== -1) {
                        const content = part.substring(contentStart + 4);
                        // Remove trailing boundary markers
                        const cleanContent = content.replace(/--\r\n$/, '').trim();
                        if (cleanContent) {
                            fileContent = Buffer.from(cleanContent, 'binary');
                        }
                    }
                }
            }
            
            if (!filename || !fileContent) {
                return apiRouter.sendError(res, {
                    message: 'No file uploaded',
                    statusCode: 400
                });
            }
            
            // Validate file type
            const allowedTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'video/mp4', 'video/webm', 'video/ogg',
                'application/pdf',
                'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'
            ];
            
            if (!allowedTypes.includes(fileType)) {
                return apiRouter.sendError(res, {
                    message: `File type ${fileType} not allowed. Allowed types: images, videos, PDFs, audio`,
                    statusCode: 400
                });
            }
            
            // Validate file size (max 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (fileContent.length > maxSize) {
                return apiRouter.sendError(res, {
                    message: 'File size exceeds 50MB limit',
                    statusCode: 400
                });
            }
            
            // Create media directory if it doesn't exist
            const mediaDir = PMS.frontend('assets', 'media');
            if (!fs.existsSync(mediaDir)) {
                fs.mkdirSync(mediaDir, { recursive: true });
            }
            
            // Generate unique filename
            const timestamp = Date.now();
            const ext = filename.split('.').pop();
            const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
            const uniqueFilename = `${baseName}_${timestamp}.${ext}`;
            const filePath = PMS.frontend('assets', 'media', uniqueFilename);
            
            // Save file
            fs.writeFileSync(filePath, fileContent);
            
            // Get file stats
            const stats = fs.statSync(filePath);
            
            // Return file info
            apiRouter.sendSuccess(res, {
                filename: uniqueFilename,
                originalFilename: filename,
                type: fileType,
                size: stats.size,
                url: `/assets/media/${uniqueFilename}`,
                uploadedAt: new Date().toISOString()
            }, 'File uploaded successfully');
        } catch (error) {
            apiRouter.sendError(res, {
                message: 'Error uploading file',
                error: error.message,
                statusCode: 500
            });
        }
    });
}

/**
 * Handle get media files list
 */
function handleGetMedia(req, res) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }
    
    try {
        const mediaDir = PMS.frontend('assets', 'media');
        
        if (!fs.existsSync(mediaDir)) {
            return apiRouter.sendSuccess(res, [], 'Media files retrieved successfully');
        }
        
        const files = fs.readdirSync(mediaDir);
        const mediaFiles = files
            .filter(file => {
                const filePath = PMS.frontend('assets', 'media', file);
                return fs.statSync(filePath).isFile();
            })
            .map(file => {
                const filePath = PMS.frontend('assets', 'media', file);
                const stats = fs.statSync(filePath);
                const ext = file.split('.').pop().toLowerCase();
                
                // Determine file type
                let type = 'other';
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    type = 'image';
                } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
                    type = 'video';
                } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                    type = 'audio';
                } else if (ext === 'pdf') {
                    type = 'document';
                }
                
                return {
                    filename: file,
                    type: type,
                    size: stats.size,
                    url: `/assets/media/${file}`,
                    uploadedAt: stats.birthtime.toISOString(),
                    modifiedAt: stats.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)); // Most recent first
        
        apiRouter.sendSuccess(res, mediaFiles, 'Media files retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving media files',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get single media file info
 */
function handleGetMediaFile(req, res, filename) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }
    
    try {
        const filePath = PMS.frontend('assets', 'media', filename);
        
        if (!fs.existsSync(filePath)) {
            return apiRouter.sendError(res, {
                message: 'File not found',
                statusCode: 404
            });
        }
        
        const stats = fs.statSync(filePath);
        const ext = filename.split('.').pop().toLowerCase();
        
        let type = 'other';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            type = 'image';
        } else if (['mp4', 'webm', 'ogg'].includes(ext)) {
            type = 'video';
        } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
            type = 'audio';
        } else if (ext === 'pdf') {
            type = 'document';
        }
        
        apiRouter.sendSuccess(res, {
            filename: filename,
            type: type,
            size: stats.size,
            url: `/assets/media/${filename}`,
            uploadedAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString()
        }, 'Media file retrieved successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error retrieving media file',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle delete media file
 */
function handleDeleteMedia(req, res, filename) {
    // Verify session - USE CONSISTENT PATTERN (trim whitespace)
    const authHeader = req.headers.authorization;
    const sessionId = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    if (!sessionId || !sessions[sessionId]) {
        return apiRouter.sendError(res, {
            message: 'Unauthorized',
            statusCode: 401
        });
    }
    
    try {
        const filePath = PMS.frontend('assets', 'media', filename);
        
        if (!fs.existsSync(filePath)) {
            return apiRouter.sendError(res, {
                message: 'File not found',
                statusCode: 404
            });
        }
        
        fs.unlinkSync(filePath);
        
        apiRouter.sendSuccess(res, {
            filename: filename,
            deleted: true
        }, 'Media file deleted successfully');
    } catch (error) {
        apiRouter.sendError(res, {
            message: 'Error deleting media file',
            error: error.message,
            statusCode: 500
        });
    }
}

module.exports = adminHandler;
module.exports.handler = adminHandler;
module.exports.hasPermission = hasPermission;

