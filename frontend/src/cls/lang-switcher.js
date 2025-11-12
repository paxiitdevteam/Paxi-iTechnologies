/**
 * Centralized Language System (CLS) - Language Switcher
 * UI component for switching languages
 */

class LanguageSwitcher {
    constructor(containerId = 'lang-switcher', options = {}) {
        this.containerId = containerId;
        this.options = {
            showFlags: options.showFlags !== false,
            showNames: options.showNames !== false,
            position: options.position || 'top-right',
            ...options
        };
        this.container = null;
    }

    /**
     * Initialize the language switcher
     */
    async initialize() {
        // Wait for CLS to be available
        if (typeof window.CLS === 'undefined') {
            console.error('CLS (Centralized Language System) not found. Load lang-core.js first.');
            return;
        }

        // Wait for CLS to initialize
        await this.waitForCLS();

        // Create switcher UI
        this.createSwitcher();

        // Listen for language changes
        window.CLS.onLanguageChange(() => {
            this.updateSwitcher();
        });
    }

    /**
     * Wait for CLS to be initialized
     */
    async waitForCLS() {
        return new Promise((resolve) => {
            if (window.CLS && window.CLS.initialized) {
                resolve();
                return;
            }

            const checkInterval = setInterval(() => {
                if (window.CLS && window.CLS.initialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    /**
     * Create switcher UI
     */
    createSwitcher() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn(`Container with ID "${this.containerId}" not found`);
            return;
        }

        this.container = container;

        // Add CSS if not already added
        this.addStyles();

        // Create switcher HTML
        this.updateSwitcher();
    }

    /**
     * Update switcher HTML
     */
    updateSwitcher() {
        if (!this.container) return;

        const currentLang = window.CLS.getCurrentLanguage();
        const availableLangs = window.CLS.getAvailableLanguages();
        const langNames = {
            en: 'English',
            fr: 'Français',
            es: 'Español',
            de: 'Deutsch',
            ar: 'العربية'
        };

        let html = '<div class="cls-switcher">';
        html += '<button class="cls-switcher-btn" id="cls-switcher-toggle">';
        html += `<span class="cls-lang-code">${currentLang.toUpperCase()}</span>`;
        html += '<span class="cls-arrow">▼</span>';
        html += '</button>';
        html += '<div class="cls-switcher-dropdown" id="cls-switcher-dropdown">';

        availableLangs.forEach(lang => {
            const isActive = lang === currentLang;
            html += `<div class="cls-lang-option ${isActive ? 'active' : ''}" data-lang="${lang}">`;
            if (this.options.showFlags) {
                html += `<span class="cls-flag">${this.getFlagEmoji(lang)}</span>`;
            }
            if (this.options.showNames) {
                html += `<span class="cls-lang-name">${langNames[lang] || lang}</span>`;
            }
            html += `<span class="cls-lang-code-small">${lang.toUpperCase()}</span>`;
            html += '</div>';
        });

        html += '</div></div>';

        this.container.innerHTML = html;

        // Add event listeners
        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const toggle = document.getElementById('cls-switcher-toggle');
        const dropdown = document.getElementById('cls-switcher-dropdown');
        const options = dropdown.querySelectorAll('.cls-lang-option');

        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });
        }

        options.forEach(option => {
            option.addEventListener('click', () => {
                const lang = option.getAttribute('data-lang');
                window.CLS.setLanguage(lang);
                dropdown.classList.remove('show');
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }

    /**
     * Get flag emoji for language
     */
    getFlagEmoji(langCode) {
        const flags = {
            en: '🇬🇧',
            fr: '🇫🇷',
            es: '🇪🇸',
            de: '🇩🇪',
            ar: '🇸🇦'
        };
        return flags[langCode] || '🌐';
    }

    /**
     * Add styles for switcher
     */
    addStyles() {
        if (document.getElementById('cls-switcher-styles')) return;

        const style = document.createElement('style');
        style.id = 'cls-switcher-styles';
        style.textContent = `
            .cls-switcher {
                position: relative;
                display: inline-block;
            }
            .cls-switcher-btn {
                background: #2c3e50;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                transition: background 0.3s;
            }
            .cls-switcher-btn:hover {
                background: #34495e;
            }
            .cls-arrow {
                font-size: 10px;
                transition: transform 0.3s;
            }
            .cls-switcher-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 5px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                min-width: 150px;
                display: none;
                z-index: 1000;
            }
            .cls-switcher-dropdown.show {
                display: block;
            }
            .cls-lang-option {
                padding: 10px 15px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: background 0.2s;
            }
            .cls-lang-option:hover {
                background: #f5f5f5;
            }
            .cls-lang-option.active {
                background: #e8f4f8;
                font-weight: bold;
            }
            .cls-flag {
                font-size: 20px;
            }
            .cls-lang-name {
                flex: 1;
            }
            .cls-lang-code-small {
                color: #666;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.LanguageSwitcher = LanguageSwitcher;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageSwitcher;
}

