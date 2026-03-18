/**
 * API Path Manager System
 * Standardized API endpoint management
 * Works with Path Manager System (PMS)
 */

class APIPathManager {
    constructor() {
        this.baseURL = '';
        this.apiVersion = 'v1';
        this.endpoints = {};
        this.initialize();
    }

    /**
     * Initialize API Path Manager - INTEGRATED WITH PMS
     */
    initialize() {
        // Detect base URL
        this.detectBaseURL();

        // Load API endpoints configuration - ALL PATHS USE PMS
        this.loadEndpoints();

        // Set default headers
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Verify PMS is available
        if (typeof window !== 'undefined' && typeof window.PMS === 'undefined') {
            console.warn('PMS (Path Manager System) not found. API Path Manager requires PMS.');
        } else if (typeof window !== 'undefined' && window.PMS) {
            // Wait for PMS backend initialization, then verify backend connection
            setTimeout(() => {
                this.verifyBackendConnection();
            }, 200);
        }
    }

    /**
     * Detect base URL automatically - USE PMS AND FIXED PORT CONFIGURATION
     */
    detectBaseURL() {
        if (typeof window !== 'undefined') {
            // Priority 1: Use PMS if available (now has backend connectivity)
            if (typeof window.PMS !== 'undefined' && typeof window.PMS.getBaseURL === 'function') {
                this.baseURL = window.PMS.getBaseURL('api');
            }
            // Priority 2: Use Port Manager if available
            else if (typeof window.PortM !== 'undefined') {
                this.baseURL = window.PortM.getBaseURL('api');
            } 
            // Priority 3: Detect from location
            else {
                const protocol = window.location.protocol;
                const hostname = window.location.hostname;
                const port = window.location.port || 8000; // Fixed default port
                this.baseURL = `${protocol}//${hostname}:${port}`;
            }
        } else {
            // Node.js environment - use fixed port
            this.baseURL = process.env.API_BASE_URL || 'http://localhost:8000';
        }
    }

    /**
     * Load API endpoints configuration
     */
    loadEndpoints() {
        this.endpoints = {
            // Authentication
            auth: {
                login: '/api/auth/login',
                logout: '/api/auth/logout',
                register: '/api/auth/register',
                refresh: '/api/auth/refresh',
                verify: '/api/auth/verify'
            },

            // Users
            users: {
                list: '/api/users',
                get: (id) => `/api/users/${id}`,
                create: '/api/users',
                update: (id) => `/api/users/${id}`,
                delete: (id) => `/api/users/${id}`,
                profile: '/api/users/profile',
                updateProfile: '/api/users/profile'
            },

            // Projects
            projects: {
                list: '/api/projects',
                get: (id) => `/api/projects/${id}`,
                create: '/api/projects',
                update: (id) => `/api/projects/${id}`,
                delete: (id) => `/api/projects/${id}`,
                search: '/api/projects/search'
            },

            // Services
            services: {
                list: '/api/services',
                get: (id) => `/api/services/${id}`,
                categories: '/api/services/categories'
            },

            // Contact
            contact: {
                send: '/api/contact',
                inquiry: '/api/contact/inquiry'
            },

            // Analytics
            analytics: {
                stats: '/api/analytics/stats',
                reports: '/api/analytics/reports'
            },

            // Files
            files: {
                upload: '/api/files/upload',
                download: (id) => `/api/files/${id}`,
                delete: (id) => `/api/files/${id}`,
                list: '/api/files'
            }
        };
    }

