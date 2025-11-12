/**
 * Component Loader
 * Loads HTML components and injects them into pages
 * Uses PMS for path resolution
 */

class ComponentLoader {
    constructor() {
        this.components = new Map();
        this.loaded = false;
    }

    /**
     * Initialize component loader
     */
    async initialize() {
        if (this.loaded) return;
        
        // Wait for PMS to be available
        if (typeof window.PMS === 'undefined') {
            await this.waitForPMS();
        }
        
        this.loaded = true;
        console.log('✅ Component Loader initialized');
    }

    /**
     * Wait for PMS to load
     */
    waitForPMS() {
        return new Promise((resolve) => {
            const checkPMS = setInterval(() => {
                if (typeof window.PMS !== 'undefined') {
                    clearInterval(checkPMS);
                    resolve();
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkPMS);
                console.warn('⚠️ PMS not found, using fallback paths');
                resolve();
            }, 5000);
        });
    }

    /**
     * Get component path using PMS
     */
    getComponentPath(componentName) {
        if (typeof window.PMS !== 'undefined') {
            return window.PMS.frontend('components', `${componentName}.html`);
        }
        // Fallback path
        return `/components/${componentName}.html`;
    }

    /**
     * Load a component - WITH STRICT DUPLICATE PREVENTION
     */
    async loadComponent(componentName, targetSelector) {
        try {
            // STRICT CHECK: Verify target doesn't already have this component
            const target = document.querySelector(targetSelector);
            if (target && target.hasAttribute('data-component-loaded')) {
                const loadedComponent = target.getAttribute('data-component-loaded');
                if (loadedComponent === componentName) {
                    return; // Already loaded, exit immediately
                }
            }
            
            const componentPath = this.getComponentPath(componentName);
            
            // Check if already cached
            if (!this.components.has(componentName)) {
                const response = await fetch(componentPath);
                if (!response.ok) {
                    throw new Error(`Failed to load component: ${componentName} (${response.status})`);
                }

                const html = await response.text();
                this.components.set(componentName, html);
            }
            
            // Inject component
            const injected = this.injectComponent(componentName, targetSelector);
            if (injected) {
                console.log(`✅ Component loaded: ${componentName}`);
            }
        } catch (error) {
            console.error(`❌ Error loading component ${componentName}:`, error);
            throw error;
        }
    }

    /**
     * Inject component into target element
     */
    injectComponent(componentName, targetSelector) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.error(`❌ Target not found: ${targetSelector}`);
            return false;
        }

        // Check if component already loaded - STRICT CHECK
        if (target.hasAttribute('data-component-loaded') && 
            target.getAttribute('data-component-loaded') === componentName) {
            return true; // Already loaded, skip silently
        }

        const html = this.components.get(componentName);
        if (!html) {
            console.error(`❌ Component not found: ${componentName}`);
            return false;
        }

        // Clear target first
        target.innerHTML = '';

        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Move all nodes from temp to target (skip scripts)
        while (temp.firstChild) {
            const node = temp.firstChild;
            if (node && node.tagName && node.tagName.toUpperCase() !== 'SCRIPT') {
                target.appendChild(node);
            } else {
                temp.removeChild(node);
            }
        }

        // Scripts removed - initialization handled separately

        // Mark as loaded
        target.setAttribute('data-component-loaded', componentName);
        
        // Initialize component after injection
        this.initializeComponent(componentName, target);
        
        return true;
    }

    /**
     * Initialize component after injection
     */
    initializeComponent(componentName, target) {
        if (componentName === 'header') {
            // Mark active navigation item
            const currentPath = window.location.pathname;
            const navLinks = target.querySelectorAll('.nav-links a');
            navLinks.forEach(link => {
                try {
                    const linkPath = new URL(link.href).pathname;
                    if (linkPath === currentPath || (currentPath === '/' && linkPath === '/')) {
                        link.style.color = 'var(--primary-color, #2563eb)';
                        link.style.fontWeight = '600';
                    }
                } catch (e) {
                    // Ignore invalid URLs
                }
            });
        } else if (componentName === 'footer') {
            // Set current year
            const yearElement = target.querySelector('#current-year');
            if (yearElement) {
                yearElement.textContent = new Date().getFullYear();
            }
        }
    }

    /**
     * Load header component
     */
    async loadHeader(targetSelector = 'body') {
        await this.initialize();
        await this.loadComponent('header', targetSelector);
    }

    /**
     * Load footer component
     */
    async loadFooter(targetSelector = 'body') {
        await this.initialize();
        await this.loadComponent('footer', targetSelector);
    }

    /**
     * Load multiple components
     */
    async loadComponents(components) {
        await this.initialize();
        
        const promises = components.map(comp => {
            if (typeof comp === 'string') {
                return this.loadComponent(comp, 'body');
            } else {
                return this.loadComponent(comp.name, comp.target || 'body');
            }
        });
        
        await Promise.all(promises);
    }
}

// Create singleton instance
const componentLoader = new ComponentLoader();

// Make it globally available
if (typeof window !== 'undefined') {
    window.ComponentLoader = componentLoader;
    window.componentLoader = componentLoader; // Also expose lowercase for convenience
    window.loadComponent = (name, target) => componentLoader.loadComponent(name, target);
    window.loadHeader = () => componentLoader.loadHeader();
    window.loadFooter = () => componentLoader.loadFooter();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = componentLoader;
}

