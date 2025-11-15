/**
 * Web Translation Plugin
 * Google Translate Widget Integration + CLS Integration
 * Provides automatic translation for all website content
 */

class TranslationPlugin {
    constructor(options = {}) {
        this.options = {
            googleTranslateEnabled: options.googleTranslateEnabled !== false,
            clsEnabled: options.clsEnabled !== false,
            position: options.position || 'bottom-right',
            showWidget: options.showWidget !== false,
            ...options
        };
        this.googleTranslateLoaded = false;
        this.widgetId = 'google_translate_element';
    }

    /**
     * Initialize the translation plugin
     */
    async initialize() {
        // Initialize CLS if enabled
        if (this.options.clsEnabled && typeof window.CLS !== 'undefined') {
            await this.initializeCLS();
        }

        // Initialize Google Translate if enabled
        if (this.options.googleTranslateEnabled) {
            await this.initializeGoogleTranslate();
        }

        // Create translation widget UI
        if (this.options.showWidget) {
            this.createWidget();
        }
    }

    /**
     * Initialize CLS integration
     */
    async initializeCLS() {
        if (!window.CLS || !window.CLS.initialized) {
            await window.CLS.initialize();
        }

        // Apply translations to all elements with data-translate attribute
        this.applyCLSTranslations();

        // Listen for language changes
        window.CLS.onLanguageChange(() => {
            this.applyCLSTranslations();
        });
    }

