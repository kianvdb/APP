// aboutLoadingSystem.js - Simplified loading system for about page
console.log('🔄 About Page Loading System initializing...');

class AboutLoadingManager {
    constructor() {
        this.loadingStates = {
            dom: false,
            auth: false,
            accountDropdown: false,
            content: false
        };
        
        this.loadingMessages = {
            dom: 'Initializing page...',
            auth: 'Setting up account...',
            accountDropdown: 'Preparing navigation...',
            content: 'Loading content...'
        };
        
        this.overlay = null;
        this.init();
    }
    
    init() {
        this.createLoadingOverlay();
        this.checkSystems();
        
        // Fallback timeout - force completion after 3 seconds
        setTimeout(() => {
            console.log('⚠️ Loading timeout reached, forcing completion...');
            this.forceComplete();
        }, 3000);
    }
    
    createLoadingOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'about-loading-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0a0a0a;
            z-index: 50000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Sora', sans-serif;
            opacity: 1;
            transition: opacity 0.5s ease;
        `;
        
        // Logo - use APP_CONFIG if available
        const logoPath = window.APP_CONFIG 
            ? window.APP_CONFIG.getImageUrl('logo2dalma.png')
            : '/frontend/public/logo2dalma.png';
            
        const logo = document.createElement('div');
        logo.innerHTML = `
            <img src="${logoPath}" alt="Dalma AI" style="
                height: 60px;
                width: auto;
                margin-bottom: 2rem;
                filter: drop-shadow(0 0 20px rgba(0, 188, 212, 0.3));
            ">
        `;
        
        // Simple spinner
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            border: 3px solid rgba(0, 188, 212, 0.2);
            border-top: 3px solid #00bcd4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1.5rem;
        `;
        
        // Loading text
        const loadingText = document.createElement('div');
        loadingText.style.cssText = `
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
            font-weight: 500;
        `;
        loadingText.textContent = 'Loading...';
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        this.overlay.appendChild(logo);
        this.overlay.appendChild(spinner);
        this.overlay.appendChild(loadingText);
        
        document.body.appendChild(this.overlay);
    }
    
    setLoaded(component) {
        if (this.loadingStates.hasOwnProperty(component)) {
            this.loadingStates[component] = true;
            console.log(`✅ About page: ${component} loaded`);
            this.checkCompletion();
        }
    }
    
    checkCompletion() {
        const allLoaded = Object.values(this.loadingStates).every(Boolean);
        if (allLoaded) {
            console.log('🎉 About page fully loaded');
            this.hideOverlay();
        }
    }
    
    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                
                // Reveal page content
                const pageContent = document.querySelector('.page-content');
                if (pageContent) {
                    pageContent.classList.add('revealed');
                }
            }, 500);
        }
    }
    
    forceComplete() {
        Object.keys(this.loadingStates).forEach(component => {
            if (!this.loadingStates[component]) {
                this.setLoaded(component);
            }
        });
    }
    
    checkSystems() {
        // DOM is loaded when this runs
        this.setLoaded('dom');
        
        // Check auth system
        setTimeout(() => {
            if (window.AccountDropdown || window.authManager) {
                this.setLoaded('auth');
            } else {
                this.setLoaded('auth'); // Load anyway
            }
        }, 500);
        
        // Check account dropdown
        setTimeout(() => {
            if (window.AccountDropdown && window.AccountDropdown.isInitialized) {
                this.setLoaded('accountDropdown');
            } else {
                this.setLoaded('accountDropdown'); // Load anyway
            }
        }, 800);
        
        // Content is loaded after DOM
        setTimeout(() => {
            this.setLoaded('content');
        }, 1000);
    }
}

// Initialize only if we're not using the main loading system
if (!window.loadingManager) {
    window.aboutLoadingManager = new AboutLoadingManager();
    
    // Expose setLoaded method globally for compatibility
    window.loadingManager = {
        setLoaded: function(component) {
            if (window.aboutLoadingManager) {
                // Map homepage components to about page components
                if (component === 'model3d' || component === 'assets' || component === 'page') {
                    window.aboutLoadingManager.setLoaded('content');
                } else if (window.aboutLoadingManager.loadingStates.hasOwnProperty(component)) {
                    window.aboutLoadingManager.setLoaded(component);
                }
            }
        }
    };
}

console.log('✅ About Loading System initialized');