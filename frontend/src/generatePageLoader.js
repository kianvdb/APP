// generatePageLoader.js - INSTANT CONTROLS VERSION
console.log('🎯 Generate Page Loader - INSTANT CONTROLS');

(function() {
    'use strict';
    
    // CRITICAL: Execute immediately to prevent any flash
    const isFromTransition = sessionStorage.getItem('transitionActive') === 'true';
    
    if (isFromTransition) {
        console.log('🔄 Transition detected - coordinating with existing overlay');
        
        // IMMEDIATELY hide page content but DON'T create new overlays
        document.documentElement.style.visibility = 'hidden';
        document.documentElement.style.opacity = '0';
        
        // IMMEDIATELY prepare controls for instant reveal
        const prepareInstantControls = () => {
            const simpleLoader = document.getElementById('simple-loader');
            if (simpleLoader) {
                simpleLoader.remove();
                console.log('🗑️ Removed simple loader');
            }
            
            // Hide page content class
            const pageContent = document.querySelector('.page-content');
            if (pageContent) {
                pageContent.style.opacity = '0';
                pageContent.style.visibility = 'hidden';
                pageContent.classList.remove('revealed');
            }
            
            // IMMEDIATELY ensure controls have proper styling and are ready for instant reveal
            ensureControlsStylingForInstantReveal();
        };
        
        prepareInstantControls();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', prepareInstantControls);
        }
        
        // Set up INSTANT REVEAL coordinator
        setupInstantRevealCoordinator();
        
    } else {
        console.log('🆕 Direct load - showing page immediately');
        sessionStorage.removeItem('transitionActive');
        
        // For direct loads, show everything instantly
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    ensureControlsStylingForInstantReveal();
                    showPageInstantly();
                }, 100);
            });
        } else {
            setTimeout(() => {
                ensureControlsStylingForInstantReveal();
                showPageInstantly();
            }, 100);
        }
    }
    
    // ENHANCED FUNCTION: Prepare controls for instant reveal
    function ensureControlsStylingForInstantReveal() {
        const controlsSidebar = document.querySelector('.controls-sidebar');
        if (controlsSidebar) {
            // Force immediate styling and prepare for instant reveal
            controlsSidebar.style.cssText += `
                background: rgba(10, 10, 10, 0.85) !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                backdrop-filter: blur(8px) !important;
                transform: translateZ(0) !important;
                backface-visibility: hidden !important;
                will-change: auto !important;
                transition: none !important;
            `;
            
            // Force repaint
            controlsSidebar.offsetHeight;
            
            console.log('✅ Controls sidebar prepared for instant reveal');
        }
    }
    
    function setupInstantRevealCoordinator() {
        let revealInProgress = false;
        
        // Look for existing transition overlay and time the INSTANT reveal
        function waitForInstantReveal() {
            const existingOverlay = document.getElementById('page-transition-overlay');
            
            if (existingOverlay) {
                console.log('✅ Found existing transition overlay - preparing instant reveal');
                
                // Monitor the overlay's opacity to time our instant reveal
                const monitorOverlay = () => {
                    const overlayOpacity = parseFloat(getComputedStyle(existingOverlay).opacity);
                    
                    // Start revealing when overlay starts fading (opacity < 0.8)
                    if (overlayOpacity < 0.8 && !revealInProgress) {
                        console.log('⚡ Instant reveal: Showing page and controls immediately');
                        revealPageInstantly();
                    } else if (overlayOpacity > 0.8) {
                        // Keep checking
                        setTimeout(monitorOverlay, 50);
                    }
                };
                
                // Wait a bit for the overlay to run its course, then start monitoring
                setTimeout(() => {
                    monitorOverlay();
                }, 1200);
                
                // Fallback timeout
                setTimeout(() => {
                    if (!revealInProgress) {
                        console.log('⚠️ Fallback: Force instant reveal');
                        revealPageInstantly();
                    }
                }, 4000);
                
            } else {
                console.log('⚠️ No existing overlay found - instant reveal immediately');
                setTimeout(() => revealPageInstantly(), 300);
            }
        }
        
        function revealPageInstantly() {
            if (revealInProgress) return;
            revealInProgress = true;
            
            console.log('⚡ INSTANT REVEAL: Page and controls appearing immediately');
            
            // CRITICAL: Ensure controls styling BEFORE revealing page
            ensureControlsStylingForInstantReveal();
            
            // INSTANT reveal - no fade animation on the document
            document.documentElement.style.visibility = 'visible';
            document.documentElement.style.opacity = '1';
            document.documentElement.style.transition = 'none'; // No animation
            
            // INSTANT reveal of page content AND controls
            const pageContent = document.querySelector('.page-content');
            if (pageContent) {
                // Remove any transitions
                pageContent.style.transition = 'none';
                pageContent.style.opacity = '1';
                pageContent.style.visibility = 'visible';
                
                // INSTANT: Add revealed class immediately - controls appear instantly
                pageContent.classList.add('revealed');
                
                // Force immediate controls visibility
                const controlsSidebar = document.querySelector('.controls-sidebar');
                if (controlsSidebar) {
                    controlsSidebar.style.opacity = '1';
                    controlsSidebar.style.visibility = 'visible';
                    controlsSidebar.style.transition = 'none';
                }
                
                console.log('⚡ Page content and controls revealed INSTANTLY');
            }
            
            cleanupTransitionState();
            console.log('✅ Instant reveal complete!');
        }
        
        function cleanupTransitionState() {
            sessionStorage.removeItem('fromPageTransition');
            sessionStorage.removeItem('transitionActive');
            sessionStorage.removeItem('transitionComplete');
            sessionStorage.removeItem('transitionStartTime');
            
            // FINAL check: Ensure controls styling is still applied
            ensureControlsStylingForInstantReveal();
        }
        
        // Initialize the coordinator
        function init() {
            console.log('🚀 Starting INSTANT REVEAL coordination...');
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => {
                        ensureControlsStylingForInstantReveal();
                        waitForInstantReveal();
                    }, 100);
                });
            } else {
                setTimeout(() => {
                    ensureControlsStylingForInstantReveal();
                    waitForInstantReveal();
                }, 100);
            }
        }
        
        init();
    }
    
    function showPageInstantly() {
        console.log('⚡ INSTANT: Showing page and controls immediately');
        
        // CRITICAL: Ensure controls styling FIRST
        ensureControlsStylingForInstantReveal();
        
        // Show everything instantly
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        document.documentElement.style.transition = 'none';
        document.body.style.visibility = 'visible';
        document.body.style.opacity = '1';
        
        // INSTANT reveal of page content AND controls
        const pageContent = document.querySelector('.page-content');
        if (pageContent) {
            pageContent.style.opacity = '1';
            pageContent.style.visibility = 'visible';
            pageContent.style.transition = 'none';
            pageContent.classList.add('revealed'); // This triggers instant controls visibility
            
            // Force immediate controls visibility
            const controlsSidebar = document.querySelector('.controls-sidebar');
            if (controlsSidebar) {
                controlsSidebar.style.opacity = '1';
                controlsSidebar.style.visibility = 'visible';
                controlsSidebar.style.transition = 'none';
            }
        }
        
        // Remove any leftover overlays
        removeAllOverlays();
        
        console.log('⚡ Page and controls shown INSTANTLY');
    }
    
    function removeAllOverlays() {
        const overlaySelectors = [
            '#generate-replacement-overlay',
            '#simple-loader'
        ];
        
        overlaySelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && el.parentNode) {
                        console.log('🗑️ Removing duplicate overlay:', el.id || el.className);
                        el.remove();
                    }
                });
            } catch (error) {
                // Silently handle any errors
            }
        });
    }
})();

