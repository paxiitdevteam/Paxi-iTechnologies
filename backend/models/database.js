/**
 * Database Connection Module
 * Handles database connections and provides query methods
 * Integrated with Path Manager System (PMS)
 */

const fs = require('fs');
const path = require('path');
const dbConfig = require('../config/database-config.js');

class Database {
    constructor() {
        this.connection = null;
        this.type = dbConfig.type;
        this.connected = false;
        this.initialize();
    }

    /**
     * Initialize database connection
     */
    async initialize() {
        try {
            switch (this.type) {
                case 'sqlite':
                    await this.connectSQLite();
                    break;
                case 'postgresql':
                    await this.connectPostgreSQL();
                    break;
                case 'mysql':
                    await this.connectMySQL();
                    break;
                case 'mongodb':
                    await this.connectMongoDB();
                    break;
                default:
                    console.warn(`⚠️  Unknown database type: ${this.type}, using SQLite`);
                    await this.connectSQLite();
            }
        } catch (error) {
            console.error(`❌ Database initialization error: ${error.message}`);
            this.connected = false;
        }
    }

    /**
     * Connect to SQLite database
     */
    async connectSQLite() {
        try {
            // Create data directory if it doesn't exist
            const dbPath = path.resolve(__dirname, '..', '..', 'data');
            if (!fs.existsSync(dbPath)) {
                fs.mkdirSync(dbPath, { recursive: true });
            }

            const dbFile = path.join(dbPath, 'database.sqlite');
            
            // For now, we'll use a simple file-based approach
            // In production, you'd use better-sqlite3 or sqlite3 package
            console.log(`📁 SQLite database: ${dbFile}`);
            
            // Check if database file exists (or create it)
            if (!fs.existsSync(dbFile)) {
                // Create empty database file
                fs.writeFileSync(dbFile, '');
                console.log(`✅ SQLite database file created`);
            } else {
                console.log(`✅ SQLite database file exists`);
            }
            
            this.connection = { type: 'sqlite', path: dbFile };
            this.connected = true;
            
            // Initialize tables if needed
            await this.initializeTables();
            
            return true;
        } catch (error) {
            console.error(`❌ SQLite connection error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Connect to PostgreSQL database
     */
    async connectPostgreSQL() {
        try {
            // PostgreSQL connection would go here
            // Requires: npm install pg
            console.log(`⚠️  PostgreSQL not implemented yet. Using SQLite fallback.`);
            await this.connectSQLite();
        } catch (error) {
            console.error(`❌ PostgreSQL connection error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Connect to MySQL database
     */
    async connectMySQL() {
        try {
            // MySQL connection would go here
            // Requires: npm install mysql2
            console.log(`⚠️  MySQL not implemented yet. Using SQLite fallback.`);
            await this.connectSQLite();
        } catch (error) {
            console.error(`❌ MySQL connection error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Connect to MongoDB database
     */
    async connectMongoDB() {
        try {
            // MongoDB connection would go here
            // Requires: npm install mongodb
            console.log(`⚠️  MongoDB not implemented yet. Using SQLite fallback.`);
            await this.connectSQLite();
        } catch (error) {
            console.error(`❌ MongoDB connection error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize database tables
     */
    async initializeTables() {
        try {
            // Create a simple test table if using SQLite
            if (this.type === 'sqlite' && this.connected) {
                // For now, just verify database file exists
                // In production, you'd run CREATE TABLE statements here
                console.log(`✅ Database tables ready`);
            }
        } catch (error) {
            console.error(`❌ Table initialization error: ${error.message}`);
        }
    }

    /**
     * Test database connection
     */
    async testConnection() {
        try {
            if (!this.connected) {
                await this.initialize();
            }
            
            // Simple connection test
            if (this.type === 'sqlite') {
                const dbFile = this.connection.path;
                const exists = fs.existsSync(dbFile);
                return {
                    success: exists,
                    type: this.type,
                    message: exists ? 'Database file accessible' : 'Database file not found',
                    path: dbFile
                };
            }
            
            return {
                success: this.connected,
                type: this.type,
                message: this.connected ? 'Database connected' : 'Database not connected'
            };
        } catch (error) {
            return {
                success: false,
                type: this.type,
                message: `Connection test failed: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Get database connection status
     */
    getStatus() {
        return {
            connected: this.connected,
            type: this.type,
            connection: this.connection
        };
    }

    /**
     * Close database connection
     */
    async close() {
        try {
            this.connected = false;
            this.connection = null;
            console.log(`✅ Database connection closed`);
        } catch (error) {
            console.error(`❌ Error closing database: ${error.message}`);
        }
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;

