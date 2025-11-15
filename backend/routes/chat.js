/**
 * Chat API Route Handler
 * Handles AI chat agent interactions
 * Provides 24/7 customer support via AI
 */

const apiRouter = require('./api-router');
const fs = require('fs');
const PMS = require('../utils/pms'); // Path Manager System - SINGLE SOURCE OF TRUTH

// Chat configuration
const chatConfig = require('../config/chat-config');

// AI Service (lazy loaded to avoid errors if dependencies not installed)
let aiService = null;
function getAIService() {
    if (aiService) return aiService;
    try {
        aiService = require('../services/ai-service');
        return aiService;
    } catch (error) {
        console.warn('[CHAT] AI service not available:', error.message);
        return null;
    }
}

// Learning System (lazy loaded)
let learningSystem = null;
function getLearningSystem() {
    if (learningSystem) return learningSystem;
    try {
        learningSystem = require('../services/chat-learning');
        return learningSystem;
    } catch (error) {
        console.warn('[CHAT] Learning system not available:', error.message);
        return null;
    }
}

// Rate limiting storage (in-memory, resets on server restart)
const rateLimitStore = new Map();

/**
 * Rate limiting middleware
 */
function checkRateLimit(identifier, endpoint) {
    const config = chatConfig.rateLimit;
    if (!config.enabled) return { allowed: true };
    
    const now = Date.now();
    const key = `${identifier}_${endpoint}`;
    const record = rateLimitStore.get(key) || { requests: [], firstRequest: now };
    
    // Clean old requests (older than 1 hour)
    record.requests = record.requests.filter(timestamp => now - timestamp < 60 * 60 * 1000);
    
    // Check per-minute limit
    const requestsLastMinute = record.requests.filter(timestamp => now - timestamp < 60 * 1000).length;
    if (requestsLastMinute >= config.maxRequestsPerMinute) {
        return { 
            allowed: false, 
            reason: 'Too many requests per minute',
            retryAfter: 60
        };
    }
    
    // Check per-hour limit
    const requestsLastHour = record.requests.filter(timestamp => now - timestamp < 60 * 60 * 1000).length;
    if (requestsLastHour >= config.maxRequestsPerHour) {
        return { 
            allowed: false, 
            reason: 'Too many requests per hour',
            retryAfter: 3600
        };
    }
    
    // Check per-day limit
    const requestsLastDay = record.requests.filter(timestamp => now - timestamp < 24 * 60 * 60 * 1000).length;
    if (requestsLastDay >= config.maxRequestsPerDay) {
        return { 
            allowed: false, 
            reason: 'Too many requests per day',
            retryAfter: 86400
        };
    }
    
    // Add current request
    record.requests.push(now);
    rateLimitStore.set(key, record);
    
    return { allowed: true };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req) {
    // Use session ID if available, otherwise use IP address
    const sessionId = req.headers['x-session-id'] || 
                     (req.url.includes('sessionId=') ? new URL(req.url, `http://${req.headers.host}`).searchParams.get('sessionId') : null);
    
    if (sessionId) {
        return `session_${sessionId}`;
    }
    
    // Fallback to IP address
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               'unknown';
    
    return `ip_${ip}`;
}