// Main loader function
function initGeneratePageLoader() {
    console.log('🔍 Initializing instant controls page loader...');
    
    const isFromTransition = sessionStorage.getItem('transitionActive') === 'true';
    const fromPageTransition = sessionStorage.getItem('fromPageTransition') === 'true';
    const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin') === 'index.html';
    
    console.log('🔍 Generate page load state:', {
        fromTransition: isFromTransition,
        fromPageTransition: fromPageTransition,
        redirectAfterLogin: redirectAfterLogin,
        documentReady: document.readyState
    });
    
    // Clean up redirect flag immediately
    if (redirectAfterLogin) {
        sessionStorage.removeItem('redirectAfterLogin');
    }
    
    if (redirectAfterLogin && !isFromTransition) {
        console.log('🔄 Post-login redirect - showing instantly');
        showPageInstantly();
    } else if (!isFromTransition) {
        console.log('🆕 Direct load - showing instantly');
        showPageInstantly();
    } else {
        console.log('🔄 Transition active - instant reveal coordinator is handling');
    }
    
    cleanupSessionStorage();
}

function showPageInstantly() {
    console.log('⚡ INSTANT: Showing page and controls immediately');
    
    ensureControlsStylingForInstantReveal();
    
    document.documentElement.style.visibility = 'visible';
    document.documentElement.style.opacity = '1';
    document.documentElement.style.transition = 'none';
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    
    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
        pageContent.style.opacity = '1';
        pageContent.style.visibility = 'visible';
        pageContent.style.transition = 'none';
        pageContent.classList.add('revealed');
        
        // Force immediate controls visibility
        const controlsSidebar = document.querySelector('.controls-sidebar');
        if (controlsSidebar) {
            controlsSidebar.style.opacity = '1';
            controlsSidebar.style.visibility = 'visible';
            controlsSidebar.style.transition = 'none';
        }
    }
    
    removeAllOverlays();
    console.log('⚡ Page and controls shown INSTANTLY');
}

