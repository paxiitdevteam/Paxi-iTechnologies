/**
 * Cookie Manager System
 * Handles cookie consent, preferences, and management
 */

class CookieManager {
    constructor() {
        this.consentCookieName = 'cookie_consent';
        this.preferencesCookieName = 'cookie_preferences';
        this.consentExpiryDays = 365;
        this.preferencesExpiryDays = 365;
        
        // Cookie categories
        this.categories = {
            essential: {
                name: 'essential',
                required: true,
                enabled: true // Always enabled
            },
            performance: {
                name: 'performance',
                required: false,
                enabled: false
            },
            functionality: {
                name: 'functionality',
                required: false,
                enabled: false
            },
            analytics: {
                name: 'analytics',
                required: false,
                enabled: false
            }
        };
    }

    /**
     * Initialize cookie manager
     */
    initialize() {
        // Check if consent has been given
        const consent = this.getConsent();
        
        if (!consent) {
            // Show consent banner
            this.showConsentBanner();
        } else {
            // Load preferences
            this.loadPreferences();
        }
    }

    /**
     * Get consent status
     */
    getConsent() {
        return this.getCookie(this.consentCookieName);
    }

    /**
     * Get cookie preferences
     */
    getPreferences() {
        const preferencesJson = this.getCookie(this.preferencesCookieName);
        if (preferencesJson) {
            try {
                return JSON.parse(preferencesJson);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Set consent
     */
    setConsent(consented) {
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (this.consentExpiryDays * 24 * 60 * 60 * 1000));
        
        this.setCookie(this.consentCookieName, consented ? 'true' : 'false', expiryDate);
    }

    /**
     * Set cookie preferences
     */
    setPreferences(preferences) {
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + (this.preferencesExpiryDays * 24 * 60 * 60 * 1000));
        
        // Ensure essential cookies are always enabled
        preferences.essential = true;
        
        this.setCookie(this.preferencesCookieName, JSON.stringify(preferences), expiryDate);
        
        // Apply preferences
        this.applyPreferences(preferences);
    }

    /**
     * Load preferences and apply them
     */
    loadPreferences() {
        const preferences = this.getPreferences();
        if (preferences) {
            this.applyPreferences(preferences);
        } else {
            // Default: only essential cookies
            const defaultPrefs = {
                essential: true,
                performance: false,
                functionality: false,
                analytics: false
            };
            this.setPreferences(defaultPrefs);
        }
    }

    /**
     * Apply cookie preferences
     */
    applyPreferences(preferences) {
        // Update category states
        Object.keys(this.categories).forEach(category => {
            if (category !== 'essential') {
                this.categories[category].enabled = preferences[category] || false;
            }
        });

        // Enable/disable cookies based on preferences
        if (preferences.functionality) {
            // Functionality cookies are enabled
            // Language preference cookie is already handled by CLS
        }

        if (preferences.performance) {
            // Performance cookies enabled
            // Can add performance tracking here
        }

        if (preferences.analytics) {
            // Analytics cookies enabled
            // Can add analytics tracking here
        }
    }

    /**
     * Show consent banner
     */
    showConsentBanner() {
        // Check if banner already exists
        if (document.getElementById('cookie-consent-banner')) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-consent-banner';
        
        // Get translations
        const translations = this.getTranslations();
        
        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-consent-text">
                    <h3>${translations.consentTitle}</h3>
                    <p>${translations.consentMessage}</p>
                </div>
                <div class="cookie-consent-buttons">
                    <button class="cookie-btn cookie-btn-accept" onclick="window.cookieManager.acceptAll()">
                        ${translations.acceptAll}
                    </button>
                    <button class="cookie-btn cookie-btn-reject" onclick="window.cookieManager.rejectAll()">
                        ${translations.rejectAll}
                    </button>
                    <button class="cookie-btn cookie-btn-customize" onclick="window.cookieManager.showCustomizeModal()">
                        ${translations.customize}
                    </button>
                </div>
            </div>
        `;

        // Add styles
        this.addBannerStyles();
        
        document.body.appendChild(banner);
        
        // Animate in
        setTimeout(() => {
            banner.classList.add('show');
        }, 100);
    }

    /**
     * Show customize modal
     */
    showCustomizeModal() {
        // Hide banner temporarily
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.display = 'none';
        }

        const modal = document.createElement('div');
        modal.id = 'cookie-customize-modal';
        modal.className = 'cookie-customize-modal';
        
        const translations = this.getTranslations();
        const preferences = this.getPreferences() || {
            essential: true,
            performance: false,
            functionality: false,
            analytics: false
        };

        modal.innerHTML = `
            <div class="cookie-modal-content">
                <h2>${translations.consentTitle}</h2>
                <div class="cookie-preferences">
                    <div class="cookie-preference-item">
                        <div class="cookie-preference-header">
                            <label>
                                <input type="checkbox" checked disabled>
                                <span>${translations.essentialCookies}</span>
                            </label>
                        </div>
                        <p>${translations.essentialCookiesDesc}</p>
                    </div>
                    <div class="cookie-preference-item">
                        <div class="cookie-preference-header">
                            <label>
                                <input type="checkbox" id="pref-performance" ${preferences.performance ? 'checked' : ''}>
                                <span>${translations.performanceCookies}</span>
                            </label>
                        </div>
                        <p>${translations.performanceCookiesDesc}</p>
                    </div>
                    <div class="cookie-preference-item">
                        <div class="cookie-preference-header">
                            <label>
                                <input type="checkbox" id="pref-functionality" ${preferences.functionality ? 'checked' : ''}>
                                <span>${translations.functionalityCookies}</span>
                            </label>
                        </div>
                        <p>${translations.functionalityCookiesDesc}</p>
                    </div>
                    <div class="cookie-preference-item">
                        <div class="cookie-preference-header">
                            <label>
                                <input type="checkbox" id="pref-analytics" ${preferences.analytics ? 'checked' : ''}>
                                <span>${translations.analyticsCookies}</span>
                            </label>
                        </div>
                        <p>${translations.analyticsCookiesDesc}</p>
                    </div>
                </div>
                <div class="cookie-modal-buttons">
                    <button class="cookie-btn cookie-btn-save" onclick="window.cookieManager.saveCustomPreferences()">
                        ${translations.savePreferences}
                    </button>
                    <button class="cookie-btn cookie-btn-cancel" onclick="window.cookieManager.closeCustomizeModal()">
                        ${translations.cancel || 'Cancel'}
                    </button>
                </div>
            </div>
        `;

        this.addModalStyles();
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
    }

    /**
     * Close customize modal
     */
    closeCustomizeModal() {
        const modal = document.getElementById('cookie-customize-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                // Show banner again if consent not given
                if (!this.getConsent()) {
                    const banner = document.getElementById('cookie-consent-banner');
                    if (banner) {
                        banner.style.display = 'block';
                    }
                }
            }, 300);
        }
    }

    /**
     * Save custom preferences
     */
    saveCustomPreferences() {
        const preferences = {
            essential: true, // Always enabled
            performance: document.getElementById('pref-performance').checked,
            functionality: document.getElementById('pref-functionality').checked,
            analytics: document.getElementById('pref-analytics').checked
        };

        this.setConsent(true);
        this.setPreferences(preferences);
        this.hideBanner();
        this.closeCustomizeModal();
    }

    /**
     * Accept all cookies
     */
    acceptAll() {
        const preferences = {
            essential: true,
            performance: true,
            functionality: true,
            analytics: true
        };

        this.setConsent(true);
        this.setPreferences(preferences);
        this.hideBanner();
    }

    /**
     * Reject all cookies (except essential)
     */
    rejectAll() {
        const preferences = {
            essential: true,
            performance: false,
            functionality: false,
            analytics: false
        };

        this.setConsent(true);
        this.setPreferences(preferences);
        this.hideBanner();
    }

    /**
     * Hide consent banner
     */
    hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    }

    /**
     * Get translations
     */
    getTranslations() {
        const defaults = {
            consentTitle: 'Cookie Consent',
            consentMessage: 'We use cookies to enhance your browsing experience and analyze site traffic. By clicking "Accept All", you consent to our use of cookies.',
            acceptAll: 'Accept All',
            rejectAll: 'Reject All',
            customize: 'Customize',
            savePreferences: 'Save Preferences',
            essentialCookies: 'Essential Cookies',
            essentialCookiesDesc: 'Required for the website to function properly',
            performanceCookies: 'Performance Cookies',
            performanceCookiesDesc: 'Help us understand how visitors use our website',
            functionalityCookies: 'Functionality Cookies',
            functionalityCookiesDesc: 'Remember your preferences and personalize your experience',
            analyticsCookies: 'Analytics Cookies',
            analyticsCookiesDesc: 'Collect anonymous usage data to improve our services',
            cancel: 'Cancel'
        };

        if (typeof window.CLS !== 'undefined' && window.CLS.initialized) {
            try {
                return {
                    consentTitle: window.CLS.translate('cookies.consentTitle') || defaults.consentTitle,
                    consentMessage: window.CLS.translate('cookies.consentMessage') || defaults.consentMessage,
                    acceptAll: window.CLS.translate('cookies.acceptAll') || defaults.acceptAll,
                    rejectAll: window.CLS.translate('cookies.rejectAll') || defaults.rejectAll,
                    customize: window.CLS.translate('cookies.customize') || defaults.customize,
                    savePreferences: window.CLS.translate('cookies.savePreferences') || defaults.savePreferences,
                    essentialCookies: window.CLS.translate('cookies.essentialCookies') || defaults.essentialCookies,
                    essentialCookiesDesc: window.CLS.translate('cookies.essentialCookiesDesc') || defaults.essentialCookiesDesc,
                    performanceCookies: window.CLS.translate('cookies.performanceCookies') || defaults.performanceCookies,
                    performanceCookiesDesc: window.CLS.translate('cookies.performanceCookiesDesc') || defaults.performanceCookiesDesc,
                    functionalityCookies: window.CLS.translate('cookies.functionalityCookies') || defaults.functionalityCookies,
                    functionalityCookiesDesc: window.CLS.translate('cookies.functionalityCookiesDesc') || defaults.functionalityCookiesDesc,
                    analyticsCookies: window.CLS.translate('cookies.analyticsCookies') || defaults.analyticsCookies,
                    analyticsCookiesDesc: window.CLS.translate('cookies.analyticsCookiesDesc') || defaults.analyticsCookiesDesc,
                    cancel: window.CLS.translate('common.cancel') || defaults.cancel
                };
            } catch (e) {
                console.warn('Cookie Manager: Could not get translations, using defaults', e);
                return defaults;
            }
        }
        
        return defaults;
    }

    /**
     * Set cookie
     */
    setCookie(name, value, expiryDate) {
        const expires = expiryDate ? `expires=${expiryDate.toUTCString()}` : '';
        document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
    }

    /**
     * Get cookie
     */
    getCookie(name) {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    /**
     * Delete cookie
     */
    deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    }

    /**
     * Add banner styles
     */
    addBannerStyles() {
        if (document.getElementById('cookie-banner-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'cookie-banner-styles';
        style.textContent = `
            .cookie-consent-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #ffffff;
                box-shadow: 0 -4px 6px rgba(0, 0, 0, 0.1);
                padding: 1.5rem 2rem;
                z-index: 10000;
                transform: translateY(100%);
                transition: transform 0.3s ease;
            }
            .cookie-consent-banner.show {
                transform: translateY(0);
            }
            .cookie-consent-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 2rem;
            }
            .cookie-consent-text h3 {
                margin: 0 0 0.5rem 0;
                font-size: 1.25rem;
                color: #1f2937;
            }
            .cookie-consent-text p {
                margin: 0;
                color: #6b7280;
                font-size: 0.95rem;
            }
            .cookie-consent-buttons {
                display: flex;
                gap: 1rem;
                flex-shrink: 0;
            }
            .cookie-btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 0.375rem;
                font-size: 0.95rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            .cookie-btn-accept {
                background: #006d77;
                color: white;
            }
            .cookie-btn-accept:hover {
                background: #005a61;
            }
            .cookie-btn-reject {
                background: #e5e7eb;
                color: #1f2937;
            }
            .cookie-btn-reject:hover {
                background: #d1d5db;
            }
            .cookie-btn-customize {
                background: transparent;
                color: #006d77;
                border: 1px solid #006d77;
            }
            .cookie-btn-customize:hover {
                background: #edf6f9;
            }
            @media (max-width: 768px) {
                .cookie-consent-content {
                    flex-direction: column;
                    align-items: stretch;
                }
                .cookie-consent-buttons {
                    flex-direction: column;
                }
                .cookie-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Add modal styles
     */
    addModalStyles() {
        if (document.getElementById('cookie-modal-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'cookie-modal-styles';
        style.textContent = `
            .cookie-customize-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .cookie-customize-modal.show {
                opacity: 1;
            }
            .cookie-modal-content {
                background: white;
                border-radius: 0.5rem;
                padding: 2rem;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            .cookie-customize-modal.show .cookie-modal-content {
                transform: scale(1);
            }
            .cookie-modal-content h2 {
                margin: 0 0 1.5rem 0;
                color: #1f2937;
            }
            .cookie-preferences {
                margin-bottom: 2rem;
            }
            .cookie-preference-item {
                margin-bottom: 1.5rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid #e5e7eb;
            }
            .cookie-preference-item:last-child {
                border-bottom: none;
            }
            .cookie-preference-header label {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-weight: 600;
                color: #1f2937;
                cursor: pointer;
            }
            .cookie-preference-header input[type="checkbox"] {
                width: 1.25rem;
                height: 1.25rem;
                cursor: pointer;
            }
            .cookie-preference-item p {
                margin: 0.5rem 0 0 2rem;
                color: #6b7280;
                font-size: 0.9rem;
            }
            .cookie-modal-buttons {
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }
            .cookie-btn-save {
                background: #006d77;
                color: white;
            }
            .cookie-btn-save:hover {
                background: #005a61;
            }
            .cookie-btn-cancel {
                background: #e5e7eb;
                color: #1f2937;
            }
            .cookie-btn-cancel:hover {
                background: #d1d5db;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize cookie manager when DOM is ready
if (typeof window !== 'undefined') {
    window.cookieManager = new CookieManager();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.cookieManager.initialize();
        });
    } else {
        window.cookieManager.initialize();
    }
}

// Export is not needed - file is loaded as global script
// CookieManager is available via window.cookieManager

