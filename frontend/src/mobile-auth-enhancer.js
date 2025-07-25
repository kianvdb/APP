// Complete Mobile Auth Enhancer for DALMA AI
// Enhances existing auth.js with mobile-optimized UI and smart context handling

class MobileAuthEnhancer {
    constructor() {
        this.isInitialized = false;
        this.pendingAction = null;
        this.pendingActionData = null;
        this.authReady = false;
        
        // Action-specific configurations
        this.actionConfigs = {
            generate: {
                title: 'Start Creating 3D Models',
                subtitle: 'Sign in to transform your photos into stunning 3D models',
                benefits: [
                    'Generate unlimited 3D models',
                    'Save your creations permanently',
                    'Export in multiple formats (GLB, FBX, OBJ, USDZ)',
                    'Commercial usage rights included'
                ],
                icon: '🎨'
            },
            like: {
                title: 'Save Your Favorites',
                subtitle: 'Sign in to build your personal collection of amazing 3D models',
                benefits: [
                    'Save favorite models to your collection',
                    'Quick access to liked assets',
                    'Organize your 3D library',
                    'Never lose a great model again'
                ],
                icon: '❤️'
            },
            download: {
                title: 'Download High-Quality Models',
                subtitle: 'Sign in to get professional 3D files for your projects',
                benefits: [
                    'Download in high quality formats',
                    'Use in Unity, Unreal, Blender & more',
                    'Commercial usage rights',
                    'Lifetime access to your downloads'
                ],
                icon: '📥'
            },
            account: {
                title: 'Access Your Account',
                subtitle: 'Sign in to manage your models, credits, and settings',
                benefits: [
                    'Track your generation credits',
                    'View all your 3D models',
                    'Manage your account settings',
                    'Access purchase history'
                ],
                icon: '👤'
            },
            purchase: {
                title: 'Buy More Credits',
                subtitle: 'Sign in to purchase credits and continue creating amazing models',
                benefits: [
                    'Secure payment processing',
                    'Instant credit activation',
                    'Multiple credit packages',
                    'No subscription required'
                ],
                icon: '💳'
            },
            assets: {
                title: 'View Your Models',
                subtitle: 'Sign in to access your personal 3D model collection',
                benefits: [
                    'View all your generated models',
                    'Download your creations anytime',
                    'Organize and manage your library',
                    'Share your favorite models'
                ],
                icon: '📁'
            }
        };
        
        this.init().catch(error => {
            console.error('❌ Mobile Auth Enhancer initialization failed:', error);
        });
    }

