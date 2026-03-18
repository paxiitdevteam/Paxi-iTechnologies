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
     * Initialize component loader - WAIT FOR PMS FIRST - RESPECT PMS
     */
    async initialize() {
        if (this.loaded) {
            console.log('✅ Component Loader already initialized');
            return;
        }
        
        console.log('🔄 Initializing Component Loader...');
        
        // ALWAYS wait for PMS to be available - RESPECT PMS AS SINGLE SOURCE OF TRUTH
        if (typeof window === 'undefined' || typeof window.PMS === 'undefined') {
            console.log('⏳ Waiting for PMS before initializing Component Loader...');
            await this.waitForPMS();
        }
        
        // Verify PMS is available
        if (typeof window !== 'undefined' && typeof window.PMS !== 'undefined') {
            console.log('✅ PMS is available for Component Loader');
            if (typeof window.PMS.component === 'function') {
                console.log('✅ PMS.component() method available');
            }
            if (typeof window.PMS.frontend === 'function') {
                console.log('✅ PMS.frontend() method available');
            }
        } else {
            console.warn('⚠️ PMS not available - Component Loader will use fallback paths');
        }
        
        this.loaded = true;
        console.log('✅ Component Loader initialized');
    }

    /**
     * Wait for PMS to load
     */
    waitForPMS() {
        return new Promise((resolve) => {
            // If PMS is already available, resolve immediately
            if (typeof window.PMS !== 'undefined') {
                console.log('✅ PMS already available');
                resolve();
                return;
            }
            
            console.log('⏳ Waiting for PMS to load...');
            const checkPMS = setInterval(() => {
                if (typeof window.PMS !== 'undefined') {
                    clearInterval(checkPMS);
                    console.log('✅ PMS loaded');
                    resolve();
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkPMS);
                console.warn('⚠️ PMS not found after 5 seconds, using fallback paths');
                resolve();
            }, 5000);
        });
    }

    /**
     * Get component path using PMS - RESPECT PMS AS SINGLE SOURCE OF TRUTH
     */
    getComponentPath(componentName) {
        // ALWAYS use PMS if available - RESPECT PMS
        if (typeof window !== 'undefined' && typeof window.PMS !== 'undefined') {
            if (typeof window.PMS.component === 'function') {
                const path = window.PMS.component(`${componentName}.html`);
                console.log(`📁 Component path (via PMS.component): ${componentName} -> ${path}`);
                return path;
            } else if (typeof window.PMS.frontend === 'function') {
                // Fallback to PMS.frontend if component method not available
                const path = window.PMS.frontend('components', `${componentName}.html`);
                console.log(`📁 Component path (via PMS.frontend): ${componentName} -> ${path}`);
                return path;
            }
        }
        // Only use fallback if PMS is completely unavailable
        console.warn(`⚠️ PMS not available, using fallback path for ${componentName}`);
        const path = `/components/${componentName}.html`;
        console.log(`📁 Component path (fallback - PMS not available): ${componentName} -> ${path}`);
        return path;
    }

    /**
     * Load a component - WITH STRICT DUPLICATE PREVENTION
     */
    async loadComponent(componentName, targetSelector) {
        try {
            console.log(`🔄 Loading component: ${componentName} into ${targetSelector}`);
            
            // Ensure PMS is available first
            await this.initialize();
            
            // Handle selector format - add # if missing
            const selector = targetSelector.startsWith('#') ? targetSelector : `#${targetSelector}`;
            console.log(`📍 Using selector: ${selector}`);
            
            // STRICT CHECK: Verify target doesn't already have this component
            const target = document.querySelector(selector);
            if (!target) {
                console.error(`❌ Target element not found: ${selector}`);
                console.error(`Available elements with id:`, Array.from(document.querySelectorAll('[id]')).map(el => el.id));
                throw new Error(`Target not found: ${selector}`);
            }
            
            if (target.hasAttribute('data-component-loaded')) {
                const loadedComponent = target.getAttribute('data-component-loaded');
                if (loadedComponent === componentName) {
                    console.log(`✅ Component ${componentName} already loaded`);
                    return; // Already loaded, exit immediately
                }
            }
            
            const componentPath = this.getComponentPath(componentName);
            console.log(`📥 Fetching component from: ${componentPath}`);
            
            // Check if already cached
            if (!this.components.has(componentName)) {
                console.log(`📡 Fetching ${componentName} from ${componentPath}...`);
                const response = await fetch(componentPath);
                console.log(`📡 Response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Failed to fetch component: ${componentName}`);
                    console.error(`Response: ${errorText.substring(0, 200)}`);
                    throw new Error(`Failed to load component: ${componentName} (${response.status})`);
                }

                const html = await response.text();
                console.log(`✅ Component HTML received (${html.length} chars)`);
                this.components.set(componentName, html);
                console.log(`✅ Component HTML cached: ${componentName}`);
            } else {
                console.log(`✅ Using cached component: ${componentName}`);
            }
            
            // Inject component
            const injected = this.injectComponent(componentName, selector);
            if (injected) {
                console.log(`✅ Component successfully loaded and injected: ${componentName}`);
            } else {
                console.error(`❌ Failed to inject component: ${componentName}`);
            }
        } catch (error) {
            console.error(`❌ Error loading component ${componentName}:`, error);
            console.error('Error details:', error.message);
            if (error.stack) {
                console.error('Error stack:', error.stack);
            }
            throw error;
        }
    }

    /**
     * Inject component into target element
     */
    injectComponent(componentName, targetSelector) {
        // targetSelector should already have # prefix from loadComponent
        const target = document.querySelector(targetSelector);
        if (!target) {
            console.error(`❌ Target not found: ${targetSelector}`);
            return false;
        }
        console.log(`💉 Injecting ${componentName} into ${targetSelector}`);

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
    // Expose the instance as ComponentLoader
    window.ComponentLoader = componentLoader;
    window.componentLoader = componentLoader; // Also expose lowercase for convenience
    
    // Ensure loadComponent is directly accessible
    // The instance already has loadComponent method, but ensure it's accessible
    if (typeof componentLoader.loadComponent === 'function') {
        console.log('✅ ComponentLoader.loadComponent method is available');
    } else {
        console.error('❌ ComponentLoader.loadComponent method NOT found on instance');
    }
    
    // Add convenience methods
    window.loadComponent = (name, target) => componentLoader.loadComponent(name, target);
    window.loadHeader = () => componentLoader.loadHeader();
    window.loadFooter = () => componentLoader.loadFooter();
    
    console.log('✅ ComponentLoader initialized and available');
    console.log('ComponentLoader methods:', Object.getOwnPropertyNames(componentLoader).filter(name => typeof componentLoader[name] === 'function'));
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = componentLoader;
}

