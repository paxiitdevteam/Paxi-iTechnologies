/**
 * API Configuration
 * Backend API endpoint configuration
 */

module.exports = {
    // API Version
    version: 'v1',
    
    // Base path for all API routes
    basePath: '/api',
    
    // API endpoints configuration
    endpoints: {
        // Test endpoint
        test: {
            base: '/test',
            routes: {
                test: ''
            }
        },

        // Authentication endpoints
        auth: {
            base: '/auth',
            routes: {
                login: '/login',
                logout: '/logout',
                register: '/register',
                refresh: '/refresh',
                verify: '/verify',
                forgotPassword: '/forgot-password',
                resetPassword: '/reset-password'
            }
        },

        // User endpoints
        users: {
            base: '/users',
            routes: {
                list: '',
                get: '/:id',
                create: '',
                update: '/:id',
                delete: '/:id',
                profile: '/profile',
                updateProfile: '/profile'
            }
        },

        // Project endpoints
        projects: {
            base: '/projects',
            routes: {
                list: '',
                get: '/:id',
                create: '',
                update: '/:id',
                delete: '/:id',
                search: '/search'
            }
        },

        // Service endpoints
        services: {
            base: '/services',
            routes: {
                list: '',
                get: '/:id',
                categories: '/categories'
            }
        },

        // Contact endpoints
        contact: {
            base: '/contact',
            routes: {
                send: '',
                inquiry: '/inquiry'
            }
        },

        // Analytics endpoints
        analytics: {
            base: '/analytics',
            routes: {
                stats: '/stats',
                reports: '/reports'
            }
        },

        // File endpoints
        files: {
            base: '/files',
            routes: {
                upload: '/upload',
                download: '/:id',
                delete: '/:id',
                list: ''
            }
        }
    },

    // CORS configuration
    cors: {
        enabled: true,
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: false
    },

    // Rate limiting
    rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },

    // Request timeout
    timeout: 30000, // 30 seconds

    // Response format
    responseFormat: {
        success: (data, message = 'Success') => ({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        }),
        error: (message, errors = null, code = null) => ({
            success: false,
            message,
            errors,
            code,
            timestamp: new Date().toISOString()
        })
    }
};