    /**
     * Get full API URL - ALL PATHS USE PMS WITH BACKEND CONNECTIVITY
     */
    getURL(category, endpoint, params = {}) {
        let path = '';

        // Get endpoint path - USE PMS if available (now with backend connectivity)
        if (typeof window !== 'undefined' && typeof window.PMS !== 'undefined') {
            // Use PMS to get API path
            if (endpoint) {
                // If endpoint is provided, use it directly or combine with category
                if (endpoint.startsWith('/')) {
                    path = window.PMS.api(endpoint);
                } else if (category && this.endpoints[category] && this.endpoints[category][endpoint]) {
                    // Use endpoint from configuration
                    const endpointPath = this.endpoints[category][endpoint];
                    path = typeof endpointPath === 'function' 
                        ? window.PMS.api(endpointPath(params.id || params))
                        : window.PMS.api(endpointPath);
                } else {
                    // Fallback: construct path from category and endpoint
                    path = window.PMS.api(`/${category}/${endpoint}`);
                }
            } else if (category && this.endpoints[category]) {
                // Use category default endpoint
                const categoryEndpoints = this.endpoints[category];
                const defaultEndpoint = categoryEndpoints.list || categoryEndpoints.get || Object.values(categoryEndpoints)[0];
                if (defaultEndpoint) {
                    path = typeof defaultEndpoint === 'function'
                        ? window.PMS.api(defaultEndpoint(params.id || params))
                        : window.PMS.api(defaultEndpoint);
                }
            }
        } else {
            // Fallback to direct endpoint lookup
            if (this.endpoints[category]) {
                if (typeof this.endpoints[category][endpoint] === 'function') {
                    // Dynamic endpoint (requires parameters)
                    path = this.endpoints[category][endpoint](params.id || params);
                } else if (this.endpoints[category][endpoint]) {
                    path = this.endpoints[category][endpoint];
                } else {
                    console.warn(`API endpoint "${category}.${endpoint}" not found`);
                    return null;
                }
            } else {
                console.warn(`API category "${category}" not found`);
                return null;
            }
        }

        // Add query parameters
        if (params && Object.keys(params).length > 0 && typeof params !== 'string' && !params.id) {
            const queryString = new URLSearchParams(params).toString();
            path += `?${queryString}`;
        }

        // Return full URL - use PMS base URL if available
        const baseURL = (typeof window !== 'undefined' && window.PMS) 
            ? window.PMS.getBaseURL('api') 
            : this.baseURL;
        return `${baseURL}${path}`;
    }

