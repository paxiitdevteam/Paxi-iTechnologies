/**
 * Chat Configuration
 * Configuration for AI Chat Agent
 */

module.exports = {
    // AI Platform Configuration
    aiPlatform: process.env.AI_PLATFORM || 'openai', // 'openai' or 'anthropic'
    
    // API Keys (from environment variables)
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    
    // Rate Limiting
    rateLimit: {
        enabled: true,
        maxRequestsPerMinute: 10,
        maxRequestsPerHour: 100,
        maxRequestsPerDay: 500
    },
    
    // Session Configuration
    session: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        cleanupInterval: 60 * 60 * 1000 // Clean up expired sessions every hour
    },
    
    // Message Configuration
    message: {
        maxLength: 1000, // Maximum message length in characters
        minLength: 1, // Minimum message length
        maxHistory: 50 // Maximum conversation history to keep in context
    },
    
    // Response Configuration
    response: {
        maxTokens: 500, // Maximum tokens in AI response
        temperature: 0.7, // AI response creativity (0-1)
        timeout: 30000 // 30 seconds timeout for AI responses
    },
    
    // GDPR Compliance
    gdpr: {
        enabled: true,
        dataRetentionDays: 90, // Keep data for 90 days
        requireConsent: true, // Require user consent before collecting data
        allowDataDeletion: true // Allow users to delete their data
    },
    
    // Analytics Configuration
    analytics: {
        enabled: true,
        trackPopularQuestions: true,
        trackSatisfaction: true,
        trackResponseTimes: true
    },
    
    // Escalation Configuration
    escalation: {
        enabled: true,
        contactFormUrl: '/contact.html',
        prefillContext: true // Pre-fill contact form with chat context
    },
    
    // UI Configuration
    ui: {
        widgetPosition: 'bottom-right', // 'bottom-right' (translation widget is 'bottom-left')
        showTypingIndicator: true,
        showOnlineStatus: true,
        animationDuration: 300 // Animation duration in milliseconds
    },
    
    // Environment Detection
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production'
};