/**
 * Load chat conversations from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadConversations() {
    const conversationsPath = PMS.backend('data', 'chat-conversations.json');
    
    if (!fs.existsSync(conversationsPath)) {
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(conversationsPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[CHAT] Error loading conversations:', error);
        return [];
    }
}

/**
 * Save chat conversations to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveConversations(conversations) {
    const conversationsPath = PMS.backend('data', 'chat-conversations.json');
    const dataDir = PMS.backend('data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    try {
        fs.writeFileSync(conversationsPath, JSON.stringify(conversations, null, 2), 'utf8');
    } catch (error) {
        console.error('[CHAT] Error saving conversations:', error);
        throw new Error('Failed to save conversations');
    }
}

/**
 * Load chat sessions from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadSessions() {
    const sessionsPath = PMS.backend('data', 'chat-sessions.json');
    
    if (!fs.existsSync(sessionsPath)) {
        return {};
    }
    
    try {
        const fileContent = fs.readFileSync(sessionsPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[CHAT] Error loading sessions:', error);
        return {};
    }
}

/**
 * Save chat sessions to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveSessions(sessions) {
    const sessionsPath = PMS.backend('data', 'chat-sessions.json');
    const dataDir = PMS.backend('data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    try {
        fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
    } catch (error) {
        console.error('[CHAT] Error saving sessions:', error);
        throw new Error('Failed to save sessions');
    }
}

/**
 * Load chat analytics from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadAnalytics() {
    const analyticsPath = PMS.backend('data', 'chat-analytics.json');
    
    if (!fs.existsSync(analyticsPath)) {
        return {
            totalConversations: 0,
            totalMessages: 0,
            totalEscalations: 0,
            averageResponseTime: 0,
            popularQuestions: [],
            satisfactionRatings: []
        };
    }
    
    try {
        const fileContent = fs.readFileSync(analyticsPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[CHAT] Error loading analytics:', error);
        return {
            totalConversations: 0,
            totalMessages: 0,
            totalEscalations: 0,
            averageResponseTime: 0,
            popularQuestions: [],
            satisfactionRatings: []
        };
    }
}

/**
 * Save chat analytics to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveAnalytics(analytics) {
    const analyticsPath = PMS.backend('data', 'chat-analytics.json');
    const dataDir = PMS.backend('data');
    
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    try {
        fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2), 'utf8');
    } catch (error) {
        console.error('[CHAT] Error saving analytics:', error);
        throw new Error('Failed to save analytics');
    }
}

/**
 * Generate unique session ID
 */
