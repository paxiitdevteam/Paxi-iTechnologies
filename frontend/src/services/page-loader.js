/**
 * Page Loader - SINGLE INITIALIZATION SCRIPT
 * Handles all page initialization in one place
 * Prevents duplicate loading and multiple DOMContentLoaded listeners
 */

(function() {
    'use strict';
    
    // Guard to prevent multiple executions
    if (window.__PAGE_LOADER_INITIALIZED__) {
        return;
    }
    window.__PAGE_LOADER_INITIALIZED__ = true;
    
    let initialized = false;
    
    /**
     * Initialize page - SINGLE ENTRY POINT
     */
    async function initializePage() {
        if (initialized) return;
        initialized = true;
        
        // Wait for all systems to be available
        await waitForSystems();
        
        // Initialize systems in order
        initializeLanguageSystem();
        initializeLanguageSwitcher();
        loadComponents();
    }
    
    /**
     * Wait for all required systems to load
     */
    function waitForSystems() {
        return new Promise((resolve) => {
            const checkSystems = setInterval(() => {
                const systemsReady = 
                    typeof window.PMS !== 'undefined' &&
                    typeof window.PortM !== 'undefined' &&
                    typeof window.APIM !== 'undefined' &&
                    typeof window.ComponentLoader !== 'undefined';
                
                if (systemsReady) {
                    clearInterval(checkSystems);
                    resolve();
                }
            }, 50);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkSystems);
                resolve(); // Continue anyway
            }, 5000);
        });
    }
    
    /**
     * Initialize Language System
     */
    function initializeLanguageSystem() {
        if (typeof window.CLS !== 'undefined' && !window.CLS.initialized) {
            window.CLS.initialize();
        }
    }
    
    /**
     * Initialize Language Switcher
     */
    function initializeLanguageSwitcher() {
        if (typeof window.LanguageSwitcher !== 'undefined') {
            const container = document.getElementById('lang-switcher');
            if (container) {
                const switcher = new window.LanguageSwitcher('lang-switcher');
                switcher.initialize();
            }
        }
    }
    
    /**
     * Load page components - WITH DUPLICATE PREVENTION
     */
    async function loadComponents() {
        // Guard against duplicate execution
        if (window.__COMPONENTS_LOADED__) {
            return;
        }
        window.__COMPONENTS_LOADED__ = true;
        
        const loader = window.ComponentLoader || window.componentLoader;
        if (!loader) return;
        
        try {
            const headerContainer = document.getElementById('header-container');
            const footerContainer = document.getElementById('footer-container');
            
            // Check if already loaded
            if (headerContainer && !headerContainer.hasAttribute('data-component-loaded')) {
                await loader.loadHeader('#header-container');
            }
            
            if (footerContainer && !footerContainer.hasAttribute('data-component-loaded')) {
                await loader.loadFooter('#footer-container');
            }
        } catch (error) {
            console.error('❌ Error loading components:', error);
            window.__COMPONENTS_LOADED__ = false; // Reset on error
        }
    }
    
    // Initialize when DOM is ready - SINGLE EXECUTION ONLY
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage, { once: true });
    } else {
        initializePage();
    }
})();

