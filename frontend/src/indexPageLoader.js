// COMPLETE FIX: Enhanced generatePageLoader.js 
// This version ensures ONLY ONE loading screen shows

console.log('🎯 Generate Page Loader - FIXED COORDINATION');

(function() {
    'use strict';
    
    // CRITICAL: Execute immediately to prevent any flash
    const isFromTransition = sessionStorage.getItem('transitionActive') === 'true';
    
    if (isFromTransition) {
        console.log('🔄 Transition detected - preventing double loading');
        
        // IMMEDIATELY hide page content
        document.documentElement.style.visibility = 'hidden';
        document.documentElement.style.opacity = '0';
        
        // IMMEDIATELY remove any existing simple loaders from HTML
        const removeSimpleLoaders = () => {
            const simpleLoader = document.getElementById('simple-loader');
            if (simpleLoader) {
                simpleLoader.remove();
                console.log('🗑️ Removed simple loader');
            }
            
            // Also hide page content class
            const pageContent = document.querySelector('.page-content');
            if (pageContent) {
                pageContent.style.opacity = '0';
                pageContent.style.visibility = 'hidden';
            }
        };
        
        // Remove immediately and also after DOM loads
        removeSimpleLoaders();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', removeSimpleLoaders);
        }
        
        // Set up the transition coordinator
        setupTransitionCoordinator();
        
    } else {
        console.log('🆕 Direct load - allowing normal loading');
        // For direct loads, let the normal systems work
        sessionStorage.removeItem('transitionActive');
        
        // Quick reveal for direct loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    const pageContent = document.querySelector('.page-content');
                    if (pageContent) {
                        pageContent.classList.add('revealed');
                    }
                }, 100);
            });
        }
    }
    
    function setupTransitionCoordinator() {
        let overlay = null;
        let messageElement = null;
        let progressElement = null;
        let revealInProgress = false;
        
        function findOrCreateOverlay() {
            // Try to find existing transition overlay
            overlay = document.getElementById('page-transition-overlay');
            
            if (overlay) {
                console.log('✅ Found existing transition overlay - adapting');
                
                // Find progress elements
                messageElement = overlay.querySelector('#transition-progress-text') || 
                                overlay.querySelector('[id*="progress-text"]');
                progressElement = overlay.querySelector('#transition-progress-bar') || 
                                 overlay.querySelector('[id*="progress-bar"]');
                
                // Update to show we're loading the page
                if (messageElement) {
                    messageElement.textContent = 'Loading Generation Studio...';
                }
                if (progressElement) {
                    progressElement.style.width = '30%';
                }
                
                // Ensure overlay stays visible and positioned correctly
                overlay.style.cssText += `
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 60000 !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    display: flex !important;
                `;
                
            } else {
                console.log('⚠️ No existing overlay - creating replacement');
                createReplacementOverlay();
            }
        }
        
        function createReplacementOverlay() {
            overlay = document.createElement('div');
            overlay.id = 'generate-replacement-overlay';
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
                opacity: 1;
            `;
            
            const content = document.createElement('div');
            content.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                max-width: 500px;
                padding: 2rem;
            `;
            
            content.innerHTML = `
                <div style="margin-bottom: 2rem;">
                    <img src="/frontend/public/logo2dalma.png" alt="Dalma AI" style="
                        height: 70px;
                        width: auto;
                        filter: drop-shadow(0 0 30px rgba(0, 188, 212, 0.6));
                        animation: logoFloat 3s ease-in-out infinite alternate;
                    ">
                </div>
                <div style="
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 0.5rem;
                    text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
                ">Preparing Generation Studio</div>
                <div style="
                    font-size: 1rem;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 3rem;
                ">Loading advanced 3D tools and AI models...</div>
                <div style="
                    position: relative;
                    width: 120px;
                    height: 120px;
                    margin-bottom: 2rem;
                ">
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 120px;
                        height: 120px;
                        margin-top: -60px;
                        margin-left: -60px;
                        border: 2px solid transparent;
                        border-top: 2px solid rgba(0, 188, 212, 0.8);
                        border-radius: 50%;
                        animation: orbitalSpin 2s linear infinite;
                    "></div>
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 100px;
                        height: 100px;
                        margin-top: -50px;
                        margin-left: -50px;
                        border: 2px solid transparent;
                        border-top: 2px solid rgba(0, 188, 212, 0.6);
                        border-radius: 50%;
                        animation: orbitalSpin 2.5s linear infinite;
                        animation-delay: 0.3s;
                    "></div>
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 80px;
                        height: 80px;
                        margin-top: -40px;
                        margin-left: -40px;
                        border: 2px solid transparent;
                        border-top: 2px solid rgba(0, 188, 212, 0.4);
                        border-radius: 50%;
                        animation: orbitalSpin 3s linear infinite;
                        animation-delay: 0.6s;
                    "></div>
                    <div style="
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
                    "></div>
                </div>
            `;
            
            messageElement = document.createElement('div');
            messageElement.style.cssText = `
                font-size: 0.9rem;
                color: #00bcd4;
                margin-bottom: 1rem;
                text-align: center;
            `;
            messageElement.textContent = 'Loading Generation Studio...';
            
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                width: 300px;
                height: 6px;
                background: rgba(0, 188, 212, 0.1);
                border-radius: 3px;
                overflow: hidden;
                box-shadow: inset 0 0 10px rgba(0, 188, 212, 0.2);
            `;
            
            progressElement = document.createElement('div');
            progressElement.style.cssText = `
                height: 100%;
                background: linear-gradient(90deg, #00bcd4, #00e5ff, #00bcd4);
                border-radius: 3px;
                width: 30%;
                transition: width 0.3s ease;
                box-shadow: 0 0 15px rgba(0, 188, 212, 0.6);
                animation: progressGlow 2s ease-in-out infinite alternate;
            `;
            
            progressContainer.appendChild(progressElement);
            content.appendChild(messageElement);
            content.appendChild(progressContainer);
            overlay.appendChild(content);
            
            // Add animations
            addAnimations();
            
            document.body.appendChild(overlay);
        }
        
        function addAnimations() {
            if (document.getElementById('generate-animations')) return;
            
            const style = document.createElement('style');
            style.id = 'generate-animations';
            style.textContent = `
                @keyframes orbitalSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
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
        
        function runLoadingSequence() {
            const steps = [
                { message: 'Loading 3D Engine...', progress: 50, duration: 700 },
                { message: 'Setting up Controls...', progress: 70, duration: 600 },
                { message: 'Initializing Workspace...', progress: 90, duration: 500 },
                { message: 'Ready!', progress: 100, duration: 300 }
            ];
            
            let currentStep = 0;
            
            function nextStep() {
                if (currentStep < steps.length) {
                    const step = steps[currentStep];
                    
                    if (messageElement) {
                        messageElement.style.opacity = '0';
                        setTimeout(() => {
                            messageElement.textContent = step.message;
                            messageElement.style.opacity = '1';
                        }, 150);
                    }
                    
                    if (progressElement) {
                        progressElement.style.width = `${step.progress}%`;
                    }
                    
                    currentStep++;
                    
                    if (currentStep >= steps.length) {
                        setTimeout(() => revealPage(), step.duration);
                    } else {
                        setTimeout(nextStep, step.duration);
                    }
                }
            }
            
            setTimeout(nextStep, 300);
        }
        
        function revealPage() {
            if (revealInProgress) return;
            revealInProgress = true;
            
            console.log('✨ Revealing generate page...');
            
            // Prepare page
            document.documentElement.style.visibility = 'visible';
            document.documentElement.style.opacity = '0';
            document.documentElement.style.transition = 'opacity 1s ease';
            
            // Fade in page
            setTimeout(() => {
                document.documentElement.style.opacity = '1';
                
                // Fade out overlay
                setTimeout(() => {
                    if (overlay) {
                        overlay.style.transition = 'opacity 0.8s ease';
                        overlay.style.opacity = '0';
                        
                        setTimeout(() => {
                            if (overlay && overlay.parentNode) {
                                overlay.parentNode.removeChild(overlay);
                            }
                            cleanupTransitionState();
                            console.log('✅ Generate page reveal complete!');
                        }, 800);
                    }
                }, 400);
            }, 100);
        }
        
        function cleanupTransitionState() {
            sessionStorage.removeItem('fromPageTransition');
            sessionStorage.removeItem('transitionActive');
            sessionStorage.removeItem('transitionComplete');
            sessionStorage.removeItem('transitionStartTime');
            
            // Ensure page content is visible
            const pageContent = document.querySelector('.page-content');
            if (pageContent) {
                pageContent.style.opacity = '1';
                pageContent.style.visibility = 'visible';
                pageContent.classList.add('revealed');
            }
        }
        
        // Initialize the coordinator
        function init() {
            console.log('🚀 Starting transition coordination...');
            
            // Wait a moment for DOM to be ready, then set up overlay
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => {
                        findOrCreateOverlay();
                        runLoadingSequence();
                    }, 100);
                });
            } else {
                setTimeout(() => {
                    findOrCreateOverlay();
                    runLoadingSequence();
                }, 100);
            }
            
            // Fallback timeout
            setTimeout(() => {
                console.log('⚠️ Transition timeout - forcing reveal');
                revealPage();
            }, 5000);
        }
        
        init();
    }
})();