    /**
     * Get API URL from full path (for direct API paths)
     * This method accepts a full API path like '/api/chat/session' and optional query parameters
     * @param {string} path - Full API path (e.g., '/api/chat/session')
     * @param {object} params - Optional query parameters
     * @returns {string} Full URL
     */
    getAPIUrl(path, params = {}) {
        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        
        // Get base URL - use PMS if available
        const baseURL = (typeof window !== 'undefined' && window.PMS && typeof window.PMS.getBaseURL === 'function')
            ? window.PMS.getBaseURL('api')
            : this.baseURL;
        
        // Build full URL
        let fullUrl = `${baseURL}${path}`;
        
        // Add query parameters
        if (params && typeof params === 'object' && Object.keys(params).length > 0) {
            const queryParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    queryParams.append(key, params[key]);
                }
            });
            const queryString = queryParams.toString();
            if (queryString) {
                fullUrl += `?${queryString}`;
            }
        }
        
        return fullUrl;
    }

    /**
     * Convenience methods for HTTP verbs
     */
    async get(category, endpoint, params = {}, options = {}) {
        return this.request(category, endpoint, { method: 'GET', params, ...options });
    }

    async post(category, endpoint, data = {}, options = {}) {
        return this.request(category, endpoint, { method: 'POST', data, ...options });
    }

    async put(category, endpoint, data = {}, options = {}) {
        return this.request(category, endpoint, { method: 'PUT', data, ...options });
    }

    async patch(category, endpoint, data = {}, options = {}) {
        return this.request(category, endpoint, { method: 'PATCH', data, ...options });
    }

    async delete(category, endpoint, params = {}, options = {}) {
        return this.request(category, endpoint, { method: 'DELETE', params, ...options });
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem('auth_token');
        }
        return null;
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        if (typeof window !== 'undefined' && window.localStorage) {
            if (token) {
                localStorage.setItem('auth_token', token);
            } else {
                localStorage.removeItem('auth_token');
            }
        }
    }

    /**
     * Set base URL
     */
    setBaseURL(url) {
        this.baseURL = url;
    }

    /**
     * Get base URL
     */
    getBaseURL() {
        return this.baseURL;
    }

    /**
     * Add custom endpoint
     */
    addEndpoint(category, endpoint, path) {
        if (!this.endpoints[category]) {
            this.endpoints[category] = {};
        }
        this.endpoints[category][endpoint] = path;
    }

    /**
     * Register custom endpoints
     */
    registerEndpoints(endpoints) {
        this.endpoints = {
            ...this.endpoints,
            ...endpoints
        };
    }

    /**
     * Backend connectivity integration with PMS
     */
    
    /**
     * Verify backend connection using PMS - IMPROVED ERROR HANDLING
     */
    async verifyBackendConnection() {
        if (typeof window !== 'undefined' && window.PMS && typeof window.PMS.verifyBackend === 'function') {
            try {
                const isConnected = await window.PMS.verifyBackend();
                const status = window.PMS.getBackendStatus();
                
                if (isConnected) {
                    console.log('✅ APIM: Backend connection verified via PMS', {
                        status: status.status,
                        url: this.baseURL || window.PMS.getBaseURL('api'),
                        timestamp: status.lastCheck
                    });
                } else {
                    console.warn('⚠️ APIM: Backend connection failed via PMS', {
                        message: status.message,
                        status: status.status,
                        url: this.baseURL || window.PMS.getBaseURL('api'),
                        timestamp: status.lastCheck,
                        suggestion: 'Check server logs and ensure server.js is running'
                    });
                }
                return isConnected;
            } catch (error) {
                console.warn('⚠️ APIM: Backend verification error:', {
                    error: error.message,
                    url: this.baseURL || (window.PMS ? window.PMS.getBaseURL('api') : 'unknown'),
                    suggestion: 'Verify server is running and accessible'
                });
                return false;
            }
        } else {
            console.warn('⚠️ APIM: PMS not available for backend verification');
            return false;
        }
    }

    /**
     * Get backend status from PMS
     */
    getBackendStatus() {
        if (typeof window !== 'undefined' && window.PMS && typeof window.PMS.getBackendStatus === 'function') {
            return window.PMS.getBackendStatus();
        }
        return {
            connected: false,
            lastCheck: null,
            status: null,
            message: 'PMS backend status not available'
        };
    }

    /**
     * Check if backend is connected before making request
     */
    async ensureBackendConnection() {
        const status = this.getBackendStatus();
        if (!status.connected) {
            // Try to verify connection
            await this.verifyBackendConnection();
            const newStatus = this.getBackendStatus();
            if (!newStatus.connected) {
                throw new APIError(
                    `Backend not connected: ${newStatus.message}`,
                    0,
                    { backendStatus: newStatus }
                );
            }
        }
        return true;
    }

    /**
     * Enhanced request method with backend connectivity check
     */
    async request(category, endpoint, options = {}) {
        const {
            method = 'GET',
            data = null,
            params = {},
            headers = {},
            checkBackend = true, // Option to skip backend check
            ...fetchOptions
        } = options;

        // Get URL first (needed for logging)
        const url = this.getURL(category, endpoint, params);
        if (!url) {
            throw new APIError(`Invalid API endpoint: ${category}.${endpoint}`);
        }

        // Check backend connection if enabled (non-blocking)
        if (checkBackend) {
            try {
                await this.ensureBackendConnection();
            } catch (error) {
                // If backend check fails, still attempt request but log detailed warning
                const status = this.getBackendStatus();
                console.warn('⚠️ APIM: Backend check failed, proceeding with request anyway', {
                    error: error.message,
                    backendStatus: status,
                    endpoint: `${category}.${endpoint}`,
                    url: url,
                    suggestion: 'Request will be attempted but may fail if backend is not running'
                });
            }
        }

        // Prepare request options
        const requestOptions = {
            method: method.toUpperCase(),
            headers: {
                ...this.defaultHeaders,
                ...headers
            },
            ...fetchOptions
        };

        // Add body for POST, PUT, PATCH
        if (data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
            requestOptions.body = JSON.stringify(data);
        }

        // Add authentication token if available
        const token = this.getAuthToken();
        if (token) {
            requestOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, requestOptions);
            
            // Parse response
            const contentType = response.headers.get('content-type');
            let responseData;
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            // Handle errors
            if (!response.ok) {
                throw new APIError(
                    responseData.message || `API request failed: ${response.statusText}`,
                    response.status,
                    responseData
                );
            }

            return responseData;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(
                `Network error: ${error.message}`,
                0,
                { originalError: error }
            );
        }
    }
}

/**
 * API Error class
 */
class APIError extends Error {
    constructor(message, status = 0, data = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Create singleton instance
const apiPathManager = new APIPathManager();

// Export for different environments
if (typeof window !== 'undefined') {
    window.APIM = apiPathManager;
    window.APIPathManager = APIPathManager;
    window.APIError = APIError;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiPathManager;
    module.exports.APIPathManager = APIPathManager;
    module.exports.APIError = APIError;
}

// Export for ES6 modules
if (typeof exports !== 'undefined') {
    exports.default = apiPathManager;
    exports.APIPathManager = APIPathManager;
    exports.APIError = APIError;
}

