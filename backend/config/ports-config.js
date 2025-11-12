/**
 * Port Configuration System - Backend
 * Fixed ports for all resources
 * Node.js/CommonJS version
 */

const PortsConfig = {
    // Main server port
    server: {
        default: 8000,
        development: 8000,
        production: 8000,
        description: 'Main development server'
    },

    // API endpoints (all use same server port)
    api: {
        base: 8000,
        auth: 8000,
        users: 8000,
        projects: 8000,
        services: 8000,
        contact: 8000,
        analytics: 8000,
        files: 8000,
        description: 'API endpoints use main server port'
    },

    // Frontend resources (served from main server)
    frontend: {
        pages: 8000,
        components: 8000,
        assets: 8000,
        css: 8000,
        js: 8000,
        images: 8000,
        fonts: 8000,
        description: 'Frontend resources served from main server'
    },

    // Backend services (all use same server port)
    backend: {
        routes: 8000,
        config: 8000,
        models: 8000,
        description: 'Backend services use main server port'
    },

    // Shared resources (served from main server)
    shared: {
        constants: 8000,
        utils: 8000,
        description: 'Shared resources served from main server'
    },

    // Reserved ports (for future use)
    reserved: {
        websocket: 8001,
        database: 8002,
        redis: 8003,
        elasticsearch: 8004,
        description: 'Reserved for future services'
    }
};

/**
 * Get port for a specific resource
 */
function getPort(resource, type = 'default') {
    const config = PortsConfig[resource];
    if (!config) {
        console.warn(`Port config for "${resource}" not found, using default: 8000`);
        return 8000;
    }
    
    return config[type] || config.default || 8000;
}

/**
 * Get base URL for a resource
 */
function getBaseURL(resource, type = 'default', host = 'localhost') {
    const port = getPort(resource, type);
    return `http://${host}:${port}`;
}

/**
 * Get full URL for a resource
 */
function getResourceURL(resource, path = '', type = 'default', host = 'localhost') {
    const baseURL = getBaseURL(resource, type, host);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseURL}${cleanPath}`;
}

module.exports = {
    PortsConfig,
    getPort,
    getBaseURL,
    getResourceURL
};

