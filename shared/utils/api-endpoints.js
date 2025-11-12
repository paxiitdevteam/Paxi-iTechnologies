/**
 * API Endpoints Configuration
 * Shared API endpoint definitions for frontend and backend
 */

export const APIEndpoints = {
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
        profile: '/api/users/profile'
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

export default APIEndpoints;

