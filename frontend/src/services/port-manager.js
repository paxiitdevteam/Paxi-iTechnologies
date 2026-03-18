/**
 * Port Manager System
 * Fixed port configuration for frontend resources
 * Integrated with Path Manager System (PMS)
 */

class PortManager {
    constructor() {
        this.ports = {
            server: 8000,
            api: 8000,
            frontend: 8000,
            backend: 8000,
            shared: 8000,
            reserved: {
                websocket: 8001,
                database: 8002,
                redis: 8003,
                elasticsearch: 8004
            }
        };
        this.host = 'localhost';
        this.initialize();
    }

    /**
     * Initialize Port Manager
     */
    initialize() {
        // Detect host from current location
        if (typeof window !== 'undefined') {
            this.host = window.location.hostname;
            const port = window.location.port;
            if (port) {
                this.ports.server = parseInt(port, 10);
                this.ports.api = parseInt(port, 10);
                this.ports.frontend = parseInt(port, 10);
                this.ports.backend = parseInt(port, 10);
                this.ports.shared = parseInt(port, 10);
            }
        }
    }

    /**
     * Get port for resource
     */
    getPort(resource) {
        if (this.ports[resource]) {
            return typeof this.ports[resource] === 'object' 
                ? this.ports[resource] 
                : this.ports[resource];
        }
        return this.ports.server; // Default to server port
    }

    /**
     * Get base URL for resource - detects HTTPS from page protocol
     */
    getBaseURL(resource) {
        const port = typeof this.ports[resource] === 'object' 
            ? this.ports.server 
            : this.ports[resource] || this.ports.server;
        
        // Detect protocol from current page (HTTPS if page is HTTPS)
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol; // Detects http: or https:
            return `${protocol}//${this.host}:${port}`;
        }
        
        return `http://${this.host}:${port}`;
    }

    /**
     * Get full URL for resource
     */
    getResourceURL(resource, path = '') {
        const baseURL = this.getBaseURL(resource);
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseURL}${cleanPath}`;
    }

    /**
     * Set custom port
     */
    setPort(resource, port) {
        this.ports[resource] = port;
    }

    /**
     * Set host
     */
    setHost(host) {
        this.host = host;
    }

    /**
     * Get all ports
     */
    getAllPorts() {
        return { ...this.ports };
    }
}

// Create singleton instance
const portManager = new PortManager();

// Export for different environments
if (typeof window !== 'undefined') {
    window.PortM = portManager;
    window.PortManager = PortManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = portManager;
    module.exports.PortManager = PortManager;
}

// Export for ES6 modules
if (typeof exports !== 'undefined') {
    exports.default = portManager;
    exports.PortManager = PortManager;
}

