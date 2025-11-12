/**
 * Path Manager System Configuration
 * Centralized configuration for path mappings
 */

export const pathConfig = {
    // Base configuration
    basePath: '',
    
    // Path aliases
    aliases: {
        '@frontend': 'frontend/src',
        '@backend': 'backend',
        '@shared': 'shared',
        '@components': 'frontend/src/components',
        '@pages': 'frontend/src/pages',
        '@services': 'frontend/src/services',
        '@assets': 'frontend/src/assets',
        '@utils': 'shared/utils',
        '@constants': 'shared/constants'
    },
    
    // File type mappings
    fileTypes: {
        css: 'css',
        js: 'js',
        images: 'images',
        fonts: 'fonts',
        icons: 'icons'
    },
    
    // Page mappings
    pages: {
        home: 'index.html',
        about: 'about.html',
        contact: 'contact.html',
        services: 'services.html',
        portfolio: 'portfolio.html',
        blog: 'blog.html'
    },
    
    // API endpoints
    api: {
        base: '/api',
        auth: '/api/auth',
        users: '/api/users',
        projects: '/api/projects'
    }
};

export default pathConfig;

