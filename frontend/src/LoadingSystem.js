// loadingSystem.js - Comprehensive Loading System for Homepage
class LoadingManager {
    constructor() {
        this.loadingStates = {
            dom: false,
            auth: false,
            accountDropdown: false,
            model3d: false,
            assets: false,
            page: false
        };
        
        this.loadingMessages = {
            dom: 'Initializing page...',
            auth: 'Checking authentication...',
            accountDropdown: 'Setting up navigation...',
            model3d: 'Loading 3D model...',
            assets: 'Loading assets...',
            page: 'Finalizing...'
        };
        
        this.currentMessage = '';
        this.overlay = null;
        this.messageElement = null;
        this.progressElement = null;
        this.logoElement = null;
        
        this.init();
    }
    
    init() {
        this.createLoadingOverlay();
        this.updateDisplay();
        
        // Set DOM as loaded immediately
        this.setLoaded('dom');
        
        // Start checking other systems
        this.checkSystems();
        
        // Fallback timeout - force completion after 6 seconds
        setTimeout(() => {
            console.log('⚠️ Loading timeout reached, forcing completion...');
            this.forceComplete();
        }, 6000);
    }
    
    forceComplete() {
        // Mark any unloaded components as loaded
        Object.keys(this.loadingStates).forEach(component => {
            if (!this.loadingStates[component]) {
                console.log(`⚠️ Force loading: ${component}`);
                this.setLoaded(component);
            }
        });
    }
    
    createLoadingOverlay() {
        // Create overlay with DALMA branding and modern design
        this.overlay = document.createElement('div');
        this.overlay.id = 'comprehensive-loading-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
            z-index: 50000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Sora', sans-serif;
            opacity: 1;
            transition: opacity 0.5s ease;
        `;
        
        // Logo section
        this.logoElement = document.createElement('div');
        this.logoElement.style.cssText = `
            margin-bottom: 3rem;
            text-align: center;
        `;
        this.logoElement.innerHTML = `
            <img src="/frontend/public/logo2dalma.png" alt="Dalma AI" style="
                height: 80px;
                width: auto;
                object-fit: contain;
                margin-bottom: 1rem;
                filter: drop-shadow(0 0 20px rgba(0, 188, 212, 0.3));
            ">
        `;
        
        // Loading animation
        const spinnerContainer = document.createElement('div');
        spinnerContainer.style.cssText = `
            position: relative;
            margin-bottom: 2rem;
        `;
        
        // Outer ring
        const outerRing = document.createElement('div');
        outerRing.style.cssText = `
            width: 80px;
            height: 80px;
            border: 3px solid rgba(0, 188, 212, 0.1);
            border-radius: 50%;
            position: relative;
        `;
        
        // Inner spinning element
        const innerSpinner = document.createElement('div');
        innerSpinner.style.cssText = `
            width: 80px;
            height: 80px;
            border: 3px solid transparent;
            border-top: 3px solid #00bcd4;
            border-right: 3px solid #00bcd4;
            border-radius: 50%;
            position: absolute;
            top: -3px;
            left: -3px;
            animation: spin 1.5s linear infinite;
        `;
        
        // Progress dots
        const progressDots = document.createElement('div');
        progressDots.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            gap: 4px;
        `;
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.style.cssText = `
                width: 6px;
                height: 6px;
                background: #00bcd4;
                border-radius: 50%;
                animation: pulse 1.5s ease-in-out infinite;
                animation-delay: ${i * 0.2}s;
            `;
            progressDots.appendChild(dot);
        }
        
        outerRing.appendChild(innerSpinner);
        outerRing.appendChild(progressDots);
        spinnerContainer.appendChild(outerRing);
        
        // Message display
        this.messageElement = document.createElement('div');
        this.messageElement.style.cssText = `
            color: rgba(255, 255, 255, 0.9);
            font-size: 1rem;
            font-weight: 500;
            text-align: center;
            margin-bottom: 1rem;
            min-height: 24px;
            transition: opacity 0.3s ease;
        `;
        
