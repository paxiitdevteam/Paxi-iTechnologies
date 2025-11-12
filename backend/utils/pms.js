/**
 * Path Manager System (PMS) - Backend Route Handlers
 * Shared PMS instance for backend route handlers
 * SINGLE SOURCE OF TRUTH for all paths
 */

const path = require('path');

class ServerPathManager {
    constructor() {
        // Get base path (project root)
        // This file is in backend/utils/, so go up 2 levels to get project root
        this.basePath = path.join(__dirname, '../..');
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
                routes: path.join(this.basePath, 'backend', 'routes'),
                utils: path.join(this.basePath, 'backend', 'utils')
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

// Create and export singleton instance
const PMS = new ServerPathManager();

module.exports = PMS;

