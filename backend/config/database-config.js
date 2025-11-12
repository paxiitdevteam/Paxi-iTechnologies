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
    
    // PostgreSQL configuration
    postgresql: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'paxiit_website',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' || false,
        pool: {
            min: 2,
            max: 10,
            idleTimeoutMillis: 30000
        }
    },
    
    // MySQL configuration
    mysql: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        database: process.env.DB_NAME || 'paxiit_website',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        connectionLimit: 10
    },
    
    // MongoDB configuration
    mongodb: {
        url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
        database: process.env.DB_NAME || 'paxiit_website',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    },
    
    // Connection pool settings
    pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000
    },
    
    // Migration settings
    migrations: {
        directory: './migrations',
        tableName: 'migrations'
    },
    
    // Logging
    logging: process.env.DB_LOGGING === 'true' || false
};