        // Progress bar
        this.progressElement = document.createElement('div');
        this.progressElement.style.cssText = `
            width: 300px;
            height: 4px;
            background: rgba(0, 188, 212, 0.2);
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        `;
        
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #00bcd4, #00e5ff);
            border-radius: 2px;
            width: 0%;
            transition: width 0.5s ease;
            box-shadow: 0 0 10px rgba(0, 188, 212, 0.5);
        `;
        progressBar.id = 'loading-progress-bar';
        
        this.progressElement.appendChild(progressBar);
        
        // Assembly
        this.overlay.appendChild(this.logoElement);
        this.overlay.appendChild(spinnerContainer);
        this.overlay.appendChild(this.messageElement);
        this.overlay.appendChild(this.progressElement);
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Add to page immediately
        document.body.appendChild(this.overlay);
    }
    
    setLoaded(component) {
        if (this.loadingStates.hasOwnProperty(component)) {
            this.loadingStates[component] = true;
            console.log(`✅ Loading Manager: ${component} loaded`);
            this.updateDisplay();
            this.checkCompletion();
        }
    }
    
    updateDisplay() {
        const completedCount = Object.values(this.loadingStates).filter(Boolean).length;
        const totalCount = Object.keys(this.loadingStates).length;
        const progress = (completedCount / totalCount) * 100;
        
        // Update progress bar
        const progressBar = document.getElementById('loading-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Update message to show what's currently loading
        const currentlyLoading = Object.entries(this.loadingStates)
            .find(([key, loaded]) => !loaded);
        
        if (currentlyLoading) {
            const [component] = currentlyLoading;
            this.currentMessage = this.loadingMessages[component] || 'Loading...';
        } else {
            this.currentMessage = 'Ready!';
        }
        
        if (this.messageElement) {
            this.messageElement.textContent = this.currentMessage;
        }
    }
    
    checkCompletion() {
        const allLoaded = Object.values(this.loadingStates).every(Boolean);
        
        // Debug logging
        console.log('🔍 Loading States Check:', this.loadingStates);
        console.log('🔍 All Loaded?', allLoaded);
        
        if (allLoaded) {
            console.log('🎉 All components loaded, hiding overlay...');
            setTimeout(() => {
                this.hideOverlay();
            }, 400); // Reduced from 800ms - shorter delay
        } else {
            // Show what's still loading
            const stillLoading = Object.entries(this.loadingStates)
                .filter(([key, loaded]) => !loaded)
                .map(([key]) => key);
            console.log('⏳ Still waiting for:', stillLoading);
        }
    }
    
    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                
                // Remove loading class from body
                document.body.classList.remove('loading');
                
                // Reveal page content
                const pageContent = document.querySelector('.page-content');
                if (pageContent) {
                    pageContent.style.opacity = '1';
                    pageContent.classList.add('revealed');
                }
                
                console.log('✅ Page content revealed');
            }, 500);
        }
    }
    
    checkSystems() {
        // Check auth system
        this.checkAuth();
        
        // Check if accountDropdown is ready
        this.checkAccountDropdown();
        
        // We'll mark 3D and assets as loaded from their respective systems
    }
    
    async checkAuth() {
        try {
            // Give auth system time to initialize, but not too long
            setTimeout(async () => {
                try {
                    // FIXED: Use proper protocol detection instead of hardcoded URL
                    const protocol = window.location.protocol;
                    const hostname = window.location.hostname;
                    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
                    
                    let apiUrl;
                    if (isDev) {
                        apiUrl = `http://${hostname}:3000/api/auth/me`;
                    } else {
                        // In production, use HTTPS if page is HTTPS
                        apiUrl = protocol === 'https:' 
                            ? `https://${hostname}/api/auth/me`
                            : `http://${hostname}:3000/api/auth/me`;
                    }
                    
                    const response = await fetch(apiUrl, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    
                    // Mark auth as loaded regardless of login status
                    this.setLoaded('auth');
                } catch (error) {
                    // Mark as loaded even on error
                    this.setLoaded('auth');
                }
            }, 500); // Reduced from 800ms
        } catch (error) {
            // Mark as loaded even on error
            this.setLoaded('auth');
        }
    }
    
    checkAccountDropdown() {
        // Check if accountDropdown is ready
        let attempts = 0;
        const maxAttempts = 10; // Reduced from 20
        
        const checkDropdown = () => {
            attempts++;
            
            if (window.accountDropdown && window.accountDropdown.isInitialized) {
                this.setLoaded('accountDropdown');
            } else if (attempts >= maxAttempts) {
                console.log('⚠️ AccountDropdown timeout, marking as loaded anyway');
                this.setLoaded('accountDropdown');
            } else {
                setTimeout(checkDropdown, 200); // Reduced from 300ms
            }
        };
        
        // Start checking earlier
        setTimeout(checkDropdown, 1000); // Reduced from 2000ms
    }
}

// Initialize loading manager immediately when script loads
const loadingManager = new LoadingManager();

// Export globally so other systems can report their loading status
window.loadingManager = loadingManager;

console.log('✅ Loading System initialized');