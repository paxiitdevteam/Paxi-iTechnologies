/**
 * Database Configuration
 * Centralized database connection settings
 * Integrated with Path Manager System (PMS)
 */

module.exports = {
    // Database type: 'sqlite', 'postgresql', 'mysql', 'mongodb'
    type: process.env.DB_TYPE || 'sqlite',
    
    // SQLite configuration (default - no setup required)
    sqlite: {
        database: './data/database.sqlite',
        // Enable WAL mode for better concurrency
        pragma: {
            journal_mode: 'WAL',
            foreign_keys: 'ON',
            synchronous: 'NORMAL'
        }
    },
    
    // Logging
    logging: process.env.DB_LOGGING === 'true' || false
};

