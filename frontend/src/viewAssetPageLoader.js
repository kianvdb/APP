// viewAssetPageLoader.js - Transition Coordinator for View Asset Page
// This version ensures only ONE loading animation shows and coordinates with pageTransitionLoader.js
// Updated to wait for navigation context processing before revealing

console.log('🎯 View Asset Page Loader - TRANSITION COORDINATOR');

(function() {
    'use strict';
    
    const isFromTransition = sessionStorage.getItem('transitionActive') === 'true';
    let pageRevealed = false;
    let overlayManaged = false;
    
    console.log('🔍 Transition check:', {
        fromTransition: isFromTransition,
        documentReady: document.readyState,
        targetType: sessionStorage.getItem('transitionTargetType')
    });
    
    if (isFromTransition) {
        console.log('🔄 Transition detected - taking over existing animation');
        
        // Strategy: Take control of existing overlay and let it finish naturally
        takeControlOfExistingOverlay();
        
    } else {
        console.log('🆕 Direct load - immediate reveal');
        
        // For direct loads, show content immediately
        sessionStorage.removeItem('transitionActive');
        
        // Quick reveal for direct loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    revealPageImmediately();
                }, 100);
            });
        } else {
            setTimeout(() => {
                revealPageImmediately();
            }, 100);
        }
        
        pageRevealed = true;
        console.log('✅ Direct load setup complete');
    }
    
    function revealPageImmediately() {
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        document.documentElement.style.transition = 'none';
        
        const pageContent = document.querySelector('.page-content');
        if (pageContent) {
            pageContent.style.opacity = '1';
            pageContent.style.visibility = 'visible';
            pageContent.classList.add('revealed');
        }
        
        console.log('✅ View asset page revealed immediately');
    }
    
    function takeControlOfExistingOverlay() {
        // Look for existing overlay
        const existingOverlay = document.getElementById('page-transition-overlay');
        
        if (existingOverlay) {
            console.log('✅ Found existing overlay - taking control');
            overlayManaged = true;
            
            // Hide page content since overlay exists
            document.documentElement.style.visibility = 'hidden';
            document.documentElement.style.opacity = '0';
            
            const pageContent = document.querySelector('.page-content');
            if (pageContent) {
                pageContent.style.opacity = '0';
                pageContent.style.visibility = 'hidden';
            }
            
            // Find progress elements
            const messageElement = existingOverlay.querySelector('#transition-progress-text') || 
                                  existingOverlay.querySelector('[id*="progress-text"]');
            const progressElement = existingOverlay.querySelector('#transition-progress-bar') || 
                                   existingOverlay.querySelector('[id*="progress-bar"]');
            
            // Monitor the existing overlay and take over when it's ready
            monitorExistingOverlay(existingOverlay, messageElement, progressElement);
            
        } else {
            console.log('⚠️ No existing overlay found - user may have navigated directly');
            
            // Clean up transition flags since there's no overlay to coordinate with
            sessionStorage.removeItem('transitionActive');
            
            // Quick reveal since there's no transition to coordinate with
            setTimeout(() => {
                revealPageImmediately();
                pageRevealed = true;
                console.log('✅ No overlay found - quick reveal');
            }, 100);
        }
    }
    
    function monitorExistingOverlay(overlay, messageElement, progressElement) {
        console.log('👁️ Monitoring existing overlay...');
        
        // Update overlay to show we're loading the view asset page
        if (messageElement) {
            // Smoothly transition the message
            messageElement.style.opacity = '0.5';
            setTimeout(() => {
                messageElement.textContent = 'Loading Asset Viewer...';
                messageElement.style.opacity = '1';
            }, 200);
        }
        
        if (progressElement) {
            // Gradually increase progress to show we're taking over
            const currentWidth = parseInt(progressElement.style.width) || 0;
            if (currentWidth < 40) {
                progressElement.style.width = '40%';
            }
        }
        
        // Continue the loading sequence from where the homepage left off
        continueLoadingSequence(overlay, messageElement, progressElement);
    }
    
    function continueLoadingSequence(overlay, messageElement, progressElement) {
        console.log('🔄 Continuing loading sequence for view asset...');
        
        const steps = [
            { message: 'Loading 3D Engine...', progress: 60, duration: 400 },
            { message: 'Loading Asset Data...', progress: 75, duration: 500 },
            { message: 'Initializing Page Scripts...', progress: 80, duration: 600 },
            { message: 'Processing Navigation...', progress: 85, duration: 700 },
            { message: 'Setting up Controls...', progress: 95, duration: 400 },
            { message: 'Ready!', progress: 100, duration: 300 }
        ];
        
        let currentStep = 0;
        
        function nextStep() {
            if (currentStep < steps.length && !pageRevealed) {
                const step = steps[currentStep];
                
                // Update message smoothly
                if (messageElement) {
                    messageElement.style.opacity = '0.5';
                    setTimeout(() => {
                        messageElement.textContent = step.message;
                        messageElement.style.opacity = '1';
                    }, 100);
                }
                
                // Update progress
                if (progressElement) {
                    progressElement.style.width = `${step.progress}%`;
                }
                
                currentStep++;
                
                if (currentStep >= steps.length) {
                    // Give the view asset page extra time to fully initialize
                    console.log('🕐 Waiting for view asset page to fully initialize...');
                    setTimeout(() => {
                        revealPage(overlay);
                    }, 1500); // Increased delay to ensure all scripts have run
                } else {
                    // Next step
                    setTimeout(nextStep, step.duration);
                }
            }
        }
        
        // Start continuing the sequence after a brief moment
        setTimeout(nextStep, 300);
    }
    
    function revealPage(overlay) {
        if (pageRevealed) return;
        pageRevealed = true;
        
        console.log('✨ Revealing view asset page...');
        
        // Prepare page for reveal
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '0';
        document.documentElement.style.transition = 'opacity 0.8s ease';
        
        // Start page fade in
        setTimeout(() => {
            document.documentElement.style.opacity = '1';
            
            const pageContent = document.querySelector('.page-content');
            if (pageContent) {
                pageContent.style.opacity = '1';
                pageContent.style.visibility = 'visible';
                pageContent.classList.add('revealed');
            }
            
            // Start overlay fade out
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.style.transition = 'opacity 0.8s ease';
                    overlay.style.opacity = '0';
                    
                    // Remove overlay after fade
                    setTimeout(() => {
                        if (overlay && overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                        cleanup();
                    }, 800);
                }
            }, 300);
        }, 100);
    }
    
    function cleanup() {
        sessionStorage.removeItem('fromPageTransition');
        sessionStorage.removeItem('transitionActive');
        sessionStorage.removeItem('transitionComplete');
        sessionStorage.removeItem('transitionStartTime');
        sessionStorage.removeItem('transitionTargetType');
        sessionStorage.removeItem('transitionAssetId');
        
        console.log('✅ View asset page transition complete');
    }
    
    // Emergency fallback - but only if we haven't taken control of an overlay
    setTimeout(() => {
        if (!pageRevealed && !overlayManaged) {
            console.log('⚠️ Emergency fallback - no overlay found');
            
            revealPageImmediately();
            pageRevealed = true;
        }
    }, 2000);
    
    // Final safety net
    setTimeout(() => {
        if (!pageRevealed) {
            console.log('🚨 Final safety net activated');
            
            // Remove ALL overlays
            const allOverlays = document.querySelectorAll('[id*="overlay"], [id*="loader"], [id*="transition"]');
            allOverlays.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
            
            // Force show page
            document.documentElement.style.visibility = 'visible';
            document.documentElement.style.opacity = '1';
            document.documentElement.style.transition = 'none';
            
            const pageContent = document.querySelector('.page-content');
            if (pageContent) {
                pageContent.style.opacity = '1';
                pageContent.style.visibility = 'visible';
                pageContent.classList.add('revealed');
                pageContent.style.transition = 'none';
            }
            
            sessionStorage.clear();
            pageRevealed = true;
            
            console.log('✅ Final safety net complete');
        }
    }, 3000);
    
})();

console.log('✅ View Asset Page Loader loaded');