function generateSessionId() {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate session and check expiration
 */
function validateSession(sessionId) {
    const sessions = loadSessions();
    const session = sessions[sessionId];
    
    if (!session) {
        return null;
    }
    
    // Check if session expired (24 hours)
    const sessionAge = Date.now() - new Date(session.created).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (sessionAge > maxAge) {
        // Session expired, remove it
        delete sessions[sessionId];
        saveSessions(sessions);
        return null;
    }
    
    return session;
}

/**
 * Create or get session
 */
function getOrCreateSession(sessionId) {
    const sessions = loadSessions();
    
    if (sessionId && validateSession(sessionId)) {
        return sessionId;
    }
    
    // Create new session
    const newSessionId = generateSessionId();
    sessions[newSessionId] = {
        id: newSessionId,
        created: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0
    };
    
    saveSessions(sessions);
    return newSessionId;
}

/**
 * Update session activity
 */
function updateSessionActivity(sessionId) {
    const sessions = loadSessions();
    if (sessions[sessionId]) {
        sessions[sessionId].lastActivity = new Date().toISOString();
        sessions[sessionId].messageCount = (sessions[sessionId].messageCount || 0) + 1;
        saveSessions(sessions);
    }
}

/**
 * Escape HTML to prevent XSS
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
 * Clean up expired sessions
 * Runs periodically to remove expired sessions
 */
function cleanupExpiredSessions() {
    try {
        const sessions = loadSessions();
        const now = Date.now();
        const maxAge = chatConfig.session.maxAge;
        let cleaned = 0;
        
        Object.keys(sessions).forEach(sessionId => {
            const session = sessions[sessionId];
            const sessionAge = now - new Date(session.created).getTime();
            
            if (sessionAge > maxAge) {
                delete sessions[sessionId];
                cleaned++;
            }
        });
        
        if (cleaned > 0) {
            saveSessions(sessions);
            console.log(`[CHAT] Cleaned up ${cleaned} expired session(s)`);
        }
    } catch (error) {
        console.error('[CHAT] Error cleaning up sessions:', error);
    }
}

// Start session cleanup interval
if (chatConfig.session.cleanupInterval > 0) {
    setInterval(cleanupExpiredSessions, chatConfig.session.cleanupInterval);
    console.log(`[CHAT] Session cleanup started (interval: ${chatConfig.session.cleanupInterval / 1000}s)`);
}

/**
 * Chat API Route Handler
 * Exports a function that handles chat API requests
 */
function chatHandler(req, res) {
    try {
        const method = req.method;
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        
        // Extract endpoint (e.g., /api/chat/send -> send)
        const endpoint = pathname.replace('/api/chat/', '').replace('/api/chat', '');
        
        console.log(`[CHAT API] ${method} ${pathname} - Endpoint: ${endpoint || 'root'}`);
        
        // Route to appropriate handler
        if (method === 'POST' && endpoint === 'send') {
            handleSendMessage(req, res);
        } else if (method === 'GET' && endpoint === 'history') {
            handleGetHistory(req, res);
        } else if (method === 'POST' && endpoint === 'escalate') {
            handleEscalate(req, res);
        } else if (method === 'POST' && endpoint === 'feedback') {
            handleFeedback(req, res);
        } else if (method === 'POST' && endpoint === 'upload') {
            handleFileUpload(req, res);
        } else if (method === 'GET' && endpoint.startsWith('file/')) {
            handleFileDownload(req, res);
        } else if (method === 'GET' && endpoint === 'session') {
            handleGetSession(req, res);
        } else if (method === 'GET' && endpoint === 'learning') {
            handleGetLearning(req, res);
        } else if (method === 'POST' && endpoint === 'learning') {
            // Check if it's analyze endpoint
            const url = new URL(req.url, `http://${req.headers.host}`);
            if (url.pathname.includes('analyze')) {
                handleAnalyzeLearning(req, res);
            } else {
                apiRouter.sendError(res, { message: 'Invalid learning endpoint', statusCode: 404 });
            }
        } else {
            apiRouter.sendError(res, {
                message: 'Endpoint not found',
                statusCode: 404
            });
        }
    } catch (error) {
        console.error('[CHAT API] Error in chatHandler:', error);
        apiRouter.sendError(res, {
            message: 'Internal server error',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle send message
 * POST /api/chat/send
 */
async function handleSendMessage(req, res) {
    try {
        // Rate limiting check
        const clientId = getClientIdentifier(req);
        const rateLimitCheck = checkRateLimit(clientId, 'send');
        if (!rateLimitCheck.allowed) {
            res.setHeader('Retry-After', rateLimitCheck.retryAfter);
            return apiRouter.sendError(res, {
                message: `Rate limit exceeded: ${rateLimitCheck.reason}. Please try again later.`,
                statusCode: 429
            });
        }
        
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                // Validate JSON
                let data;
                try {
                    data = JSON.parse(body);
                } catch (parseError) {
                    return apiRouter.sendError(res, {
                        message: 'Invalid JSON in request body',
                        statusCode: 400
                    });
                }
                
                const { message, sessionId, files } = data;
                
                // Validate input
                if (!message || typeof message !== 'string') {
                    return apiRouter.sendError(res, {
                        message: 'Message is required and must be a string',
                        statusCode: 400
                    });
                }
                
                const trimmedMessage = message.trim();
                
                // Check minimum length
                if (trimmedMessage.length === 0) {
                    return apiRouter.sendError(res, {
                        message: chatConfig.message.minLength > 0 ? 
                            `Message cannot be empty` : 
                            'Message is required',
                        statusCode: 400
                    });
                }
                
                // Sanitize message (prevent XSS)
                const sanitizedMessage = escapeHtml(trimmedMessage);
                
                // Limit message length
                const maxLength = chatConfig.message.maxLength || 1000;
                if (sanitizedMessage.length > maxLength) {
                    return apiRouter.sendError(res, {
                        message: `Message too long (max ${maxLength} characters)`,
                        statusCode: 400
                    });
                }
                
                // Get or create session
                const currentSessionId = getOrCreateSession(sessionId);
                updateSessionActivity(currentSessionId);
                
                // Get conversation history for context
                const conversations = loadConversations();
                const sessionConversations = conversations
                    .filter(conv => conv.sessionId === currentSessionId)
                    .slice(-chatConfig.message.maxHistory);
                
                // Generate AI response
                const startTime = Date.now();
                let aiResponse;
                let responseTime;
                
                try {
                    const aiServiceModule = getAIService();
                    if (aiServiceModule) {
                        // Use AI service
                        const aiResult = await aiServiceModule.generateAIResponse(
                            sanitizedMessage,
                            sessionConversations
                        );
                        
                        responseTime = aiResult.responseTime || (Date.now() - startTime);
                        
                        aiResponse = {
                            message: aiResult.message,
                            sessionId: currentSessionId,
                            timestamp: new Date().toISOString(),
                            model: aiResult.model || 'unknown',
                            responseTime: responseTime
                        };
                    } else {
                        // Fallback if AI service not available
                        responseTime = Date.now() - startTime;
                        aiResponse = {
                            message: "Thank you for your message! The AI chat feature is currently being configured. Please use the contact form for immediate assistance.",
                            sessionId: currentSessionId,
                            timestamp: new Date().toISOString(),
                            model: 'fallback',
                            responseTime: responseTime
                        };
                    }
                } catch (aiError) {
                    // AI service error - return fallback
                    console.error('[CHAT] AI service error:', aiError);
                    responseTime = Date.now() - startTime;
                    
                    // Provide engaging, marketing-oriented error messages that motivate users
                    let errorMessage = "I'm experiencing a temporary connection issue, but I'm still here to help! 💪 While we get this sorted, I'd love to tell you about our services. We specialize in Smart IT Management and help businesses achieve clear, real-world results. Whether you need IT project management, cloud solutions, AI integration, or training programs, we have the expertise to help you succeed. <a href=\"/pages/services.html\">Explore our services</a> or <a href=\"/pages/contact.html\">contact us directly</a> - we'd love to discuss how we can help your business! 🚀";
                    
                    if (aiError.message && aiError.message.includes('quota')) {
                        errorMessage = "I'm currently experiencing high demand (which shows how popular our services are! 😊), but I'm still excited to help you! While we resolve this, let me share what we offer: We provide comprehensive IT solutions including AI training programs that are in high demand, cloud infrastructure solutions, and project management services. Our team has proven expertise, including work on the Paris 2024 Olympic Games. <a href=\"/pages/services.html\">Learn more about our services</a> or <a href=\"/pages/contact.html\">contact us</a> at contact@paxiit.com or call +33 7 82 39 13 11. We'd love to discuss how we can help your business achieve clear, measurable results! 🌟";
                    } else if (aiError.message && aiError.message.includes('API key')) {
                        errorMessage = "I'm having a technical moment, but that doesn't stop me from being excited about helping you! 🎯 We're Paxi iTechnologies, and we specialize in Smart IT Management with clear, real-world results. We offer amazing services like AI training programs (in high demand!), cloud solutions, and IT project management. Our team has proven expertise and we'd love to help your business succeed. <a href=\"/pages/services.html\">Discover our services</a> or <a href=\"/pages/contact.html\">reach out to us</a> at contact@paxiit.com - let's discuss how we can help you achieve your goals! 💼";
                    } else if (aiError.message && aiError.message.includes('rate limit')) {
                        errorMessage = "We're experiencing high traffic right now (great sign that our services are popular! 🎉), but I'm still here to help! While we handle the volume, let me tell you about what we do: We're experts in Smart IT Management, helping businesses achieve clear, measurable results. From AI training programs to cloud infrastructure and project management, we have solutions that can transform your business. <a href=\"/pages/services.html\">Explore what we offer</a> or <a href=\"/pages/contact.html\">contact us</a> - we'd love to discuss how we can help you succeed! 🚀";
                    }
                    
                    aiResponse = {
                        message: errorMessage,
                        sessionId: currentSessionId,
                        timestamp: new Date().toISOString(),
                        model: 'error',
                        responseTime: responseTime
                    };
                }
                
                // Save conversation (reload to get latest state)
                const allConversations = loadConversations();
                allConversations.push({
                    id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    sessionId: currentSessionId,
                    userMessage: sanitizedMessage,
                    aiResponse: aiResponse.message,
                    timestamp: new Date().toISOString()
                });
                saveConversations(allConversations);
                
                // Track popular questions for learning
                const learning = getLearningSystem();
                if (learning && chatConfig.analytics.trackPopularQuestions) {
                    try {
                        learning.trackPopularQuestion(sanitizedMessage, currentSessionId);
                    } catch (error) {
                        console.warn('[CHAT] Error tracking popular question:', error);
                    }
                }
                
                // Update analytics
                const analytics = loadAnalytics();
                analytics.totalMessages += 1;
                if (chatConfig.analytics.trackResponseTimes) {
                    analytics.responseTimes = analytics.responseTimes || [];
                    analytics.responseTimes.push(responseTime);
                    // Keep only last 1000 response times
                    if (analytics.responseTimes.length > 1000) {
                        analytics.responseTimes = analytics.responseTimes.slice(-1000);
                    }
                    // Calculate average
                    const sum = analytics.responseTimes.reduce((a, b) => a + b, 0);
                    analytics.averageResponseTime = Math.round(sum / analytics.responseTimes.length);
                }
                saveAnalytics(analytics);
                
                apiRouter.sendSuccess(res, aiResponse, 'Message sent successfully');
            } catch (error) {
                console.error('[CHAT] Error processing send message:', error);
                apiRouter.sendError(res, {
                    message: 'Error processing message',
                    error: error.message,
                    statusCode: 500
                });
            }
        });
    } catch (error) {
        console.error('[CHAT] Error in handleSendMessage:', error);
        apiRouter.sendError(res, {
            message: 'Internal server error',
            statusCode: 500
        });
    }
}

/**
 * Handle get history
 * GET /api/chat/history?sessionId=xxx
 */
function handleGetHistory(req, res) {
    try {
        // Rate limiting check
        const clientId = getClientIdentifier(req);
        const rateLimitCheck = checkRateLimit(clientId, 'history');
        if (!rateLimitCheck.allowed) {
            res.setHeader('Retry-After', rateLimitCheck.retryAfter);
            return apiRouter.sendError(res, {
                message: `Rate limit exceeded: ${rateLimitCheck.reason}. Please try again later.`,
                statusCode: 429
            });
        }
        
        const url = new URL(req.url, `http://${req.headers.host}`);
        const sessionId = url.searchParams.get('sessionId');
        
        if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
            return apiRouter.sendError(res, {
                message: 'Session ID is required',
                statusCode: 400
            });
        }
        
        // Validate session
        const validatedSession = validateSession(sessionId.trim());
        if (!validatedSession) {
            return apiRouter.sendError(res, {
                message: 'Invalid or expired session',
                statusCode: 401
            });
        }
        
        // Get conversations for this session
        const conversations = loadConversations();
        const sessionConversations = conversations
            .filter(conv => conv.sessionId === sessionId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        apiRouter.sendSuccess(res, {
            sessionId,
            conversations: sessionConversations,
            count: sessionConversations.length
        }, 'Conversation history retrieved successfully');
    } catch (error) {
        console.error('[CHAT] Error in handleGetHistory:', error);
        apiRouter.sendError(res, {
            message: 'Error retrieving history',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle escalate to human
 * POST /api/chat/escalate
 */
function handleEscalate(req, res) {
    try {
        // Rate limiting check
        const clientId = getClientIdentifier(req);
        const rateLimitCheck = checkRateLimit(clientId, 'escalate');
        if (!rateLimitCheck.allowed) {
            res.setHeader('Retry-After', rateLimitCheck.retryAfter);
            return apiRouter.sendError(res, {
                message: `Rate limit exceeded: ${rateLimitCheck.reason}. Please try again later.`,
                statusCode: 429
            });
        }
        
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                // Validate JSON
                let data;
                try {
                    data = JSON.parse(body);
                } catch (parseError) {
                    return apiRouter.sendError(res, {
                        message: 'Invalid JSON in request body',
                        statusCode: 400
                    });
                }
                
                const { sessionId, reason, context } = data;
                
                // Validate session if provided
                if (sessionId) {
                    const validatedSession = validateSession(sessionId);
                    if (!validatedSession) {
                        return apiRouter.sendError(res, {
                            message: 'Invalid or expired session',
                            statusCode: 401
                        });
                    }
                }
                
                // Get conversation context
                const conversations = loadConversations();
                const sessionConversations = conversations
                    .filter(conv => conv.sessionId === sessionId)
                    .slice(-5); // Last 5 messages
                
                // Update analytics
                const analytics = loadAnalytics();
                analytics.totalEscalations += 1;
                saveAnalytics(analytics);
                
                // TODO: Create contact form pre-filled with context (Phase 5)
                apiRouter.sendSuccess(res, {
                    message: 'Escalation request received',
                    contactFormUrl: '/contact.html',
                    context: sessionConversations
                }, 'Escalation processed successfully');
            } catch (error) {
                console.error('[CHAT] Error processing escalation:', error);
                apiRouter.sendError(res, {
                    message: 'Error processing escalation',
                    error: error.message,
                    statusCode: 500
                });
            }
        });
    } catch (error) {
        console.error('[CHAT] Error in handleEscalate:', error);
        apiRouter.sendError(res, {
            message: 'Internal server error',
            statusCode: 500
        });
    }
}

/**
 * Handle feedback
 * POST /api/chat/feedback
 */
function handleFeedback(req, res) {
    try {
        // Rate limiting check
        const clientId = getClientIdentifier(req);
        const rateLimitCheck = checkRateLimit(clientId, 'feedback');
        if (!rateLimitCheck.allowed) {
            res.setHeader('Retry-After', rateLimitCheck.retryAfter);
            return apiRouter.sendError(res, {
                message: `Rate limit exceeded: ${rateLimitCheck.reason}. Please try again later.`,
                statusCode: 429
            });
        }
        
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                // Validate JSON
                let data;
                try {
                    data = JSON.parse(body);
                } catch (parseError) {
                    return apiRouter.sendError(res, {
                        message: 'Invalid JSON in request body',
                        statusCode: 400
                    });
                }
                
                const { sessionId, rating, comment } = data;
                
                // Validate rating (1-5)
                const ratingNum = parseInt(rating);
                if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                    return apiRouter.sendError(res, {
                        message: 'Rating must be a number between 1 and 5',
                        statusCode: 400
                    });
                }
                
                // Sanitize comment if provided
                let sanitizedComment = null;
                if (comment && typeof comment === 'string') {
                    sanitizedComment = escapeHtml(comment.trim());
                    if (sanitizedComment.length > 500) {
                        return apiRouter.sendError(res, {
                            message: 'Comment too long (max 500 characters)',
                            statusCode: 400
                        });
                    }
                }
                
                // Update analytics
                const analytics = loadAnalytics();
                analytics.satisfactionRatings.push({
                    sessionId: sessionId || null,
                    rating: ratingNum,
                    comment: sanitizedComment,
                    timestamp: new Date().toISOString()
                });
                
                // Calculate average rating
                const ratings = analytics.satisfactionRatings.map(r => r.rating);
                const averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                analytics.averageRating = averageRating;
                
                saveAnalytics(analytics);
                
                // Learn from feedback
                const learning = getLearningSystem();
                if (learning && chatConfig.analytics.trackSatisfaction) {
                    try {
                        // Get conversation context for learning
                        const conversations = loadConversations();
                        const sessionConversations = conversations
                            .filter(conv => conv.sessionId === sessionId)
                            .slice(-1); // Get last conversation
                        
                        const userMessage = sessionConversations.length > 0 ? sessionConversations[0].userMessage : null;
                        const aiResponse = sessionConversations.length > 0 ? sessionConversations[0].aiResponse : null;
                        
                        learning.learnFromFeedback(ratingNum, sanitizedComment, sessionId, userMessage, aiResponse);
                    } catch (error) {
                        console.warn('[CHAT] Error learning from feedback:', error);
                    }
                }
                
                apiRouter.sendSuccess(res, {
                    message: 'Feedback received',
                    averageRating
                }, 'Feedback saved successfully');
            } catch (error) {
                console.error('[CHAT] Error processing feedback:', error);
                apiRouter.sendError(res, {
                    message: 'Error processing feedback',
                    error: error.message,
                    statusCode: 500
                });
            }
        });
    } catch (error) {
        console.error('[CHAT] Error in handleFeedback:', error);
        apiRouter.sendError(res, {
            message: 'Internal server error',
            statusCode: 500
        });
    }
}