function ensureControlsStylingForInstantReveal() {
    const controlsSidebar = document.querySelector('.controls-sidebar');
    if (controlsSidebar) {
        controlsSidebar.style.cssText += `
            background: rgba(10, 10, 10, 0.85) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            backdrop-filter: blur(8px) !important;
            transform: translateZ(0) !important;
            backface-visibility: hidden !important;
            will-change: auto !important;
            transition: none !important;
        `;
        controlsSidebar.offsetHeight;
        console.log('✅ Controls prepared for instant reveal');
    }
}

function removeAllOverlays() {
    const overlaySelectors = [
        '#generate-replacement-overlay',
        '#simple-loader'
    ];
    
    overlaySelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el && el.parentNode) {
                    console.log('🗑️ Removing duplicate overlay:', el.id || el.className);
                    el.remove();
                }
            });
        } catch (error) {
            // Silently handle any errors
        }
    });
}

function cleanupSessionStorage() {
    const keysToRemove = [
        'fromPageTransition',
        'transitionActive', 
        'transitionComplete',
        'transitionStartTime',
        'transitionTargetType',
        'transitionAssetId',
        'redirectAfterLogin'
    ];
    
    keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
    });
    
    console.log('🧹 Session storage cleaned up');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGeneratePageLoader);
} else {
    initGeneratePageLoader();
}

// Safety net
setTimeout(() => {
    console.log('🚨 Safety net: Ensuring instant visibility');
    
    document.documentElement.style.cssText = `
        visibility: visible !important;
        opacity: 1 !important;
        background: #0a0a0a !important;
        transition: none !important;
    `;
    
    document.body.style.cssText = `
        visibility: visible !important;
        opacity: 1 !important;
        background: #0a0a0a !important;
        transition: none !important;
    `;
    
    const pageContent = document.querySelector('.page-content');
    if (pageContent) {
        pageContent.style.cssText = `
            opacity: 1 !important;
            visibility: visible !important;
            transition: none !important;
        `;
        pageContent.classList.add('revealed');
        
        // Force controls instant visibility
        const controlsSidebar = document.querySelector('.controls-sidebar');
        if (controlsSidebar) {
            controlsSidebar.style.cssText += `
                opacity: 1 !important;
                visibility: visible !important;
                transition: none !important;
            `;
        }
    }
    
    ensureControlsStylingForInstantReveal();
    removeAllOverlays();
    cleanupSessionStorage();
    
    console.log('✅ Safety net: Everything instantly visible');
}, 4000);

console.log('✅ Instant Controls Generate Page Loader loaded');