    async init() {
        console.log('📱 Initializing Mobile Auth Enhancer...');
        
        try {
            // Wait for auth manager to be available with improved checking
            await this.waitForAuthManager();
            
            // Wait for DOM to be fully ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Small delay to ensure everything is properly loaded
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Enhance the existing auth modal
            this.enhanceAuthModal();
            
            // Setup mobile-specific auth handlers
            this.setupMobileAuthHandlers();
            
            // Setup auth success handlers
            this.setupAuthSuccessHandlers();
            
            this.isInitialized = true;
            this.authReady = true;
            
            console.log('✅ Mobile Auth Enhancer initialized successfully');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('mobileAuthReady'));
            
            return true;
        } catch (error) {
            console.error('❌ Mobile Auth Enhancer initialization error:', error);
            
            // Still mark as ready to prevent hanging
            this.isInitialized = true;
            this.authReady = true;
            
            throw error;
        }
    }

    async waitForAuthManager() {
        console.log('🔍 Waiting for AuthManager to be ready...');
        
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds at 100ms intervals
            
            const checkAuth = setInterval(() => {
                attempts++;
                
                // Check multiple conditions for auth manager readiness
                const authManagerExists = window.authManager;
                const isInitialized = window.authManager?.isInitialized;
                const hasInitMethod = typeof window.authManager?.init === 'function';
                
                console.log(`🔍 Attempt ${attempts}: authManager=${!!authManagerExists}, initialized=${isInitialized}, hasInit=${hasInitMethod}`);
                
                if (authManagerExists && (isInitialized || hasInitMethod)) {
                    clearInterval(checkAuth);
                    console.log('✅ Auth manager found and ready!');
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    clearInterval(checkAuth);
                    console.warn('⚠️ Auth manager not ready after maximum attempts, proceeding anyway');
                    resolve(); // Don't throw error, just proceed
                }
            }, 100);
        });
    }

    enhanceAuthModal() {
        // Wait for modal to exist and then enhance it
        const tryEnhance = () => {
            const authModal = document.getElementById('auth-modal');
            if (!authModal) {
                console.log('🔍 Auth modal not found yet, waiting...');
                setTimeout(tryEnhance, 500);
                return;
            }

            console.log('🎨 Enhancing auth modal for mobile...');
            
            // Add mobile-specific classes
            authModal.classList.add('mobile-enhanced-auth-modal');
            
            const modalContent = authModal.querySelector('.auth-modal-content');
            if (modalContent) {
                modalContent.classList.add('mobile-enhanced-content');
            }
            
            // Add enhanced styles
            this.addEnhancedStyles();
            
            // Enhance modal behavior
            this.enhanceModalBehavior();
            
            console.log('✅ Auth modal enhanced successfully');
        };
        
        tryEnhance();
    }

    addEnhancedStyles() {
        // Check if styles already added
        if (document.getElementById('mobile-auth-enhancer-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'mobile-auth-enhancer-styles';
        style.textContent = `
            /* Mobile Auth Modal Enhancements */
            .mobile-enhanced-auth-modal {
                backdrop-filter: blur(25px) !important;
                background: rgba(0, 0, 0, 0.92) !important;
                z-index: 15000 !important;
            }

            .mobile-enhanced-content {
                width: 95% !important;
                max-width: 420px !important;
                margin: 1rem auto !important;
                border-radius: 24px !important;
                background: rgba(10, 10, 10, 0.98) !important;
                border: 2px solid rgba(0, 188, 212, 0.4) !important;
                box-shadow: 
                    0 25px 80px rgba(0, 188, 212, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.05) !important;
                backdrop-filter: blur(40px) !important;
                animation: mobileModalEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                position: relative !important;
                overflow: hidden !important;
            }

            /* Enhanced entrance animation */
            @keyframes mobileModalEntrance {
                0% {
                    opacity: 0;
                    transform: translateY(100px) scale(0.8);
                    filter: blur(10px);
                }
                60% {
                    transform: translateY(-10px) scale(1.02);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    filter: blur(0px);
                }
            }

            /* Gradient background overlay */
            .mobile-enhanced-content::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 60%;
                background: linear-gradient(
                    135deg,
                    rgba(0, 188, 212, 0.1) 0%,
                    rgba(0, 151, 167, 0.05) 50%,
                    transparent 100%
                );
                pointer-events: none;
                z-index: 0;
            }

            /* Ensure content is above overlay */
            .mobile-enhanced-content > * {
                position: relative;
                z-index: 1;
            }

            /* Enhanced header styling */
            .mobile-enhanced-content .auth-modal-header {
                text-align: center;
                padding: 2.5rem 2rem 1rem !important;
                margin-bottom: 1rem !important;
            }

            .mobile-enhanced-content .mobile-auth-logo {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 1.5rem;
                animation: logoFloat 3s ease-in-out infinite;
            }

            @keyframes logoFloat {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-8px); }
            }

            .mobile-enhanced-content .auth-logo {
                height: 70px;
                width: auto;
                filter: drop-shadow(0 0 30px rgba(0, 188, 212, 0.8));
                transition: all 0.3s ease;
            }

            .mobile-enhanced-content .auth-modal-title {
                font-size: 2rem !important;
                font-weight: 800 !important;
                margin-bottom: 1rem !important;
                background: linear-gradient(135deg, #00bcd4 0%, #00e5ff 50%, #ffffff 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                line-height: 1.2 !important;
                text-shadow: 0 0 20px rgba(0, 188, 212, 0.3);
            }

            .mobile-enhanced-content .auth-modal-subtitle {
                font-size: 1.1rem !important;
                line-height: 1.5 !important;
                margin-bottom: 2rem !important;
                color: rgba(255, 255, 255, 0.85) !important;
                font-weight: 400 !important;
            }

            /* Enhanced benefits section */
            .mobile-auth-benefits {
                background: linear-gradient(135deg, rgba(0, 188, 212, 0.08), rgba(0, 151, 167, 0.05));
                border: 1px solid rgba(0, 188, 212, 0.25);
                border-radius: 16px;
                padding: 1.5rem;
                margin: 1.5rem 0 2rem;
                backdrop-filter: blur(10px);
                animation: benefitsFadeIn 0.6s ease-out 0.3s both;
            }

            @keyframes benefitsFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .mobile-auth-benefits h4 {
                color: #00bcd4;
                font-family: 'Sora', sans-serif;
                font-size: 1.2rem;
                font-weight: 700;
                margin-bottom: 1.2rem;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .mobile-auth-benefits ul {
                list-style: none;
                padding: 0;
                margin: 0;
                display: grid;
                gap: 0.8rem;
            }

            .mobile-auth-benefits li {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.6rem 0;
                font-size: 0.95rem;
                color: rgba(255, 255, 255, 0.9);
                font-weight: 500;
                animation: benefitSlideIn 0.4s ease-out calc(var(--delay, 0) * 0.1s) both;
            }

            @keyframes benefitSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            .mobile-auth-benefits li::before {
                content: '✨';
                font-size: 1.1rem;
                flex-shrink: 0;
                animation: sparkle 2s ease-in-out infinite;
            }

            @keyframes sparkle {
                0%, 100% { transform: scale(1) rotate(0deg); }
                50% { transform: scale(1.1) rotate(5deg); }
            }

            /* Enhanced form buttons */
            .mobile-enhanced-content .auth-form-btns {
                margin-bottom: 2rem !important;
                background: rgba(0, 0, 0, 0.3) !important;
                border-radius: 16px !important;
                padding: 6px !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }

            .mobile-enhanced-content .auth-form-btn {
                flex: 1;
                padding: 1rem 1.5rem !important;
                border: none !important;
                background: transparent !important;
                color: rgba(255, 255, 255, 0.7) !important;
                font-family: 'Sora', sans-serif !important;
                font-weight: 600 !important;
                font-size: 1rem !important;
                cursor: pointer !important;
                border-radius: 12px !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                position: relative !important;
                overflow: hidden !important;
            }

            .mobile-enhanced-content .auth-form-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transition: left 0.5s ease;
            }

            .mobile-enhanced-content .auth-form-btn:hover::before {
                left: 100%;
            }

            .mobile-enhanced-content .auth-form-btn.active {
                color: white !important;
                background: linear-gradient(135deg, rgba(0, 188, 212, 0.3), rgba(0, 151, 167, 0.2)) !important;
                border: 1px solid rgba(0, 188, 212, 0.6) !important;
                box-shadow: 
                    0 0 20px rgba(0, 188, 212, 0.3),
                    inset 0 0 20px rgba(0, 188, 212, 0.1) !important;
                transform: translateY(-2px) !important;
            }

            /* Enhanced form inputs */
            .mobile-enhanced-content .auth-form input {
                width: 100% !important;
                padding: 1.3rem 1.2rem !important;
                font-size: 1rem !important;
                border-radius: 14px !important;
                border: 2px solid rgba(255, 255, 255, 0.15) !important;
                background: rgba(255, 255, 255, 0.08) !important;
                color: white !important;
                font-family: 'Inter', sans-serif !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                box-sizing: border-box !important;
                backdrop-filter: blur(10px) !important;
            }

            .mobile-enhanced-content .auth-form input:focus {
                outline: none !important;
                border-color: #00bcd4 !important;
                background: rgba(0, 188, 212, 0.08) !important;
                box-shadow: 
                    0 0 0 3px rgba(0, 188, 212, 0.2),
                    0 0 30px rgba(0, 188, 212, 0.3) !important;
                transform: translateY(-3px) !important;
            }

            .mobile-enhanced-content .auth-form input::placeholder {
                color: rgba(255, 255, 255, 0.5) !important;
                font-weight: 500 !important;
            }

            /* Enhanced submit button */
            .mobile-enhanced-content .auth-submit-btn {
                width: 100% !important;
                padding: 1.4rem 2rem !important;
                font-size: 1.1rem !important;
                font-weight: 700 !important;
                border-radius: 16px !important;
                background: linear-gradient(135deg, #00bcd4, #00acc1) !important;
                border: none !important;
                color: white !important;
                box-shadow: 
                    0 8px 25px rgba(0, 188, 212, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.1) !important;
                text-transform: uppercase !important;
                letter-spacing: 1.5px !important;
                margin-top: 1.5rem !important;
                cursor: pointer !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                position: relative !important;
                overflow: hidden !important;
                font-family: 'Sora', sans-serif !important;
            }

            .mobile-enhanced-content .auth-submit-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.6s ease;
            }

            .mobile-enhanced-content .auth-submit-btn:hover {
                background: linear-gradient(135deg, #00e5ff, #00bcd4) !important;
                transform: translateY(-3px) !important;
                box-shadow: 
                    0 12px 35px rgba(0, 188, 212, 0.6),
                    0 0 0 1px rgba(255, 255, 255, 0.2) !important;
            }

            .mobile-enhanced-content .auth-submit-btn:hover::before {
                left: 100%;
            }

            .mobile-enhanced-content .auth-submit-btn:disabled {
                opacity: 0.7 !important;
                cursor: not-allowed !important;
                transform: none !important;
                box-shadow: 0 4px 15px rgba(0, 188, 212, 0.2) !important;
            }

            /* Enhanced close button */
            .mobile-enhanced-content .auth-modal-close {
                position: absolute !important;
                top: 1.5rem !important;
                right: 1.5rem !important;
                font-size: 1.6rem !important;
                width: 44px !important;
                height: 44px !important;
                border-radius: 50% !important;
                background: rgba(255, 255, 255, 0.1) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                backdrop-filter: blur(20px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                color: rgba(255, 255, 255, 0.7) !important;
                cursor: pointer !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                z-index: 10 !important;
            }

            .mobile-enhanced-content .auth-modal-close:hover {
                background: rgba(220, 53, 69, 0.2) !important;
                color: #ff6b6b !important;
                transform: scale(1.1) rotate(90deg) !important;
                border-color: rgba(220, 53, 69, 0.4) !important;
                box-shadow: 0 0 20px rgba(220, 53, 69, 0.3) !important;
            }

            /* Enhanced messages */
            .mobile-enhanced-content .auth-message {
                border-radius: 14px !important;
                padding: 1.2rem 1.5rem !important;
                font-weight: 600 !important;
                margin-top: 1.5rem !important;
                font-size: 0.95rem !important;
                animation: messageSlideIn 0.4s ease-out !important;
                backdrop-filter: blur(10px) !important;
            }

            @keyframes messageSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .mobile-enhanced-content .auth-message.success {
                background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1)) !important;
                border: 2px solid rgba(76, 175, 80, 0.5) !important;
                color: #4caf50 !important;
                box-shadow: 0 0 20px rgba(76, 175, 80, 0.2) !important;
            }

            .mobile-enhanced-content .auth-message.error {
                background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(244, 67, 54, 0.1)) !important;
                border: 2px solid rgba(244, 67, 54, 0.5) !important;
                color: #ff6b6b !important;
                box-shadow: 0 0 20px rgba(244, 67, 54, 0.2) !important;
            }

            /* Loading animation enhancement */
            .mobile-enhanced-content .auth-loading {
                display: inline-block;
                width: 18px;
                height: 18px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: enhancedSpin 1s ease-in-out infinite;
                margin-right: 0.8rem;
            }

            @keyframes enhancedSpin {
                to { transform: rotate(360deg); }
            }

            /* Mobile responsiveness improvements */
            @media (max-width: 480px) {
                .mobile-enhanced-content {
                    width: 98% !important;
                    margin: 0.5rem !important;
                    padding: 2rem 1.5rem !important;
                    border-radius: 20px !important;
                }

                .mobile-enhanced-content .auth-logo {
                    height: 60px;
                }

                .mobile-enhanced-content .auth-modal-title {
                    font-size: 1.7rem !important;
                }

                .mobile-enhanced-content .auth-modal-subtitle {
                    font-size: 1rem !important;
                }

                .mobile-auth-benefits {
                    padding: 1.2rem;
                    margin: 1rem 0 1.5rem;
                }

                .mobile-auth-benefits h4 {
                    font-size: 1.1rem;
                }

                .mobile-auth-benefits li {
                    font-size: 0.9rem;
                    gap: 0.8rem;
                }
            }

            /* Prevent body scroll when modal is open */
            body.modal-open {
                overflow: hidden !important;
                position: fixed !important;
                width: 100% !important;
            }
        `;
        document.head.appendChild(style);
    }

    enhanceModalBehavior() {
        // Wait for auth manager to be available before enhancing behavior
        const tryEnhance = () => {
            if (!window.authManager) {
                setTimeout(tryEnhance, 200);
                return;
            }

            // Override the original show/hide methods with enhanced versions
            const originalShow = window.authManager.showLoginModal.bind(window.authManager);
            const originalHide = window.authManager.hideLoginModal.bind(window.authManager);

            window.authManager.showLoginModal = () => {
                originalShow();
                this.enhanceModalOnShow();
            };

            window.authManager.hideLoginModal = () => {
                this.enhanceModalOnHide();
                originalHide();
            };
            
            console.log('✅ Modal behavior enhanced');
        };
        
        tryEnhance();
    }

    enhanceModalOnShow() {
        // Prevent background scrolling
        document.body.classList.add('modal-open');
        
        // Add enhanced entrance animation
        const modalContent = document.querySelector('.auth-modal-content');
        if (modalContent) {
            modalContent.style.animation = 'none';
            modalContent.offsetHeight; // Trigger reflow
            modalContent.style.animation = 'mobileModalEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }
    }

    enhanceModalOnHide() {
        // Restore background scrolling
        document.body.classList.remove('modal-open');
        
        // Clear pending action if modal is closed without completion
        if (this.pendingAction) {
            console.log(`🚫 Modal closed, clearing pending action: ${this.pendingAction}`);
            this.pendingAction = null;
            this.pendingActionData = null;
        }
    }

    setupMobileAuthHandlers() {
        console.log('📱 Setting up mobile auth handlers...');
        
        // Enhanced account button handler
        this.setupAccountButtonHandler();
        
        // Enhanced generate button protection
        this.setupGenerateButtonProtection();
        
        // Enhanced like button protection
        this.setupLikeButtonProtection();
        
        // Enhanced download protection
        this.setupDownloadProtection();
        
        // Remove assets section protection - it's now public
        // this.setupAssetsSectionProtection(); // REMOVED
    }

    setupAccountButtonHandler() {
        // Handle both header account button and bottom nav account button
        const accountSelectors = [
            '.account-btn',
            '.nav-item[data-section="account"]',
            '.header-actions .account-btn'
        ];
        
        document.addEventListener('click', (e) => {
            const isAccountButton = accountSelectors.some(selector => 
                e.target.closest(selector)
            );
            
            if (isAccountButton && !window.authManager?.isAuthenticated()) {
                e.preventDefault();
                e.stopPropagation();
                this.showAuthModal('account');
            }
        });
    }

    setupGenerateButtonProtection() {
        // Handle generate button clicks
        document.addEventListener('click', (e) => {
            const generateBtn = e.target.closest('.cta-button');
            const generateNavItem = e.target.closest('.nav-item[data-section="generate"]');
            
            if ((generateBtn || generateNavItem) && !window.authManager?.isAuthenticated()) {
                e.preventDefault();
                e.stopPropagation();
                this.showAuthModal('generate');
            }
        });
    }

    setupLikeButtonProtection() {
        // Handle like button clicks globally
        document.addEventListener('click', (e) => {
            const likeBtn = e.target.closest('.like-button, .asset-like-button');
            
            if (likeBtn && !window.authManager?.isAuthenticated()) {
                e.preventDefault();
                e.stopPropagation();
                
                // Store additional context if available
                const assetCard = likeBtn.closest('.asset-card');
                const assetId = assetCard?.dataset?.assetId;
                
                this.showAuthModal('like', { assetId });
            }
        });
    }

    setupDownloadProtection() {
        // Handle download button clicks
        document.addEventListener('click', (e) => {
            const downloadBtn = e.target.closest('.download-trigger, .download-option, .download-btn');
            
            if (downloadBtn && !window.authManager?.isAuthenticated()) {
                e.preventDefault();
                e.stopPropagation();
                
                // Store download format if available
                const format = downloadBtn.id?.replace('download', '')?.toLowerCase();
                
                this.showAuthModal('download', { format });
            }
        });
    }

    setupAssetsSectionProtection() {
        // REMOVED: Assets section is now completely public
        // Users can browse and view assets without authentication
        // Authentication is only required for actions like like/download
        console.log('📖 Assets section is public - no authentication required for browsing');
    }

    setupAuthSuccessHandlers() {
        // Listen for successful authentication
        window.addEventListener('authStateChange', (event) => {
            if (event.detail.authenticated && this.pendingAction) {
                console.log(`✅ Auth success, handling pending action: ${this.pendingAction}`);
                this.handlePendingAction();
            }
        });

        // Also listen for the auth manager ready event
        window.addEventListener('authManagerReady', (event) => {
            if (event.detail.authenticated && this.pendingAction) {
                console.log(`✅ Auth manager ready with authenticated user, handling pending action: ${this.pendingAction}`);
                this.handlePendingAction();
            }
        });
    }

    showAuthModal(action, data = null) {
        if (!window.authManager) {
            console.warn('⚠️ Auth manager not available');
            return;
        }

        // Store the pending action and data
        this.pendingAction = action;
        this.pendingActionData = data;
        
        console.log(`📱 Showing auth modal for action: ${action}`, data);

        // Get configuration for this action
        const config = this.actionConfigs[action] || this.actionConfigs.generate;
        
        // Update modal content before showing
        this.updateModalContent(config);
        
        // Show the modal using existing auth manager
        window.authManager.showLoginModal();
    }

    updateModalContent(config) {
        const modalContent = document.querySelector('.auth-modal-content');
        if (!modalContent) return;

        // Update or create the enhanced header
        let header = modalContent.querySelector('.auth-modal-header');
        if (header) {
            header.innerHTML = `
                <div class="mobile-auth-logo">
                    <img src="public/threely3.png" alt="Dalma AI" class="auth-logo">
                </div>
                <h2 class="auth-modal-title">${config.title}</h2>
                <p class="auth-modal-subtitle">${config.subtitle}</p>
            `;
        }

        // Remove existing benefits section
        const existingBenefits = modalContent.querySelector('.mobile-auth-benefits');
        if (existingBenefits) {
            existingBenefits.remove();
        }

        // Add new benefits section
        const formBtns = modalContent.querySelector('.auth-form-btns');
        if (formBtns) {
            const benefitsHtml = `
                <div class="mobile-auth-benefits">
                    <h4>${config.icon} Why Sign In?</h4>
                    <ul>
                        ${config.benefits.map((benefit, index) => 
                            `<li style="--delay: ${index}">${benefit}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
            formBtns.insertAdjacentHTML('beforebegin', benefitsHtml);
        }
    }

    handlePendingAction() {
        if (!this.pendingAction) return;

        const action = this.pendingAction;
        const data = this.pendingActionData;

        console.log(`✅ Handling pending action: ${action}`, data);

        // Clear pending action first
        this.pendingAction = null;
        this.pendingActionData = null;

        // Handle different actions
        switch (action) {
            case 'generate':
                this.handleGenerateAction();
                break;
            
            case 'account':
                this.handleAccountAction();
                break;
            
            case 'like':
                this.handleLikeAction(data);
                break;
            
            case 'download':
                this.handleDownloadAction(data);
                break;
            
            case 'assets':
                this.handleAssetsAction();
                break;
            
            case 'purchase':
                this.handlePurchaseAction();
                break;
            
            default:
                console.log(`ℹ️ No specific handler for action: ${action}`);
        }
    }

    handleGenerateAction() {
        // Navigate to generate section or page
        if (window.AppNavigation) {
            window.AppNavigation.navigateToSection('generate');
        } else {
            window.location.href = 'index.html';
        }
        this.showSuccessMessage('🎨 Ready to create! Start generating amazing 3D models from your photos');
    }
    
    handleAccountAction() {
        // Navigate to account section
        if (window.AppNavigation) {
            window.AppNavigation.navigateToSection('account');
        } else {
            // For web version, could redirect to a profile page
            console.log('✅ Account access granted');
        }
        this.showSuccessMessage('👤 Welcome to your account! Manage your models and settings');
    }
    
    handleLikeAction(data) {
        // Re-enable like functionality
        this.showSuccessMessage('❤️ You can now save your favorite models to your collection!');
        
        // If there was a specific asset to like, we could trigger it here
        if (data?.assetId) {
            console.log(`💖 Ready to like asset: ${data.assetId}`);
            // Could trigger the like action automatically
        }
        
        // Refresh like buttons state if needed
        this.refreshLikeButtons();
    }
    
    handleDownloadAction(data) {
        // Re-enable download functionality
        let message = '📥 You can now download high-quality 3D models!';
        
        if (data?.format) {
            message = `📥 Ready to download in ${data.format.toUpperCase()} format!`;
        }
        
        this.showSuccessMessage(message);
    }
    
    handleAssetsAction() {
        // Navigate to assets section
        if (window.AppNavigation) {
            window.AppNavigation.navigateToSection('assets');
        } else {
            window.location.href = 'liked-assets.html';
        }
        this.showSuccessMessage('📁 Access your complete 3D model collection');
    }
    
    handlePurchaseAction() {
        // Show pricing modal or navigate to purchase flow
        if (window.enhancedMonetization || window.MobileMonetization) {
            const monetization = window.enhancedMonetization || window.MobileMonetization;
            if (monetization.showPricingModal) {
                monetization.showPricingModal();
            }
        }
        this.showSuccessMessage('💳 Ready to purchase! Choose your credit package');
    }

    refreshLikeButtons() {
        // Update like button states for authenticated user
        const likeButtons = document.querySelectorAll('.like-button, .asset-like-button');
        likeButtons.forEach(btn => {
            btn.classList.remove('disabled');
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        });
    }

    showSuccessMessage(message) {
        // Create a beautiful success message
        const successMsg = document.createElement('div');
        successMsg.className = 'mobile-auth-success-message';
        successMsg.textContent = message;
        
        successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #00bcd4, #00acc1);
            color: white;
            padding: 1.2rem 2rem;
            border-radius: 50px;
            font-family: 'Sora', sans-serif;
            font-weight: 600;
            font-size: 0.95rem;
            z-index: 15001;
            box-shadow: 
                0 8px 25px rgba(0, 188, 212, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(20px);
            animation: successMessageSlide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            max-width: 90vw;
            text-align: center;
            line-height: 1.4;
        `;

        // Add success animation if not exists
        if (!document.getElementById('successMessageAnimation')) {
            const style = document.createElement('style');
            style.id = 'successMessageAnimation';
            style.textContent = `
                @keyframes successMessageSlide {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%) scale(0.8);
                    }
                    70% {
                        transform: translateX(-50%) translateY(5px) scale(1.05);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0) scale(1);
                    }
                }
                
                .mobile-auth-success-message:hover {
                    transform: translateX(-50%) translateY(-2px) scale(1.02) !important;
                    box-shadow: 
                        0 12px 35px rgba(0, 188, 212, 0.6),
                        0 0 0 1px rgba(255, 255, 255, 0.2) !important;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(successMsg);

        // Remove after 5 seconds with fade out
        setTimeout(() => {
            successMsg.style.opacity = '0';
            successMsg.style.transform = 'translateX(-50%) translateY(-20px) scale(0.95)';
            successMsg.style.transition = 'all 0.4s ease-out';
            
            setTimeout(() => {
                if (successMsg.parentNode) {
                    successMsg.parentNode.removeChild(successMsg);
                }
            }, 400);
        }, 5000);
    }

    // Public API methods
    static showAuth(action = 'generate', data = null) {
        if (window.mobileAuthEnhancer && window.mobileAuthEnhancer.authReady) {
            window.mobileAuthEnhancer.showAuthModal(action, data);
        } else {
            console.warn('⚠️ Mobile auth enhancer not ready yet');
            // Fallback to basic auth modal
            if (window.authManager?.showLoginModal) {
                window.authManager.showLoginModal();
            }
        }
    }

    static isAuthenticated() {
        return window.authManager?.isAuthenticated() || false;
    }

    static requireAuth(callback, action = 'general') {
        if (MobileAuthEnhancer.isAuthenticated()) {
            callback();
        } else {
            MobileAuthEnhancer.showAuth(action);
        }
    }

    static getUser() {
        return window.authManager?.getUser() || null;
    }

    // Utility method to check if user has required permissions
    static hasPermission(permission) {
        const user = MobileAuthEnhancer.getUser();
        if (!user) return false;
        
        switch (permission) {
            case 'admin':
                return user.isAdmin === true;
            case 'generate':
                return true; // All authenticated users can generate
            case 'download':
                return true; // All authenticated users can download
            case 'like':
                return true; // All authenticated users can like
            default:
                return false;
        }
    }

    // Method to update user credits display (if applicable)
    static updateCreditsDisplay(credits) {
        const creditsElements = [
            document.getElementById('creditsCount'),
            document.getElementById('accountCreditsCount'),
            ...document.querySelectorAll('.user-credits-display')
        ];
        
        creditsElements.forEach(element => {
            if (element) {
                element.textContent = credits.toString();
            }
        });
    }

    // Method to show a custom modal message
    static showCustomMessage(title, message, type = 'info') {
        if (!window.mobileAuthEnhancer) return;
        
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        
        const originalContent = modal.innerHTML;
        
        const messageModal = `
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content mobile-enhanced-content">
                <div class="auth-modal-close">&times;</div>
                <div class="auth-modal-header">
                    <h2 class="auth-modal-title">${title}</h2>
                    <p class="auth-modal-subtitle">${message}</p>
                </div>
                <button class="auth-submit-btn" onclick="document.getElementById('auth-modal').style.display='none'">
                    Got It
                </button>
            </div>
        `;
        
        modal.innerHTML = messageModal;
        modal.style.display = 'flex';
        
        // Restore original content after closing
        const closeBtn = modal.querySelector('.auth-modal-close');
        const gotItBtn = modal.querySelector('.auth-submit-btn');
        
        const restore = () => {
            modal.innerHTML = originalContent;
            modal.style.display = 'none';
        };
        
        if (closeBtn) closeBtn.addEventListener('click', restore);
        if (gotItBtn) gotItBtn.addEventListener('click', restore);
    }
}

// Initialize the mobile auth enhancer with improved timing
function initializeMobileAuthEnhancer() {
    if (!window.mobileAuthEnhancer) {
        console.log('📱 Creating Mobile Auth Enhancer...');
        window.mobileAuthEnhancer = new MobileAuthEnhancer();
        
        // Make static methods globally accessible
        window.MobileAuth = MobileAuthEnhancer;
        
        console.log('📱 Mobile Auth system ready - Use MobileAuth.showAuth() to trigger');
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('mobileAuthEnhancerReady'));
    }
}

// Initialize when DOM is loaded or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for other scripts to load
        setTimeout(initializeMobileAuthEnhancer, 800);
    });
} else {
    // DOM is already loaded
    setTimeout(initializeMobileAuthEnhancer, 800);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileAuthEnhancer;
}