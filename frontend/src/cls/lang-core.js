/**
 * Centralized Language System (CLS) - Core
 * Main language management system
 */

class LanguageSystem {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.availableLanguages = [];
        this.defaultLanguage = 'en';
        this.initialized = false;
        this.callbacks = [];
    }

    /**
     * Initialize the language system
     */
    async initialize(language = null) {
        // Detect browser language or use provided
        if (!language) {
            language = this.detectBrowserLanguage();
        }

        // Load available languages
        await this.loadAvailableLanguages();

        // Set and load language
        await this.setLanguage(language);

        this.initialized = true;
        this.notifyCallbacks();
    }

    /**
     * Detect browser language
     */
    detectBrowserLanguage() {
        if (typeof navigator !== 'undefined') {
            const browserLang = navigator.language || navigator.userLanguage;
            const langCode = browserLang.split('-')[0];
            return langCode;
        }
        return this.defaultLanguage;
    }

    /**
     * Load available languages from translations directory
     */
    async loadAvailableLanguages() {
        // Only 2 languages for now: English and French
        this.availableLanguages = ['en', 'fr'];
        
        // Try to detect from localStorage or config
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = localStorage.getItem('cls_available_languages');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Only keep languages that are in our 2-language list
                    this.availableLanguages = parsed.filter(lang => ['en', 'fr'].includes(lang));
                    // Ensure we have at least default language
                    if (this.availableLanguages.length === 0) {
                        this.availableLanguages = ['en', 'fr'];
                    }
                } catch (e) {
                    console.warn('Failed to parse available languages from storage');
                }
            }
        }
    }

    /**
     * Load translation file for a language
     */
    async loadLanguage(langCode) {
        try {
            // Use absolute path for translation file
            const translationPath = `/cls/translations/${langCode}.js`;
            
            // Dynamic import
            const module = await import(translationPath);
            const translations = module.translations || module.default || {};
            
            this.translations[langCode] = translations;
            return translations;
        } catch (error) {
            console.error(`Failed to load language "${langCode}":`, error);
            
            // Fallback to default language if not already loading it
            if (langCode !== this.defaultLanguage) {
                console.warn(`Falling back to default language: ${this.defaultLanguage}`);
                return await this.loadLanguage(this.defaultLanguage);
            }
            
            // Return empty translations as last resort
            return {};
        }
    }

    /**
     * Set current language
     */
    async setLanguage(langCode) {
        if (!this.availableLanguages.includes(langCode)) {
            console.warn(`Language "${langCode}" not available, using default`);
            langCode = this.defaultLanguage;
        }

        // Load translations if not already loaded
        if (!this.translations[langCode]) {
            await this.loadLanguage(langCode);
        }

        this.currentLanguage = langCode;

        // Save to localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('cls_current_language', langCode);
        }

        // Update HTML lang attribute
        if (typeof document !== 'undefined') {
            document.documentElement.lang = langCode;
        }

        // Notify all callbacks
        this.notifyCallbacks();
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get translation for a key
     */
    translate(key, params = {}) {
        const translations = this.translations[this.currentLanguage] || {};
        let text = this.getNestedValue(translations, key);

        // Fallback to default language if translation not found
        if (!text && this.currentLanguage !== this.defaultLanguage) {
            const defaultTranslations = this.translations[this.defaultLanguage] || {};
            text = this.getNestedValue(defaultTranslations, key);
        }

        // Fallback to key if still not found
        if (!text) {
            console.warn(`Translation key "${key}" not found`);
            return key;
        }

        // Replace parameters
        if (params && Object.keys(params).length > 0) {
            text = this.replaceParams(text, params);
        }

        return text;
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    /**
     * Replace parameters in translation string
     */
    replaceParams(text, params) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Register callback for language changes
     */
    onLanguageChange(callback) {
        this.callbacks.push(callback);
        
        // If already initialized, call immediately
        if (this.initialized) {
            callback(this.currentLanguage);
        }
    }

    /**
     * Notify all callbacks
     */
    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.currentLanguage);
            } catch (error) {
                console.error('Error in language change callback:', error);
            }
        });
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return this.availableLanguages;
    }

    /**
     * Check if language is available
     */
    isLanguageAvailable(langCode) {
        return this.availableLanguages.includes(langCode);
    }

    /**
     * Get translation object for current language
     */
    getTranslations() {
        return this.translations[this.currentLanguage] || {};
    }
}

// Create singleton instance
const languageSystem = new LanguageSystem();

// Export for different environments
if (typeof window !== 'undefined') {
    window.CLS = languageSystem;
    window.LanguageSystem = LanguageSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = languageSystem;
    module.exports.LanguageSystem = LanguageSystem;
}

// Initialization handled by page-loader.js - DO NOT auto-initialize here

