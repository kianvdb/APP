// pageTransitionLoader.js - ENHANCED with Authentication Check + Liked Assets Support
// This version checks authentication before showing generate page transition and adds liked assets transitions


console.log('🚀 Page Transition Loader - ENHANCED WITH AUTH CHECK + LIKED ASSETS');

// FIXED: API Configuration - Global namespace approach with proper protocol
window.DALMA_CONFIG = window.DALMA_CONFIG || {};
if (!window.DALMA_CONFIG.API_BASE_URL) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isDev) {
        window.DALMA_CONFIG.API_BASE_URL = `http://${hostname}:3000/api`;
    } else {
        // In production, use HTTPS if page is HTTPS
        window.DALMA_CONFIG.API_BASE_URL = protocol === 'https:' 
            ? `https://${hostname}/api`
            : `http://${hostname}:3000/api`;
    }
}

console.log('🔧 Page Transition API URL:', window.DALMA_CONFIG.API_BASE_URL);

// Authentication check function
async function checkUserAuthentication() {
    try {
        console.log('🔐 Checking user authentication...');
        
        const response = await fetch(`${window.DALMA_CONFIG.API_BASE_URL}/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const isAuthenticated = response.ok;
        console.log('🔐 Authentication result:', isAuthenticated);
        
        return isAuthenticated;
    } catch (error) {
        console.error('❌ Auth check error:', error);
        return false;
    }
}

function createTransitionOverlay(targetType = 'generate') {
    console.log('🎨 Creating transition overlay for:', targetType);
    
    const overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at center, #0f1419 0%, #0a0a0a 50%, #000000 100%);
        z-index: 60000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: 'Sora', sans-serif;
        opacity: 0;
        transition: opacity 0.4s ease;
    `;
    
    // Main content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        max-width: 500px;
        padding: 2rem;
    `;
    
    // Logo section with glow effect
    const logoSection = document.createElement('div');
    logoSection.style.cssText = `
        margin-bottom: 2rem;
        position: relative;
    `;
    logoSection.innerHTML = `
        <img src="/frontend/public/logo2dalma.png" alt="Dalma AI" style="
            height: 70px;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 0 30px rgba(0, 188, 212, 0.6));
            animation: logoFloat 3s ease-in-out infinite alternate;
        ">
    `;
    
    // Dynamic title and subtitle based on target
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 1.8rem;
        font-weight: 700;
        color: white;
        margin-bottom: 0.5rem;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    `;
    
    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
        font-size: 1rem;
        font-weight: 400;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 3rem;
        line-height: 1.5;
    `;
    
    // Set content based on target type
    if (targetType === 'view-asset') {
        title.textContent = 'Loading Asset Viewer';
        subtitle.textContent = 'Preparing 3D model and asset details...';
    } else if (targetType === 'liked-assets') {
        title.textContent = 'Loading Liked Assets';
        subtitle.textContent = 'Fetching your favorite models...';
    } else {
        title.textContent = 'Preparing Generation Studio';
        subtitle.textContent = 'Loading advanced 3D tools and AI models...';
    }
    
    // Orbital spinner
    const spinnerContainer = document.createElement('div');
    spinnerContainer.style.cssText = `
        position: relative;
        width: 120px;
        height: 120px;
        margin-bottom: 2rem;
    `;
    
    // Create orbital rings
    for (let i = 0; i < 3; i++) {
        const ring = document.createElement('div');
        const size = 120 - (i * 20);
        const delay = i * 0.3;
        
        ring.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${size}px;
            height: ${size}px;
            margin-top: -${size/2}px;
            margin-left: -${size/2}px;
            border: 2px solid transparent;
            border-top: 2px solid rgba(0, 188, 212, ${0.8 - i * 0.2});
            border-radius: 50%;
            animation: orbitalSpin ${2 + i * 0.5}s linear infinite;
            animation-delay: ${delay}s;
        `;
        
        spinnerContainer.appendChild(ring);
    }
    
    // Central glow dot
    const centerDot = document.createElement('div');
    centerDot.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 12px;
        height: 12px;
        margin-top: -6px;
        margin-left: -6px;
        background: radial-gradient(circle, #00bcd4, #0097a7);
        border-radius: 50%;
        box-shadow: 0 0 20px rgba(0, 188, 212, 0.8);
        animation: centerPulse 2s ease-in-out infinite alternate;
    `;
    
    spinnerContainer.appendChild(centerDot);
    
    // Progress text
    const progressText = document.createElement('div');
    progressText.id = 'transition-progress-text';
    progressText.style.cssText = `
        font-size: 0.9rem;
        font-weight: 500;
        color: #00bcd4;
        margin-bottom: 1rem;
        min-height: 24px;
        transition: opacity 0.3s ease;
    `;
    progressText.textContent = 'Starting...';
    
    // Progress bar
    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = `
        width: 300px;
        height: 6px;
        background: rgba(0, 188, 212, 0.1);
        border-radius: 3px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 0 10px rgba(0, 188, 212, 0.2);
    `;
    
    const progressBar = document.createElement('div');
    progressBar.id = 'transition-progress-bar';
    progressBar.style.cssText = `
        height: 100%;
        background: linear-gradient(90deg, #00bcd4, #00e5ff, #00bcd4);
        border-radius: 3px;
        width: 0%;
        transition: width 0.3s ease;
        box-shadow: 0 0 15px rgba(0, 188, 212, 0.6);
        animation: progressGlow 2s ease-in-out infinite alternate;
    `;
    
    progressBarContainer.appendChild(progressBar);
    
    // Assembly
    contentContainer.appendChild(logoSection);
    contentContainer.appendChild(title);
    contentContainer.appendChild(subtitle);
    contentContainer.appendChild(spinnerContainer);
    contentContainer.appendChild(progressText);
    contentContainer.appendChild(progressBarContainer);
    
    overlay.appendChild(contentContainer);
    
    // Add CSS animations
    addTransitionAnimations();
    
    // Add to page
    document.body.appendChild(overlay);
    
    // Fade in
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
    
    console.log('✅ Transition overlay created for:', targetType);
    return overlay;
}

function addTransitionAnimations() {
    if (document.getElementById('transition-loader-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'transition-loader-styles';
    style.textContent = `
        @keyframes orbitalSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes centerPulse {
            0% { 
                transform: scale(1);
                box-shadow: 0 0 20px rgba(0, 188, 212, 0.8);
            }
            100% { 
                transform: scale(1.2);
                box-shadow: 0 0 30px rgba(0, 188, 212, 1);
            }
        }
        
        @keyframes logoFloat {
            0% { 
                transform: translateY(0px);
                filter: drop-shadow(0 0 30px rgba(0, 188, 212, 0.6));
            }
            100% { 
                transform: translateY(-10px);
                filter: drop-shadow(0 0 40px rgba(0, 188, 212, 0.9));
            }
        }
        
        @keyframes progressGlow {
            0% { 
                box-shadow: 0 0 15px rgba(0, 188, 212, 0.6);
            }
            100% { 
                box-shadow: 0 0 25px rgba(0, 188, 212, 0.9);
            }
        }
    `;
    
    document.head.appendChild(style);
}

async function showTransition(targetUrl, targetType = 'generate') {
    // CRITICAL: Absolutely refuse to show any transition for liked assets
    if (targetType === 'liked-assets' || 
        targetUrl.includes('liked-assets.html') || 
        targetUrl.includes('liked-assets') ||
        targetUrl === 'liked-assets.html') {
        
        console.log('🚫 ABSOLUTELY REFUSING advanced transition for liked assets');
        console.log('🚫 URL:', targetUrl, 'Type:', targetType);
        
        // Clear any existing overlays immediately
        const existingOverlays = document.querySelectorAll('[id*="overlay"], [id*="transition"]');
        existingOverlays.forEach(overlay => {
            if (overlay.parentNode) {
                console.log('🗑️ Emergency removal of overlay:', overlay.id);
                overlay.parentNode.removeChild(overlay);
            }
        });
        
        // Clear all transition flags
        sessionStorage.removeItem('transitionActive');
        sessionStorage.removeItem('fromPageTransition');
        sessionStorage.removeItem('transitionTargetType');
        sessionStorage.removeItem('transitionStartTime');
        sessionStorage.removeItem('transitionComplete');
        
        // Force immediate navigation
        console.log('🚀 Force navigating to liked assets without transition');
        window.location.href = targetUrl;
        return;
    }
    
    console.log('🔄 Starting transition to:', targetUrl, 'Type:', targetType);
    
    const overlay = createTransitionOverlay(targetType);
    const progressText = document.getElementById('transition-progress-text');
    const progressBar = document.getElementById('transition-progress-bar');
    
    // CRITICAL: Set transition flags BEFORE starting animation
    sessionStorage.setItem('transitionActive', 'true');
    sessionStorage.setItem('transitionStartTime', Date.now().toString());
    sessionStorage.setItem('fromPageTransition', 'true');
    sessionStorage.setItem('transitionTargetType', targetType);
    
    // Clear any conflicting flags from previous transitions
    sessionStorage.removeItem('transitionComplete');
    
    console.log('🔧 Session flags set:', {
        transitionActive: sessionStorage.getItem('transitionActive'),
        fromPageTransition: sessionStorage.getItem('fromPageTransition'),
        targetType: sessionStorage.getItem('transitionTargetType')
    });
    
    // Dynamic loading steps based on target type
    let steps;
    if (targetType === 'view-asset') {
        steps = [
            { message: 'Loading Asset Viewer...', duration: 400 },
            { message: 'Preparing 3D Engine...', duration: 300 },
            { message: 'Loading Asset Data...', duration: 400 },
            { message: 'Setting up Model Display...', duration: 300 },
            { message: 'Initializing Controls...', duration: 300 },
            { message: 'Finalizing Viewer...', duration: 200 }
        ];
    } else {
        // SHORTENED steps for generate to avoid timing conflicts
        steps = [
            { message: 'Preparing Generation Studio...', duration: 400 },
            { message: 'Loading 3D Engine...', duration: 300 },
            { message: 'Initializing AI Models...', duration: 400 },
            { message: 'Setting up Controls...', duration: 300 },
            { message: 'Ready!', duration: 200 }
        ];
    }
    
    let currentStep = 0;
    
    const updateStep = () => {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            
            if (progressText) {
                progressText.style.opacity = '0';
                setTimeout(() => {
                    progressText.textContent = step.message;
                    progressText.style.opacity = '1';
                }, 150);
            }
            
            const progress = ((currentStep + 1) / steps.length) * 100;
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            currentStep++;
            
            if (currentStep >= steps.length) {
                // Complete transition - navigate immediately
                setTimeout(() => {
                    console.log('🚀 NAVIGATING NOW to:', targetUrl);
                    console.log('🔧 Pre-navigation session check:', {
                        transitionActive: sessionStorage.getItem('transitionActive'),
                        fromPageTransition: sessionStorage.getItem('fromPageTransition')
                    });
                    
                    // CRITICAL: Force navigation
                    window.location.href = targetUrl;
                }, step.duration);
            } else {
                setTimeout(updateStep, step.duration);
            }
        }
    };
    
    // Start sequence immediately
    setTimeout(updateStep, 100);
}

function setupNavigation() {
    console.log('🎯 Setting up ENHANCED navigation with auth check + liked assets...');
    
    // ENHANCED: Generate navigation with authentication check
    async function handleGenerateNavigation(e, target) {
        console.log('🚀 ===== GENERATE NAVIGATION DETECTED =====');
        console.log('🚀 Element:', target.tagName);
        console.log('🚀 Text:', target.textContent.trim());
        console.log('🚀 Classes:', target.className);
        console.log('🚀 Href:', target.getAttribute('href'));
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // NEW: Check authentication before proceeding
        console.log('🔐 Checking authentication before navigation...');
        const isAuthenticated = await checkUserAuthentication();
        
        if (!isAuthenticated) {
            console.log('❌ User not authenticated - showing login modal');
            
            // Show your existing auth modal instead of the yellow overlay
            if (window.authManager && window.authManager.showLoginModal) {
                window.authManager.showLoginModal();
            } else {
                // Fallback to login page if authManager isn't available
                sessionStorage.setItem('redirectAfterLogin', 'index.html');
                window.location.href = 'login.html';
            }
            return false;
        }
        
        console.log('✅ User authenticated - proceeding with navigation');
        
        // CRITICAL: Clean up any existing overlays first
        const existingOverlays = document.querySelectorAll('[id*="overlay"], [id*="transition"]');
        existingOverlays.forEach(overlay => {
            if (overlay.id !== 'page-transition-overlay') {
                console.log('🧹 Removing existing overlay:', overlay.id);
                overlay.remove();
            }
        });
        
        console.log('🎯 Starting authenticated generate transition...');
        showTransition('index.html', 'generate');
        return false;
    }
    
    // NEW: Liked Assets navigation with authentication check - NO TRANSITION
    async function handleLikedAssetsNavigation(e, target) {
        console.log('💖 ===== LIKED ASSETS NAVIGATION DETECTED =====');
        console.log('💖 Element:', target.tagName);
        console.log('💖 Text:', target.textContent.trim());
        console.log('💖 Classes:', target.className);
        console.log('💖 Href:', target.getAttribute('href'));
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Check authentication before proceeding
        console.log('🔐 Checking authentication before liked assets navigation...');
        const isAuthenticated = await checkUserAuthentication();
        
        if (!isAuthenticated) {
            console.log('❌ User not authenticated - showing login modal');
            
            // Show your existing auth modal instead of the yellow overlay
            if (window.authManager && window.authManager.showLoginModal) {
                window.authManager.showLoginModal();
            } else {
                // Fallback to login page
                sessionStorage.setItem('redirectAfterLogin', 'liked-assets.html');
                window.location.href = 'login.html';
            }
            return false;
        }
        
        console.log('✅ User authenticated - proceeding with simple navigation (no advanced transition)');
        
        // Clear any existing transition flags to ensure basic loading system runs
        sessionStorage.removeItem('transitionActive');
        sessionStorage.removeItem('fromPageTransition');
        sessionStorage.removeItem('transitionTargetType');
        
        // Simple navigation - let the basic loading system handle everything
        window.location.href = 'liked-assets.html';
        return false;
    }
    
    function handleViewAssetNavigation(e, target, assetId) {
        console.log('🎯 ===== VIEW ASSET NAVIGATION DETECTED =====');
        console.log('🎯 Asset ID:', assetId);
        console.log('🎯 Element:', target.tagName);
        console.log('🎯 Classes:', target.className);
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Store asset ID for the transition
        sessionStorage.setItem('transitionAssetId', assetId);
        
        // Get the source page for back navigation
        const currentPage = window.location.pathname;
        let sourceParam = '';
        if (currentPage.includes('homepage.html')) {
            sourceParam = '&from=homepage';
            sessionStorage.setItem('lastAssetsPage', 'homepage');
        } else if (currentPage.includes('admin-user-models.html')) {
            sourceParam = '&from=admin';
            sessionStorage.setItem('lastAssetsPage', 'admin');
        } else if (currentPage.includes('liked-assets.html')) {
            sourceParam = '&from=liked';
            sessionStorage.setItem('lastAssetsPage', 'liked-assets');
        }
        
        const targetUrl = `view-asset.html?id=${assetId}${sourceParam}`;
        console.log('🎯 Starting view asset transition to:', targetUrl);
        showTransition(targetUrl, 'view-asset');
        return false;
    }
    
    // ENHANCED event delegation with more specific detection
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a, button, .asset-card');
        if (!target) return;
        
        const href = target.getAttribute('href');
        const text = target.textContent.toLowerCase().trim();
        const className = target.className || '';
        
        console.log('🔍 Click detected:', {
            tag: target.tagName,
            href: href,
            text: text.substring(0, 30),
            className: className
        });
        
        // CRITICAL: Block ALL liked assets navigation from advanced transitions
        const isLikedAssetsLink = (
            // Direct href matches
            href === 'liked-assets.html' ||
            href === './liked-assets.html' ||
            href === '/liked-assets.html' ||
            href && href.includes('liked-assets.html') ||
            
            // Text content matches
            text.includes('liked') ||
            text.includes('favorites') ||
            text.includes('saved') ||
            
            // Class-based detection
            className.includes('liked-assets') ||
            target.classList.contains('liked-assets-link') ||
            target.classList.contains('favorites-link')
        );
        
        // ENHANCED detection for generate buttons and CTA
        const isGenerateLink = (
            // Direct href matches
            href === 'index.html' ||
            href === './index.html' ||
            href === '/index.html' ||
            
            // Text content matches (more specific)
            text === 'generate' ||
            text.includes('generate') ||
            
            // Class-based detection (more specific)
            className.includes('cta-button') ||
            className.includes('generate-cta') ||
            className.includes('generate-btn') ||
            
            // Direct class checks
            target.classList.contains('generate-cta') ||
            target.classList.contains('cta-button') ||
            target.classList.contains('generate-btn') ||
            target.classList.contains('cta')
        );
        
        // Enhanced detection for asset card clicks
        const isAssetCard = (
            target.classList.contains('asset-card') ||
            target.closest('.asset-card') !== null
        );
        
        // CRITICAL: Handle liked assets first to prevent any advanced transitions
        if (isLikedAssetsLink) {
            console.log('🚫 LIKED ASSETS LINK DETECTED - blocking advanced transition, using basic navigation');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Immediately clear any transition states
            sessionStorage.removeItem('transitionActive');
            sessionStorage.removeItem('fromPageTransition');
            sessionStorage.removeItem('transitionTargetType');
            
            // Remove any existing overlays
            const existingOverlays = document.querySelectorAll('[id*="overlay"], [id*="transition"]');
            existingOverlays.forEach(overlay => {
                if (overlay.parentNode) {
                    console.log('🗑️ Removing overlay before liked assets navigation:', overlay.id);
                    overlay.parentNode.removeChild(overlay);
                }
            });
            
            // Simple navigation with auth check
            handleLikedAssetsNavigation(e, target);
            return false;
        } else if (isGenerateLink) {
            console.log('✅ GENERATE LINK DETECTED - triggering auth-checked transition');
            handleGenerateNavigation(e, target);
        } else if (isAssetCard) {
            // Get asset ID from the asset card
            const assetCard = target.classList.contains('asset-card') ? target : target.closest('.asset-card');
            const assetId = assetCard?.getAttribute('data-asset-id');
            
            if (assetId) {
                // Check if this click is on the like button - if so, don't intercept
                const isLikeButton = e.target.closest('.asset-like-button') || 
                                   e.target.classList.contains('asset-like-button');
                
                if (!isLikeButton) {
                    console.log('✅ ASSET CARD DETECTED - triggering transition');
                    handleViewAssetNavigation(e, target, assetId);
                }
            }
        }
    }, true); // Use capture phase for better interception
    
    // ADDITIONAL: Direct targeting strategy for generate buttons
    function attachDirectGenerateListeners() {
        // Target the CTA button specifically
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            console.log('🎯 Direct listener attached to CTA button');
            ctaButton.addEventListener('click', function(e) {
                console.log('🎯 CTA BUTTON DIRECT CLICK');
                handleGenerateNavigation(e, this);
            }, true);
        }
        
        // Target any generate links in navigation
        const generateLinks = document.querySelectorAll('a[href="index.html"], a[href="./index.html"]');
        generateLinks.forEach(link => {
            if (link.textContent.toLowerCase().includes('generate')) {
                console.log('🎯 Direct listener attached to generate link:', link.textContent);
                link.addEventListener('click', function(e) {
                    console.log('🎯 GENERATE LINK DIRECT CLICK');
                    handleGenerateNavigation(e, this);
                }, true);
            }
        });
        
        // NEW: Target liked assets links
        const likedAssetsLinks = document.querySelectorAll('a[href="liked-assets.html"], a[href="./liked-assets.html"]');
        likedAssetsLinks.forEach(link => {
            console.log('💖 Direct listener attached to liked assets link:', link.textContent);
            link.addEventListener('click', function(e) {
                console.log('💖 LIKED ASSETS LINK DIRECT CLICK');
                handleLikedAssetsNavigation(e, this);
            }, true);
        });
    }
    
    // Attach direct listeners after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachDirectGenerateListeners);
    } else {
        attachDirectGenerateListeners();
    }
    
    // Also attach after a delay for dynamic content
    setTimeout(attachDirectGenerateListeners, 1000);
    
    console.log('✅ ENHANCED navigation setup complete with auth check + liked assets');
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 ENHANCED Page Transition Loader initializing...');
    setupNavigation();
    console.log('✅ ENHANCED Page Transition Loader ready with authentication + liked assets!');
});

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading') {
    setupNavigation();
}

// Make functions globally available for debugging
window.debugShowTransition = showTransition;
window.debugCreateOverlay = createTransitionOverlay;
window.debugCheckAuth = checkUserAuthentication;

console.log('🎯 ENHANCED Page Transition Loader script loaded with auth check + liked assets');