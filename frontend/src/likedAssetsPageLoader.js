// likedAssetsPageLoader.js - Basic Loading System for Liked Assets Page
// This version uses the same simple loading approach as homepage (not advanced transitions)

console.log('🎯 Liked Assets Page Loader - BASIC LOADING SYSTEM');

// CRITICAL: Remove any existing orbital overlays immediately when script loads
(function() {
    const removeOrbitalOverlays = () => {
        const orbitalSelectors = [
            '#page-transition-overlay',
            '#generate-replacement-overlay',
            '[id*="transition"]',
            '[id*="orbital"]'
        ];
        
        orbitalSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && el.parentNode) {
                        console.log('🚫 IMMEDIATELY removing orbital overlay:', el.id || el.className);
                        el.parentNode.removeChild(el);
                    }
                });
            } catch (error) {
                // Silently handle any errors
            }
        });
    };
    
    // Remove immediately
    removeOrbitalOverlays();
    
    // Also remove after a short delay in case they're created later
    setTimeout(removeOrbitalOverlays, 100);
    setTimeout(removeOrbitalOverlays, 500);
})();

class LikedAssetsLoadingManager {
    constructor() {
        this.loadingStates = {
            dom: false,
            auth: false,
            accountDropdown: false,
            assetsData: false,
            pageReady: false
        };
        
        this.loadingMessages = {
            dom: 'Initializing page...',
            auth: 'Checking authentication...',
            accountDropdown: 'Setting up navigation...',
            assetsData: 'Loading your liked models...',
            pageReady: 'Finalizing...'
        };
        
        this.currentMessage = '';
        this.overlay = null;
        this.messageElement = null;
        this.progressElement = null;
        this.logoElement = null;
        
        this.init();
    }
    
    init() {
        console.log('🆕 Liked Assets Page - running basic loading system');
        
        // CRITICAL: Remove any existing orbital/transition overlays immediately
        this.removeExistingOverlays();
        
        // Clear any transition flags that might interfere
        sessionStorage.removeItem('transitionActive');
        sessionStorage.removeItem('fromPageTransition');
        sessionStorage.removeItem('transitionTargetType');
        
        this.createLoadingOverlay();
        
        // Only proceed if we created an overlay
        if (!this.overlay) {
            console.log('⚠️ No overlay created, showing page immediately');
            this.showPageImmediately();
            return;
        }
        
        this.updateDisplay();
        
        // Set DOM as loaded immediately
        this.setLoaded('dom');
        
        // Start checking other systems
        this.checkSystems();
        
        // Fallback timeout - force completion after 8 seconds
        setTimeout(() => {
            console.log('⚠️ Loading timeout reached, forcing completion...');
            this.forceComplete();
        }, 8000);
    }
    