    /**
     * Apply CLS translations to elements
     */
    applyCLSTranslations() {
        if (!window.CLS) return;

        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            if (!key) return;
            
            // Get parameters if provided
            let params = {};
            const paramsAttr = element.getAttribute('data-translate-params');
            if (paramsAttr) {
                try {
                    params = JSON.parse(paramsAttr);
                } catch (e) {
                    console.warn('Invalid data-translate-params:', paramsAttr);
                }
            }
            
            // Special handling for footer.copyright with year
            if (key === 'footer.copyright') {
                const yearSpan = element.querySelector('#current-year');
                if (yearSpan) {
                    params.year = yearSpan.textContent || new Date().getFullYear();
                } else if (!params.year) {
                    params.year = new Date().getFullYear();
                }
            }
            
            let translation = window.CLS.translate(key, params);
            
            // Handle array translations (for features lists)
            if (Array.isArray(translation)) {
                // This is for list items - translation should be a string, not array
                // If it's an array, take the first item or use the key
                translation = translation[0] || key;
            }
            
            // Preserve HTML structure for elements with child elements
            const hasChildren = element.children.length > 0;
            if (hasChildren && key === 'footer.copyright') {
                // Special handling for footer copyright - preserve year span
                const yearSpan = element.querySelector('#current-year');
                if (yearSpan) {
                    const year = yearSpan.textContent || new Date().getFullYear();
                    element.innerHTML = translation.replace('{{year}}', year);
                } else {
                    element.innerHTML = translation;
                }
            } else if (element.innerHTML.trim() && element.innerHTML !== element.textContent.trim()) {
                // Check if element has list items or other structure to preserve
                const listItems = element.querySelectorAll('li');
                if (listItems.length > 0) {
                    // Don't replace innerHTML for lists - translate individual items instead
                    // This will be handled by individual data-translate on list items
                    return;
                }
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        });
    }

    /**
     * Initialize Google Translate
     */
    async initializeGoogleTranslate() {
        if (this.googleTranslateLoaded) return;

        // Add Google Translate script
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.head.appendChild(script);

        // Initialize Google Translate widget
        window.googleTranslateElementInit = () => {
            if (typeof google !== 'undefined' && google.translate) {
                new google.translate.TranslateElement({
                    pageLanguage: 'en',
                    includedLanguages: 'en,fr,es,de,ar,it,pt,ru,zh-CN,ja,ko',
                    layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                    autoDisplay: false,
                    multilanguagePage: true
                }, this.widgetId);
                this.googleTranslateLoaded = true;
            }
        };

        // Wait for script to load
        await new Promise((resolve) => {
            script.onload = resolve;
            setTimeout(resolve, 3000); // Timeout after 3 seconds
        });
    }

    /**
     * Create translation widget UI
     */
    createWidget() {
        // Check if widget already exists
        if (document.getElementById('translation-plugin-widget')) {
            return;
        }

        const widget = document.createElement('div');
        widget.id = 'translation-plugin-widget';
        widget.className = `translation-plugin translation-plugin-${this.options.position}`;
        
        widget.innerHTML = `
            <div class="translation-plugin-toggle" id="translation-plugin-toggle">
                <span class="translation-icon">🌐</span>
                <span class="translation-text">Translate</span>
            </div>
            <div class="translation-plugin-menu" id="translation-plugin-menu">
                <div class="translation-plugin-header">
                    <h4>Translate Website</h4>
                    <button class="translation-plugin-close" id="translation-plugin-close">&times;</button>
                </div>
                <div class="translation-plugin-content">
                    ${this.options.clsEnabled ? `
                        <div class="translation-method">
                            <h5>Manual Translation (CLS)</h5>
                            <div id="cls-translation-controls"></div>
                        </div>
                    ` : ''}
                    ${this.options.googleTranslateEnabled ? `
                        <div class="translation-method">
                            <h5>Automatic Translation (Google)</h5>
                            <div id="${this.widgetId}"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(widget);
        this.addWidgetStyles();
        this.attachWidgetEvents();

        // Initialize CLS controls if enabled
        if (this.options.clsEnabled) {
            this.createCLSControls();
        }
    }

    /**
     * Create CLS translation controls
     */
    createCLSControls() {
        const controlsDiv = document.getElementById('cls-translation-controls');
        if (!controlsDiv || !window.CLS) return;

        const currentLang = window.CLS.getCurrentLanguage();
        const availableLangs = window.CLS.getAvailableLanguages();
        const langNames = {
            en: 'English',
            fr: 'Français',
            es: 'Español',
            de: 'Deutsch',
            ar: 'العربية'
        };

        let html = '<div class="cls-lang-buttons">';
        availableLangs.forEach(lang => {
            const isActive = lang === currentLang;
            html += `
                <button class="cls-lang-btn ${isActive ? 'active' : ''}" 
                        data-lang="${lang}" 
                        onclick="window.translationPlugin.setCLSLanguage('${lang}')">
                    ${langNames[lang] || lang.toUpperCase()}
                </button>
            `;
        });
        html += '</div>';

        controlsDiv.innerHTML = html;
    }

    /**
     * Set CLS language
     */
    async setCLSLanguage(langCode) {
        if (window.CLS) {
            await window.CLS.setLanguage(langCode);
            this.applyCLSTranslations();
            this.createCLSControls(); // Update buttons
        }
    }

    /**
     * Attach widget event listeners
     */
    attachWidgetEvents() {
        const toggle = document.getElementById('translation-plugin-toggle');
        const menu = document.getElementById('translation-plugin-menu');
        const close = document.getElementById('translation-plugin-close');

        if (toggle) {
            toggle.addEventListener('click', () => {
                menu.classList.toggle('show');
            });
        }

        if (close) {
            close.addEventListener('click', () => {
                menu.classList.remove('show');
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const widget = document.getElementById('translation-plugin-widget');
            if (widget && !widget.contains(e.target)) {
                menu.classList.remove('show');
            }
        });
    }

    /**
     * Add widget styles
     */
    addWidgetStyles() {
        if (document.getElementById('translation-plugin-styles')) return;

        const style = document.createElement('style');
        style.id = 'translation-plugin-styles';
        style.textContent = `
            .translation-plugin {
                position: fixed;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .translation-plugin-bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .translation-plugin-bottom-left {
                bottom: 20px;
                left: 20px;
                /* Ensure widget stays within viewport */
                min-width: 0;
                max-width: calc(100vw - 40px);
            }
            
            .translation-plugin-top-right {
                top: 20px;
                right: 20px;
            }
            
            .translation-plugin-top-left {
                top: 20px;
                left: 20px;
                /* Ensure widget stays within viewport */
                min-width: 0;
                max-width: calc(100vw - 40px);
            }
            
            .translation-plugin-toggle {
                background: var(--primary-color, #006d77);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: all 0.3s;
                white-space: nowrap;
                /* Ensure toggle button doesn't overflow */
                max-width: calc(100vw - 40px);
            }
            
            .translation-plugin-toggle:hover {
                background: var(--secondary-color, #83c5be);
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0,0,0,0.2);
            }
            
            .translation-icon {
                font-size: 20px;
            }
            
            .translation-text {
                font-weight: 500;
                font-size: 14px;
            }
            
            .translation-plugin-menu {
                position: absolute;
                bottom: 60px;
                right: 0;
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                min-width: 320px;
                max-width: 400px;
                display: none;
                overflow: hidden;
            }
            
            /* Menu positioning for left-side widgets */
            .translation-plugin-bottom-left .translation-plugin-menu,
            .translation-plugin-top-left .translation-plugin-menu {
                right: auto;
                left: 0;
            }
            
            .translation-plugin-menu.show {
                display: block;
            }
            
            .translation-plugin-header {
                background: var(--primary-color, #006d77);
                color: white;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .translation-plugin-header h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            .translation-plugin-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .translation-plugin-close:hover {
                opacity: 0.8;
            }
            
            .translation-plugin-content {
                padding: 20px;
            }
            
            .translation-method {
                margin-bottom: 20px;
            }
            
            .translation-method:last-child {
                margin-bottom: 0;
            }
            
            .translation-method h5 {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: var(--text-dark, #1f2937);
                font-weight: 600;
            }
            
            .cls-lang-buttons {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .cls-lang-btn {
                padding: 10px 16px;
                border: 2px solid var(--border-color, #e5e7eb);
                background: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                text-align: left;
                transition: all 0.2s;
            }
            
            .cls-lang-btn:hover {
                border-color: var(--primary-color, #006d77);
                background: var(--bg-light, #edf6f9);
            }
            
            .cls-lang-btn.active {
                background: var(--primary-color, #006d77);
                color: white;
                border-color: var(--primary-color, #006d77);
            }
            
            #google_translate_element {
                margin-top: 8px;
            }
            
            /* Google Translate widget styling */
            .goog-te-banner-frame {
                display: none !important;
            }
            
            .goog-te-menu-value {
                color: var(--text-dark, #1f2937) !important;
            }
            
            /* Mobile responsive */
            @media (max-width: 768px) {
                .translation-plugin-menu {
                    min-width: 280px;
                    max-width: 90vw;
                }
                
                .translation-plugin-bottom-right {
                    bottom: 10px;
                    right: 10px;
                }
                
                /* Translation widget on left, chat widget on right */
                /* On mobile, position translation widget above chat button to avoid overlap */
                .translation-plugin-bottom-left {
                    bottom: 90px; /* Above chat button (60px button + 20px spacing + 10px gap) */
                    left: 10px;
                    z-index: 9997; /* Below chat widget */
                    /* Ensure widget and menu stay visible */
                    max-width: calc(100vw - 20px);
                }
                
                /* Ensure menu doesn't overflow on mobile */
                .translation-plugin-bottom-left .translation-plugin-menu,
                .translation-plugin-top-left .translation-plugin-menu {
                    max-width: calc(100vw - 20px);
                    left: 0;
                    right: auto;
                }
            }
            
            /* Extra small screens - ensure no overlap */
            @media (max-width: 480px) {
                .translation-plugin-bottom-left {
                    bottom: 90px !important; /* Above chat button */
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.TranslationPlugin = TranslationPlugin;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslationPlugin;
}

