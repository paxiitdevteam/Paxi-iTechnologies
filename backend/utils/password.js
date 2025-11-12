/**
 * Password Utility Module
 * Handles password hashing and verification using bcrypt
 */

const bcrypt = require('bcrypt');

// Salt rounds for bcrypt (higher = more secure but slower)
const SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Failed to hash password');
    }
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(password, hash) {
    try {
        // Handle legacy plain text passwords (for migration)
    if (!hash || hash.length < 20) {
        // Likely a plain text password (bcrypt hashes are 60 chars)
        // For migration: compare plain text, then upgrade
        return password === hash;
    }
    
    return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Error verifying password:', error);
        return false;
    }
}

/**
 * Check if a password hash needs to be upgraded (is plain text)
 * @param {string} hash - Password hash to check
 * @returns {boolean} - True if hash needs upgrading
 */
function needsUpgrade(hash) {
    if (!hash) return true;
    // Bcrypt hashes are always 60 characters
    // Plain text passwords are typically shorter
    return hash.length < 20;
}

module.exports = {
    hashPassword,
    verifyPassword,
    needsUpgrade,
    SALT_ROUNDS
};

