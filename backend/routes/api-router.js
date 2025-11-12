/**
 * API Router
 * Centralized API route handler
 */

const apiConfig = require('../config/api-config');

class APIRouter {
    constructor() {
        this.routes = {};
        this.middleware = [];
        this.initialize();
    }

    /**
     * Initialize router
     */
    initialize() {
        // Register all endpoint routes
        this.registerRoutes();
    }

    /**
     * Register all routes from config
     */
    registerRoutes() {
        const { endpoints, basePath } = apiConfig;

        Object.keys(endpoints).forEach(category => {
            const categoryConfig = endpoints[category];
            const categoryBase = `${basePath}${categoryConfig.base}`;

            Object.keys(categoryConfig.routes).forEach(routeName => {
                const routePath = categoryConfig.routes[routeName];
                const fullPath = `${categoryBase}${routePath}`;
                
                this.routes[fullPath] = {
                    category,
                    route: routeName,
                    path: fullPath,
                    handler: null
                };
            });
        });
    }

    /**
     * Register route handler
     */
    registerRoute(category, route, handler) {
        const routeConfig = apiConfig.endpoints[category];
        if (!routeConfig) {
            throw new Error(`Category "${category}" not found in API config`);
        }

        const routePath = routeConfig.routes[route];
        if (!routePath) {
            throw new Error(`Route "${route}" not found in category "${category}"`);
        }

        const fullPath = `${apiConfig.basePath}${routeConfig.base}${routePath}`;
        this.routes[fullPath] = {
            category,
            route,
            path: fullPath,
            handler
        };
    }

    /**
     * Add middleware
     */
    use(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * Handle request
     */
    async handleRequest(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        // Find matching route
        const route = this.findRoute(pathname);
        
        if (!route || !route.handler) {
            return this.send404(res);
        }

        // Apply middleware
        for (const middleware of this.middleware) {
            const result = await middleware(req, res);
            if (result === false) {
                return; // Middleware blocked the request
            }
        }

        // Execute route handler
        try {
            await route.handler(req, res);
        } catch (error) {
            this.sendError(res, error);
        }
    }

    /**
     * Find matching route
     */
    findRoute(pathname) {
        // Exact match first
        if (this.routes[pathname]) {
            return this.routes[pathname];
        }

        // Pattern match (for dynamic routes like /:id)
        for (const [routePath, route] of Object.entries(this.routes)) {
            const pattern = this.pathToRegex(routePath);
            if (pattern.test(pathname)) {
                return {
                    ...route,
                    params: this.extractParams(routePath, pathname)
                };
            }
        }

        return null;
    }

    /**
     * Convert path pattern to regex
     */
    pathToRegex(path) {
        const pattern = path
            .replace(/\//g, '\\/')
            .replace(/:(\w+)/g, '([^/]+)');
        return new RegExp(`^${pattern}$`);
    }

    /**
     * Extract parameters from path
     */
    extractParams(routePath, actualPath) {
        const params = {};
        const routeParts = routePath.split('/');
        const actualParts = actualPath.split('/');

        routeParts.forEach((part, index) => {
            if (part.startsWith(':')) {
                const paramName = part.slice(1);
                params[paramName] = actualParts[index];
            }
        });

        return params;
    }

    /**
     * Send 404 response
     */
    send404(res) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(apiConfig.responseFormat.error(
            'API endpoint not found',
            null,
            404
        )));
    }

    /**
     * Send error response
     */
    sendError(res, error) {
        const statusCode = error.statusCode || 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(apiConfig.responseFormat.error(
            error.message || 'Internal server error',
            error.errors,
            statusCode
        )));
    }

    /**
     * Send success response
     */
    sendSuccess(res, data, message = 'Success', statusCode = 200) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(apiConfig.responseFormat.success(data, message)));
    }
}

// Create singleton instance
const apiRouter = new APIRouter();

module.exports = apiRouter;
module.exports.APIRouter = APIRouter;