    removeExistingOverlays() {
        // Remove any existing orbital/transition overlays
        const overlaysToRemove = [
            '#page-transition-overlay',
            '#generate-replacement-overlay',
            '#simple-loader',
            '[id*="transition"]',
            '[id*="orbital"]'
        ];
        
        overlaysToRemove.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && el.parentNode && el.id !== 'liked-assets-loading-overlay') {
                        console.log('🗑️ Removing existing overlay:', el.id || el.className);
                        el.parentNode.removeChild(el);
                    }
                });
            } catch (error) {
                // Silently handle any errors
            }
        });
    }
    
    showPageImmediately() {
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        
        const pageContent = document.querySelector('.page-content');
        if (pageContent) {
            pageContent.style.opacity = '1';
            pageContent.style.visibility = 'visible';
            pageContent.classList.add('revealed');
        }
        
        console.log('✅ Page shown immediately');
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
        console.log('🆕 Creating basic loading overlay for liked assets');
        
        // Create overlay with DALMA branding and blue/cyan theme
        this.overlay = document.createElement('div');
        this.overlay.id = 'liked-assets-loading-overlay';
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
            <div style="
                font-size: 1.5rem;
                font-weight: 600;
                color: #00bcd4;
                text-shadow: 0 0 15px rgba(0, 188, 212, 0.3);
            ">💖 Liked Assets</div>
        `;
        
        // Simple loading spinner
        const spinnerContainer = document.createElement('div');
        spinnerContainer.style.cssText = `
            position: relative;
            margin-bottom: 2rem;
        `;
        
        // Simple spinning circle
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 60px;
            height: 60px;
            border: 3px solid rgba(0, 188, 212, 0.1);
            border-radius: 50%;
            border-top: 3px solid #00bcd4;
            animation: basicSpin 1s linear infinite;
        `;
        
        // Hearts floating around spinner
        const heartsContainer = document.createElement('div');
        heartsContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            pointer-events: none;
        `;
        
        for (let i = 0; i < 3; i++) {
            const heart = document.createElement('div');
            heart.style.cssText = `
                position: absolute;
                font-size: 12px;
                color: #00bcd4;
                animation: floatHeart ${2 + i * 0.5}s ease-in-out infinite alternate;
                animation-delay: ${i * 0.3}s;
            `;
            heart.textContent = '💖';
            
            // Position hearts around the circle
            const angle = (i * 120) * Math.PI / 180;
            const radius = 35;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            heart.style.left = `calc(50% + ${x}px)`;
            heart.style.top = `calc(50% + ${y}px)`;
            heart.style.transform = 'translate(-50%, -50%)';
            
            heartsContainer.appendChild(heart);
        }
        
        spinnerContainer.appendChild(spinner);
        spinnerContainer.appendChild(heartsContainer);
        
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
        progressBar.id = 'liked-assets-progress-bar';
        
        this.progressElement.appendChild(progressBar);
        
        // Assembly
        this.overlay.appendChild(this.logoElement);
        this.overlay.appendChild(spinnerContainer);
        this.overlay.appendChild(this.messageElement);
        this.overlay.appendChild(this.progressElement);
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes basicSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes floatHeart {
                0% { 
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0.6;
                }
                100% { 
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add to page immediately
        document.body.appendChild(this.overlay);
    }
    
    setLoaded(component) {
        if (this.loadingStates.hasOwnProperty(component)) {
            this.loadingStates[component] = true;
            console.log(`✅ Liked Assets Loading Manager: ${component} loaded`);
            this.updateDisplay();
            this.checkCompletion();
        }
    }
    
    updateDisplay() {
        const completedCount = Object.values(this.loadingStates).filter(Boolean).length;
        const totalCount = Object.keys(this.loadingStates).length;
        const progress = (completedCount / totalCount) * 100;
        
        // Update progress bar
        const progressBar = document.getElementById('liked-assets-progress-bar');
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
        console.log('🔍 Liked Assets Loading States Check:', this.loadingStates);
        console.log('🔍 All Loaded?', allLoaded);
        
        if (allLoaded) {
            console.log('🎉 All components loaded, hiding overlay...');
            setTimeout(() => {
                this.hideOverlay();
            }, 600); // Brief delay to show "Ready!"
        } else {
            // Show what's still loading
            const stillLoading = Object.entries(this.loadingStates)
                .filter(([key, loaded]) => !loaded)
                .map(([key]) => key);
            console.log('⏳ Still waiting for:', stillLoading);
        }
    }
    
    hideOverlay() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                
                // Ensure page content is visible after overlay is removed
                document.documentElement.style.visibility = 'visible';
                document.documentElement.style.opacity = '1';
                
                const pageContent = document.querySelector('.page-content');
                if (pageContent) {
                    pageContent.style.opacity = '1';
                    pageContent.style.visibility = 'visible';
                    pageContent.classList.add('revealed');
                }
            }, 500);
        }
    }
    
    checkSystems() {
        // Check auth system
        this.checkAuth();
        
        // Check if accountDropdown is ready
        this.checkAccountDropdown();
        
        // Check if assets data is loaded
        this.checkAssetsData();
        
        // Check if page is fully ready
        this.checkPageReady();
    }


async checkAuth() {
    try {
        // Give auth system time to initialize
        setTimeout(async () => {
            try {
                // FIXED: Use proper protocol detection
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
        }, 500);
    } catch (error) {
        // Mark as loaded even on error
        this.setLoaded('auth');
    }
}
    
    checkAccountDropdown() {
        // Check if accountDropdown is ready
        let attempts = 0;
        const maxAttempts = 15;
        
        const checkDropdown = () => {
            attempts++;
            
            if (window.accountDropdown && window.accountDropdown.isInitialized) {
                this.setLoaded('accountDropdown');
            } else if (attempts >= maxAttempts) {
                console.log('⚠️ AccountDropdown timeout, marking as loaded anyway');
                this.setLoaded('accountDropdown');
            } else {
                setTimeout(checkDropdown, 200);
            }
        };
        
        setTimeout(checkDropdown, 1000);
    }
    
    checkAssetsData() {
        // Wait for the liked assets data to be loaded
        let attempts = 0;
        const maxAttempts = 30; // Give more time for API calls
        
        const checkAssets = () => {
            attempts++;
            
            // Check if the assets grid has been populated or if we're in an empty/error state
            const assetsGrid = document.getElementById('assetsGrid');
            const emptyState = document.getElementById('emptyState');
            const errorState = document.getElementById('errorState');
            const loadingSpinner = document.getElementById('loadingSpinner');
            
            const assetsLoaded = (
                (assetsGrid && assetsGrid.children.length > 0 && assetsGrid.style.display !== 'none') ||
                (emptyState && emptyState.style.display !== 'none') ||
                (errorState && errorState.style.display !== 'none')
            );
            
            const stillLoading = loadingSpinner && loadingSpinner.style.display !== 'none';
            
            if (assetsLoaded && !stillLoading) {
                console.log('✅ Assets data loaded');
                this.setLoaded('assetsData');
            } else if (attempts >= maxAttempts) {
                console.log('⚠️ Assets data timeout, marking as loaded anyway');
                this.setLoaded('assetsData');
            } else {
                setTimeout(checkAssets, 300);
            }
        };
        
        // Start checking after DOM is ready and initial scripts have run
        setTimeout(checkAssets, 2000);
    }
    
    checkPageReady() {
        // Wait for all page elements to be properly positioned and styled
        let attempts = 0;
        const maxAttempts = 20;
        
        const checkPage = () => {
            attempts++;
            
            // Check if critical page elements exist and are styled
            const header = document.querySelector('.header');
            const assetsSection = document.querySelector('.assets-section');
            const footer = document.querySelector('.footer');
            
            const pageElementsReady = header && assetsSection && footer;
            
            // Check if fonts are loaded
            const fontsLoaded = document.fonts ? document.fonts.ready : Promise.resolve();
            
            Promise.resolve(fontsLoaded).then(() => {
                if (pageElementsReady) {
                    // Give a moment for any final layout adjustments
                    setTimeout(() => {
                        this.setLoaded('pageReady');
                    }, 500);
                } else if (attempts >= maxAttempts) {
                    console.log('⚠️ Page ready timeout, marking as loaded anyway');
                    this.setLoaded('pageReady');
                } else {
                    setTimeout(checkPage, 200);
                }
            });
        };
        
        // Start checking after other systems
        setTimeout(checkPage, 3000);
    }
}

// Initialize loading manager immediately when script loads
const likedAssetsLoadingManager = new LikedAssetsLoadingManager();

// Export globally so the page can report loading status
window.likedAssetsLoadingManager = likedAssetsLoadingManager;

console.log('✅ Liked Assets Page Loader (Basic System) loaded');