/**
 * Handle get learning insights
 * GET /api/chat/learning
 */
function handleGetLearning(req, res) {
    try {
        const learning = getLearningSystem();
        if (!learning) {
            return apiRouter.sendError(res, {
                message: 'Learning system not available',
                statusCode: 503
            });
        }
        
        const insights = learning.getLearningInsights();
        const learningData = learning.loadLearningData();
        
        apiRouter.sendSuccess(res, {
            insights: insights,
            popularQuestions: learningData.popularQuestions.slice(0, 10),
            totalLowRated: learningData.lowRatedResponses.length,
            totalHighRated: learningData.highRatedResponses.length,
            lastAnalysis: learningData.lastAnalysis,
            improvements: learningData.responseImprovements || []
        }, 'Learning insights retrieved');
    } catch (error) {
        console.error('[CHAT] Error getting learning insights:', error);
        apiRouter.sendError(res, {
            message: 'Error retrieving learning insights',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle analyze learning data
 * POST /api/chat/learning/analyze
 */
function handleAnalyzeLearning(req, res) {
    try {
        const learning = getLearningSystem();
        if (!learning) {
            return apiRouter.sendError(res, {
                message: 'Learning system not available',
                statusCode: 503
            });
        }
        
        const improvements = learning.analyzeAndImprove();
        
        apiRouter.sendSuccess(res, {
            improvements: improvements,
            message: 'Learning analysis completed',
            timestamp: new Date().toISOString()
        }, 'Analysis completed successfully');
    } catch (error) {
        console.error('[CHAT] Error analyzing learning data:', error);
        apiRouter.sendError(res, {
            message: 'Error analyzing learning data',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle get session
 * GET /api/chat/session
 */
function handleGetSession(req, res) {
    try {
        // Rate limiting check (lighter limit for session requests)
        const clientId = getClientIdentifier(req);
        const rateLimitCheck = checkRateLimit(clientId, 'session');
        if (!rateLimitCheck.allowed) {
            res.setHeader('Retry-After', rateLimitCheck.retryAfter);
            return apiRouter.sendError(res, {
                message: `Rate limit exceeded: ${rateLimitCheck.reason}. Please try again later.`,
                statusCode: 429
            });
        }
        
        const url = new URL(req.url, `http://${req.headers.host}`);
        const sessionId = url.searchParams.get('sessionId');
        
        if (sessionId) {
            // Validate existing session
            if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
                return apiRouter.sendError(res, {
                    message: 'Invalid session ID format',
                    statusCode: 400
                });
            }
            
            const session = validateSession(sessionId.trim());
            if (session) {
                return apiRouter.sendSuccess(res, {
                    sessionId: sessionId.trim(),
                    valid: true,
                    session
                }, 'Session validated');
            } else {
                return apiRouter.sendError(res, {
                    message: 'Invalid or expired session',
                    statusCode: 401
                });
            }
        } else {
            // Create new session
            const newSessionId = getOrCreateSession();
            const sessions = loadSessions();
            return apiRouter.sendSuccess(res, {
                sessionId: newSessionId,
                valid: true,
                session: sessions[newSessionId]
            }, 'New session created');
        }
    } catch (error) {
        console.error('[CHAT] Error in handleGetSession:', error);
        apiRouter.sendError(res, {
            message: 'Error processing session request',
            error: error.message,
            statusCode: 500
        });
    }
}

/**
 * Handle file upload
 * POST /api/chat/upload
 */
function handleFileUpload(req, res) {
    try {
        // Rate limiting check
        const clientId = getClientIdentifier(req);
        const rateLimitCheck = checkRateLimit(clientId, 'upload');
        if (!rateLimitCheck.allowed) {
            res.setHeader('Retry-After', rateLimitCheck.retryAfter);
            return apiRouter.sendError(res, {
                message: `Rate limit exceeded: ${rateLimitCheck.reason}. Please try again later.`,
                statusCode: 429
            });
        }
        
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return apiRouter.sendError(res, {
                message: 'Invalid content type. Expected multipart/form-data',
                statusCode: 400
            });
        }
        
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
                boundary = contentType.split('boundary=')[1];
                if (!boundary) {
                    return apiRouter.sendError(res, {
                        message: 'Invalid multipart form data',
                        statusCode: 400
                    });
                }
                
                // Parse multipart data
                const parts = body.split('--' + boundary);
                
                let filename = null;
                let fileContent = null;
                let fileType = null;
                let sessionId = null;
                
                for (const part of parts) {
                    // Extract sessionId
                    if (part.includes('name="sessionId"')) {
                        const sessionMatch = part.match(/name="sessionId"\r\n\r\n([^\r\n]+)/);
                        if (sessionMatch) {
                            sessionId = sessionMatch[1].trim();
                        }
                    }
                    
                    // Extract file
                    if (part.includes('Content-Disposition') && part.includes('filename=')) {
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        if (filenameMatch) {
                            filename = filenameMatch[1];
                        }
                        
                        const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
                        if (contentTypeMatch) {
                            fileType = contentTypeMatch[1].trim();
                        }
                        
                        const contentStart = part.indexOf('\r\n\r\n');
                        if (contentStart !== -1) {
                            const content = part.substring(contentStart + 4);
                            const cleanContent = content.replace(/--\r\n$/, '').trim();
                            if (cleanContent) {
                                fileContent = Buffer.from(cleanContent, 'binary');
                            }
                        }
                    }
                }
                
                if (!filename || !fileContent) {
                    return apiRouter.sendError(res, {
                        message: 'No file provided',
                        statusCode: 400
                    });
                }
                
                // Validate file size (10MB max)
                const maxSize = 10 * 1024 * 1024;
                if (fileContent.length > maxSize) {
                    return apiRouter.sendError(res, {
                        message: 'File too large. Maximum size is 10MB',
                        statusCode: 400
                    });
                }
                
                // Validate file type (documents and images)
                const allowedTypes = [
                    // Documents
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain',
                    // Images
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/gif',
                    'image/webp'
                ];
                
                // Also check file extension as fallback
                const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
                const fileExtension = '.' + filename.split('.').pop().toLowerCase();
                
                if (!allowedTypes.includes(fileType) && !allowedExtensions.includes(fileExtension)) {
                    return apiRouter.sendError(res, {
                        message: 'Invalid file type. Allowed: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, WEBP',
                        statusCode: 400
                    });
                }
                
                // Create uploads directory if it doesn't exist
                const uploadsDir = PMS.backend('data', 'uploads');
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }
                
                // Generate unique filename
                const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const fileExtension = filename.split('.').pop();
                const savedFilename = `${fileId}.${fileExtension}`;
                const filePath = PMS.backend('data', 'uploads', savedFilename);
                
                // Save file
                fs.writeFileSync(filePath, fileContent);
                
                // Store file metadata
                const filesMetadataPath = PMS.backend('data', 'chat-files.json');
                let filesMetadata = [];
                if (fs.existsSync(filesMetadataPath)) {
                    try {
                        filesMetadata = JSON.parse(fs.readFileSync(filesMetadataPath, 'utf8'));
                    } catch (error) {
                        console.warn('[CHAT] Error loading files metadata:', error);
                    }
                }
                
                const fileMetadata = {
                    fileId: fileId,
                    originalName: filename,
                    savedName: savedFilename,
                    size: fileContent.length,
                    type: fileType,
                    sessionId: sessionId,
                    uploadedAt: new Date().toISOString(),
                    path: filePath
                };
                
                filesMetadata.push(fileMetadata);
                
                // Keep only last 1000 files
                if (filesMetadata.length > 1000) {
                    // Delete oldest files
                    const toDelete = filesMetadata.slice(0, filesMetadata.length - 1000);
                    toDelete.forEach(file => {
                        try {
                            if (fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                            }
                        } catch (error) {
                            console.warn('[CHAT] Error deleting old file:', error);
                        }
                    });
                    filesMetadata = filesMetadata.slice(-1000);
                }
                
                fs.writeFileSync(filesMetadataPath, JSON.stringify(filesMetadata, null, 2), 'utf8');
                
                // Return file info
                apiRouter.sendSuccess(res, {
                    fileId: fileId,
                    filename: filename,
                    size: fileContent.length,
                    type: fileType,
                    url: `/api/chat/file/${fileId}` // Download URL
                }, 'File uploaded successfully');
                
            } catch (error) {
                console.error('[CHAT] Error processing file upload:', error);
                apiRouter.sendError(res, {
                    message: 'Error processing file upload',
                    error: error.message,
                    statusCode: 500
                });
            }
        });
    } catch (error) {
        console.error('[CHAT] Error in handleFileUpload:', error);
        apiRouter.sendError(res, {
            message: 'Internal server error',
            statusCode: 500
        });
    }
}

/**
 * Handle file download
 * GET /api/chat/file/:fileId
 */
function handleFileDownload(req, res) {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const fileId = url.pathname.split('/').pop();
        
        if (!fileId) {
            return apiRouter.sendError(res, {
                message: 'File ID required',
                statusCode: 400
            });
        }
        
        // Load file metadata
        const filesMetadataPath = PMS.backend('data', 'chat-files.json');
        if (!fs.existsSync(filesMetadataPath)) {
            return apiRouter.sendError(res, {
                message: 'File not found',
                statusCode: 404
            });
        }
        
        const filesMetadata = JSON.parse(fs.readFileSync(filesMetadataPath, 'utf8'));
        const fileMetadata = filesMetadata.find(f => f.fileId === fileId);
        
        if (!fileMetadata || !fs.existsSync(fileMetadata.path)) {
            return apiRouter.sendError(res, {
                message: 'File not found',
                statusCode: 404
            });
        }
        
        // Send file
        const fileContent = fs.readFileSync(fileMetadata.path);
        res.setHeader('Content-Type', fileMetadata.type);
        res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.originalName}"`);
        res.setHeader('Content-Length', fileContent.length);
        res.writeHead(200);
        res.end(fileContent);
        
    } catch (error) {
        console.error('[CHAT] Error in handleFileDownload:', error);
        apiRouter.sendError(res, {
            message: 'Internal server error',
            statusCode: 500
        });
    }
}

module.exports = chatHandler;

