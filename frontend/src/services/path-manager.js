/**
 * Path Manager System (PMS)
 * Centralized path management for the entire application
 * Single source of truth for all file paths
 */

class PathManager {
    constructor() {
        this.basePath = '';
        this.isProduction = false;
        this.backendStatus = null;
        this.initialize();
    }

    /**
     * Initialize the Path Manager System
     */
    initialize() {
        // Detect base path automatically
        this.detectBasePath();
        
        // Initialize port configuration (fixed ports)
        this.ports = {
            server: 8000,
            api: 8000,
            frontend: 8000,
            backend: 8000
        };
        
        // Initialize path mappings
        this.paths = {
            // Root paths
            root: this.basePath,
            
            // Frontend paths
            frontend: {
                root: this.join(this.basePath, 'frontend'),
                src: this.join(this.basePath, 'frontend', 'src'),
                assets: this.join(this.basePath, 'frontend', 'src', 'assets'),
                components: this.join(this.basePath, 'frontend', 'src', 'components'),
                pages: this.join(this.basePath, 'frontend', 'src', 'pages'),
                services: this.join(this.basePath, 'frontend', 'src', 'services'),
                cls: this.join(this.basePath, 'frontend', 'src', 'cls'),
                css: this.join(this.basePath, 'frontend', 'src', 'assets', 'css'),
                js: this.join(this.basePath, 'frontend', 'src', 'assets', 'js'),
                images: this.join(this.basePath, 'frontend', 'src', 'assets', 'images')
            },
            
            // Backend paths
            backend: {
                root: this.join(this.basePath, 'backend'),
                config: this.join(this.basePath, 'backend', 'config'),
                models: this.join(this.basePath, 'backend', 'models'),
                routes: this.join(this.basePath, 'backend', 'routes')
            },
            
            // Shared paths
            shared: {
                root: this.join(this.basePath, 'shared'),
                constants: this.join(this.basePath, 'shared', 'constants'),
                utils: this.join(this.basePath, 'shared', 'utils')
            }
        };
        
        // Initialize backend connection (async, non-blocking)
        if (typeof window !== 'undefined') {
            // Run backend check after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.initializeBackend().catch(err => {
                    console.warn('PMS: Backend initialization check failed:', err);
                });
            }, 100);
        }
    }

    /**
     * Detect base path automatically
     * FIXED: Production and Dev work identically - server.js handles file resolution
     * Frontend always uses absolute paths (e.g., /about.html, /assets/...)
     */
    detectBasePath() {
        // CRITICAL FIX: Remove production detection - dev and production work the same
        // Server.js serves files identically in both environments
        // All HTML uses absolute paths (/about.html, /assets/...) which work everywhere
        // No need to detect or change behavior between environments
        
        if (typeof window !== 'undefined') {
            // Browser environment: always use root-relative paths
            // Server.js resolves these paths correctly in both dev and production
            this.basePath = '';
            this.isProduction = false; // Don't treat as "production" - use same logic as dev
        } else {
            // Node.js environment (server-side)
            this.basePath = process.cwd();
            this.isProduction = false;
        }
    }

    /**
     * Join path segments
     */
    join(...segments) {
        return segments
            .filter(segment => segment !== null && segment !== undefined)
            .join('/')
            .replace(/\/+/g, '/')
            .replace(/\/$/, '') || '/';
    }

    /**
     * Get path for a specific resource
     */
    get(category, ...subPaths) {
        if (!this.paths[category]) {
            console.warn(`Path category "${category}" not found`);
            return this.basePath;
        }
        
        if (typeof this.paths[category] === 'string') {
            return this.join(this.paths[category], ...subPaths);
        }
        
        if (subPaths.length === 0) {
            return this.paths[category];
        }
        
        const [first, ...rest] = subPaths;
        if (this.paths[category][first]) {
            return this.join(this.paths[category][first], ...rest);
        }
        
        return this.join(this.paths[category].root || this.paths[category], ...subPaths);
    }

    /**
     * Get frontend path
     * FIXED: Always return absolute paths - works identically in dev and production
     */
    frontend(...subPaths) {
        // Always use absolute paths - server.js resolves them correctly
        // No special handling for production - dev and production work the same
        const path = this.get('frontend', ...subPaths);
        // Ensure it starts with / for absolute path
        return path.startsWith('/') ? path : '/' + path;
    }

    /**
     * Get backend path
     */
    backend(...subPaths) {
        return this.get('backend', ...subPaths);
    }

    /**
     * Get shared path
     */
    shared(...subPaths) {
        return this.get('shared', ...subPaths);
    }

    /**
     * Navigate to a page
     * FIXED: Always use absolute paths - works identically in dev and production
     */
    navigateTo(page, params = {}) {
        // Always use absolute path - server.js resolves correctly
        // Remove .html extension if page already has it
        const pageName = page.endsWith('.html') ? page.replace('.html', '') : page;
        const pagePath = `/${pageName}.html`;
        
        if (typeof window !== 'undefined') {
            let url = pagePath;
            if (Object.keys(params).length > 0) {
                const queryString = new URLSearchParams(params).toString();
                url += `?${queryString}`;
            }
            window.location.href = url;
        }
        
        return pagePath;
    }

    /**
     * Get asset path
     * FIXED: Always return absolute paths - works identically in dev and production
     */
    asset(type, filename) {
        const assetTypes = {
            css: 'css',
            js: 'js',
            image: 'images',
            font: 'fonts'
        };
        
        const assetPath = assetTypes[type] || 'assets';
        
        // Always return absolute path - server.js resolves correctly in both environments
        return `/assets/${assetPath}/${filename}`;
    }

    /**
     * Get component path
     * FIXED: Always return absolute paths - works identically in dev and production
     */
    component(name) {
        // Always return absolute path - server.js resolves correctly in both environments
        return `/components/${name}`;
    }

    /**
     * Get API endpoint path - STANDARDIZED API PATHS WITH FIXED PORT
     */
    api(endpoint) {
        // Ensure endpoint starts with /api
        let path = '';
        if (endpoint.startsWith('/api/')) {
            path = endpoint;
        } else if (endpoint.startsWith('api/')) {
            path = '/' + endpoint;
        } else if (endpoint.startsWith('/')) {
            path = '/api' + endpoint;
        } else {
            path = this.join('/api', endpoint);
        }
        
        // Return path (port is handled by server/baseURL)
        return path;
    }

    /**
     * Get port for resource
     */
    getPort(resource = 'server') {
        return this.ports[resource] || this.ports.server;
    }

    /**
     * Get base URL with fixed port - detects HTTPS from page protocol
     */
    getBaseURL(resource = 'server') {
        const port = this.getPort(resource);
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol; // Detects http: or https:
            const hostname = window.location.hostname;
            
            // If HTTPS, use relative URLs (goes through Nginx reverse proxy)
            // If HTTP, use direct port access
            if (protocol === 'https:') {
                // Return empty string for relative URLs when using HTTPS
                return '';
            }
            
            return `${protocol}//${hostname}:${port}`;
        }
        return `http://localhost:${port}`;
    }

    /**
     * Resolve relative path to absolute
     */
    resolve(relativePath) {
        if (relativePath.startsWith('/')) {
            return relativePath;
        }
        return this.join(this.basePath, relativePath);
    }

    /**
     * Set custom base path
     */
    setBasePath(path) {
        this.basePath = path;
        this.initialize();
    }

    /**
     * Get current base path
     */
    getBasePath() {
        return this.basePath;
    }

    /**
     * Backend connectivity methods
     */
    
    /**
     * Test backend connectivity - IMPROVED ERROR HANDLING
     */
    async testBackendConnection() {
        try {
            // HTTPS: Use relative path through Nginx reverse proxy
            // HTTP: Use direct port access
            const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
            let testURL;
            
            if (protocol === 'https:') {
                // HTTPS: Use relative path (goes through Nginx proxy)
                testURL = '/api/test';
            } else {
                // HTTP: Use direct port access
                const baseURL = this.getBaseURL('api');
                const testEndpoint = this.api('/test');
                testURL = `${baseURL}${testEndpoint}`;
            }
            
            // Create timeout controller for compatibility (increased timeout)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            let response;
            try {
                response = await fetch(testURL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    signal: controller.signal,
                    mode: 'cors',
                    cache: 'no-cache'
                });
                clearTimeout(timeoutId);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                // Check if it's a network error
                if (fetchError.name === 'AbortError') {
                    throw new Error('Backend connection timeout (10s) - Server may not be running');
                } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
                    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
                    const errorMsg = protocol === 'https:' 
                        ? 'Backend not reachable - Check if Nginx reverse proxy is configured for /api/'
                        : 'Backend not reachable - Check if server is running on ' + this.getBaseURL('api');
                    throw new Error(errorMsg);
                } else {
                    throw fetchError;
                }
            }
            
            // Check response status
            if (!response.ok) {
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // Response is not JSON
                }
                return {
                    success: false,
                    status: response.status,
                    message: errorData?.message || `Backend responded with status ${response.status}`,
                    data: errorData,
                    url: testURL
                };
            }
            
            // Parse response
            let data;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    // Try to parse as JSON even if content-type is wrong
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        data = { message: text, raw: true };
                    }
                }
            } catch (parseError) {
                return {
                    success: false,
                    status: response.status,
                    message: 'Backend responded but response could not be parsed',
                    error: parseError.message,
                    url: testURL
                };
            }
            
            // Check if response indicates success
            if (data && (data.success === true || data.status === 'connected' || response.status === 200)) {
                return {
                    success: true,
                    status: response.status,
                    message: data.message || 'Backend connection successful',
                    data: data,
                    url: testURL
                };
            } else {
                return {
                    success: false,
                    status: response.status,
                    message: data?.message || 'Backend connection test returned unexpected response',
                    data: data,
                    url: testURL
                };
            }
        } catch (error) {
            // Enhanced error messages
            let errorMessage = 'Backend connection failed';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error.name === 'AbortError') {
                errorMessage = 'Backend connection timeout (10s) - Server may not be running';
            } else if (error.message && error.message.includes('Failed to fetch')) {
                errorMessage = 'Backend not reachable - Check if server is running on ' + this.getBaseURL('api');
            } else {
                errorMessage = `Backend connection error: ${error.message || error.toString()}`;
            }
            
            return {
                success: false,
                status: 0,
                message: errorMessage,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                },
                url: `${this.getBaseURL('api')}${this.api('/test')}`
            };
        }
    }

    /**
     * Verify backend is reachable
     */
    async verifyBackend() {
        const result = await this.testBackendConnection();
        this.backendStatus = {
            connected: result.success,
            lastCheck: new Date().toISOString(),
            status: result.status,
            message: result.message
        };
        return result.success;
    }

    /**
     * Get backend status
     */
    getBackendStatus() {
        return this.backendStatus || {
            connected: false,
            lastCheck: null,
            status: null,
            message: 'Backend status not checked yet'
        };
    }

    /**
     * Make API request using PMS
     */
    async apiRequest(endpoint, options = {}) {
        const {
            method = 'GET',
            data = null,
            headers = {},
            ...fetchOptions
        } = options;

        const baseURL = this.getBaseURL('api');
        const apiPath = this.api(endpoint);
        const url = `${baseURL}${apiPath}`;

        const requestOptions = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...headers
            },
            ...fetchOptions
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
            requestOptions.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, requestOptions);
            
            const contentType = response.headers.get('content-type');
            let responseData;
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            if (!response.ok) {
                throw new Error(responseData.message || `API request failed: ${response.statusText}`);
            }

            return {
                success: true,
                data: responseData,
                status: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Initialize backend connection check - IMPROVED ERROR HANDLING
     */
    async initializeBackend() {
        try {
            // Verify backend on initialization
            const isConnected = await this.verifyBackend();
            
            // Log backend status with more details
            const status = this.getBackendStatus();
            if (status.connected) {
                console.log('✅ PMS: Backend connection verified', {
                    status: status.status,
                    url: `${this.getBaseURL('api')}${this.api('/test')}`,
                    timestamp: status.lastCheck
                });
            } else {
                console.warn('⚠️ PMS: Backend connection failed', {
                    message: status.message,
                    status: status.status,
                    url: `${this.getBaseURL('api')}${this.api('/test')}`,
                    timestamp: status.lastCheck,
                    suggestion: 'Make sure the server is running: node server.js'
                });
            }
        } catch (error) {
            console.warn('⚠️ PMS: Backend initialization error:', error.message);
            this.backendStatus = {
                connected: false,
                lastCheck: new Date().toISOString(),
                status: null,
                message: `Initialization error: ${error.message}`
            };
        }
    }
}

// Create singleton instance
const pathManager = new PathManager();

// Export for different environments
if (typeof window !== 'undefined') {
    // Browser environment
    window.PMS = pathManager;
    window.PathManager = PathManager;
}

if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = pathManager;
    module.exports.PathManager = PathManager;
}

// Export for ES6 modules
if (typeof exports !== 'undefined') {
    exports.default = pathManager;
    exports.PathManager = PathManager;
}

