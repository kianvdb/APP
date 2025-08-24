if (window.Capacitor) {
    console.log('✅ Capacitor environment detected');
    // The HTTP plugin is included in @capacitor/core
}
class AuthManager {
    constructor() {
    this.user = null;
    this.isInitialized = false;
    this.initialized = false;
    
    // DISABLE account dropdown functionality - let main.js handle it
    this.accountDropdownDisabled = true;
    this.isCapacitor = window.Capacitor !== undefined;
    console.log('📱 Is Capacitor environment:', this.isCapacitor);
    
    // Use the config API URL - IMPORTANT: Make sure config is loaded first
    this.apiBaseUrl = window.APP_CONFIG?.API_BASE_URL || 
                      window.config?.API_BASE_URL || 
                      getAPIBaseURL() || // Call the function if available
                      'https://threely-ai.onrender.com/api'; // Final fallback
    
    console.log('🔧 Auth API Base URL:', this.apiBaseUrl);
    console.log('🔧 Window APP_CONFIG:', window.APP_CONFIG);
            
        console.log('🔧 Auth API Base URL:', this.apiBaseUrl);
        
        this.loginModal = null;
        this.accountDropdown = null;
        this.authCheckComplete = false;
        this.authCheckPromise = null;
        
        // Pages that require authentication
        this.protectedPages = ['manageAssets.html', 'admin-user-models.html'];
        
        // Store current user immediately if available
        this.currentUser = null;
        
        // Initialize immediately but don't await
        this.init().catch(error => {
            console.error('❌ Auth manager initialization failed:', error);
            
        });
    }
    
    getApiBaseUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isDev) {
            return `http://${hostname}:3000/api`;
        } else {
            // In production, use HTTPS if page is HTTPS
            return protocol === 'https:' 
                ? `https://${hostname}/api`
                : `http://${hostname}:3000/api`;
        }
    }

    async init() {
    console.log('🔐 Initializing AuthManager...');
    
    try {
        // Create login modal
        this.createLoginModal();
        
        // Create account dropdown (disabled)
        this.createAccountDropdown();
        
        // Check current authentication status FIRST and wait for it
        this.authCheckPromise = this.checkAuthStatus();
        await this.authCheckPromise;
        
        // Set currentUser for backward compatibility
        this.currentUser = this.user;
        
        // Handle protected pages with modal instead of redirect
        this.handleProtectedPageAccess();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // ADD THIS: Setup auth state listener for gallery updates
        this.setupAuthStateListener();
        
        // Mark as initialized BEFORE dispatching events
        this.isInitialized = true;
        this.initialized = true; // For backward compatibility
        
        console.log('✅ AuthManager initialized successfully');
        
        // Dispatch auth ready event
        window.dispatchEvent(new CustomEvent('authManagerReady', {
            detail: { 
                authenticated: !!this.user,
                user: this.user 
            }
        }));
        
        return true;
        } catch (error) {
            console.error('❌ AuthManager initialization error:', error);
            
            // Still mark as initialized even if there were errors
            this.isInitialized = true;
            this.initialized = true;
            
            // Dispatch event even on error
            window.dispatchEvent(new CustomEvent('authManagerReady', {
                detail: { 
                    authenticated: false,
                    user: null,
                    error: error.message
                }
            }));
            
            throw error;
        }
    }
async makeAuthenticatedRequest(url, options = {}) {
    // For Capacitor, just use regular fetch with full URL
    // The Capacitor WebView should handle it
    
    const authToken = localStorage.getItem('authToken');
    
    const defaultOptions = {
        method: options.method || 'GET',
        // Remove credentials for Capacitor
        credentials: window.Capacitor ? undefined : 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        }
    };
    
    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔑 Including Bearer token in request');
    }
    
    if (options.body) {
        defaultOptions.body = options.body;
    }
    
    console.log('📡 Making request to:', url);
    console.log('📡 With options:', defaultOptions);
    
    try {
        const response = await fetch(url, defaultOptions);
        console.log('📡 Response status:', response.status);
        return response;
    } catch (error) {
        console.error('❌ Fetch error:', error);
        throw error;
    }
}
  async checkAuthStatus() {
    try {
        console.log('🔍 Checking authentication status...');
        
        const response = await this.makeAuthenticatedRequest(`${this.apiBaseUrl}/auth/me`, {
            method: 'GET'
        });

        console.log('📡 Auth check response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            
            // IMPORTANT: Ensure tokens field exists
            this.user = {
                ...data.user,
                tokens: data.user.tokens !== undefined ? data.user.tokens : 1
            };
            this.currentUser = this.user;
            this.authCheckComplete = true;
            
            console.log('✅ User authenticated:', this.user.username, 'Tokens:', this.user.tokens);
            
            // CRITICAL: Sync with monetization system on auth check
            if (window.enhancedMonetization || window.EnhancedMonetization?.instance) {
                const monetization = window.enhancedMonetization || window.EnhancedMonetization.instance;
                monetization.userTokens = this.user.tokens;
                monetization.userId = this.user.id;
                monetization.isAdmin = this.user.isAdmin;
                monetization.updateTokensDisplay();
                console.log('💰 Auth check: Synced tokens to monetization:', this.user.tokens);
            }
            
            // Update AppNavigation
            if (window.AppNavigation && window.AppNavigation.updateAccountStats) {
                window.AppNavigation.updateAccountStats(this.user);
            }
            
            this.updateUI();
            this.dispatchAuthStateChange();
            return true;
        } else {
            this.user = null;
            this.currentUser = null;
            this.authCheckComplete = true;
            
            // Reset monetization for logged out user
            if (window.enhancedMonetization || window.EnhancedMonetization?.instance) {
                const monetization = window.enhancedMonetization || window.EnhancedMonetization.instance;
                monetization.loadLocalTokens(); // Load from localStorage for non-auth users
                monetization.updateTokensDisplay();
            }
            
            this.updateUI();
            this.dispatchAuthStateChange();
            return false;
        }
    } catch (error) {
        console.error('❌ Auth check error:', error);
        this.user = null;
        this.currentUser = null;
        this.authCheckComplete = true;
        this.updateUI();
        this.dispatchAuthStateChange();
        return false;
    }
}

    // Dispatch auth state change event
   dispatchAuthStateChange() {
    window.dispatchEvent(new CustomEvent('authStateChange', {
        detail: { 
            authenticated: !!this.user,
            user: this.user 
        }
    }));
}

// Setup auth state listener for gallery updates
setupAuthStateListener() {
    window.addEventListener('authStateChange', async (event) => {
        console.log('🔄 Auth state changed, updating gallery if needed...');
        
        // Check if AppNavigation exists and user is viewing gallery
        if (window.AppNavigation && window.AppNavigation.currentSection === 'assets') {
            if (event.detail.authenticated) {
                // User just logged in while viewing gallery
                console.log('👤 User logged in while viewing gallery, updating likes...');
                await window.AppNavigation.loadUserLikedAssets();
                window.AppNavigation.updateLikeButtons();
            } else {
                // User logged out while viewing gallery
                console.log('👤 User logged out while viewing gallery, clearing likes...');
                window.AppNavigation.userLikedAssets = new Set();
                window.AppNavigation.updateLikeButtons();
            }
        }
    });
}

    // Wait for auth check to complete
    async waitForAuthCheck() {
        if (this.authCheckComplete) {
            return this.isAuthenticated();
        }
        
        if (this.authCheckPromise) {
            return await this.authCheckPromise;
        }
        
        // Fallback - should not reach here
        return false;
    }

    // Handle protected page access - UPDATED FOR SPA ARCHITECTURE
    handleProtectedPageAccess() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        console.log('🔒 Checking page protection for:', currentPage);
        console.log('🔐 User authenticated:', !!this.user);
        
        // FOR SPA: Only protect standalone pages, not index.html
        // index.html is the main SPA - protection happens at feature level
        if (currentPage === 'index.html') {
            console.log('✅ SPA (index.html) accessed - protection at feature level');
            return; // No redirect needed
        }
        
        // Only protect specific standalone pages that still exist
        const standaloneProtectedPages = ['manageAssets.html', 'admin-user-models.html'];
        
        if (standaloneProtectedPages.includes(currentPage) && !this.user) {
            console.log('🚫 Unauthorized access to protected standalone page:', currentPage);
            
            // Redirect to SPA and show modal
            localStorage.setItem('dalma_redirectAfterLogin', window.location.href);
            localStorage.setItem('dalma_showLoginModal', 'true');
            window.location.replace('index.html'); // Redirect to SPA, not homepage
        } else if (standaloneProtectedPages.includes(currentPage) && this.user) {
            console.log('✅ Authorized access to protected standalone page:', currentPage);
        }
        
        // Check if we should auto-show the modal (coming from a redirect)
        if (localStorage.getItem('dalma_showLoginModal') === 'true') {
            localStorage.removeItem('dalma_showLoginModal');
            setTimeout(() => {
                this.showLoginModal();
            }, 500);
        }
    }

    // Create login modal - Clean, minimal, premium design
    createLoginModal() {
        const modalHTML = `
            <div id="auth-modal" class="premium-auth-modal" style="display: none;">
                <div class="premium-overlay"></div>
                <div class="premium-modal-content">
                    <!-- Close Button -->
                    <button class="premium-close-btn" id="premiumCloseBtn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    
                    <!-- Header -->
                    <div class="premium-header">
                        <img src="public/threely3.png" alt="Dalma AI" class="premium-logo">
                        <h2 class="premium-title">Welcome!</h2>
                        <p class="premium-subtitle">Start your 3D journey</p>
                    </div>
                    
                    <!-- Form Toggle -->
                    <div class="premium-form-toggle">
                        <button id="premium-login-btn" class="premium-toggle-btn active">Sign In</button>
                        <button id="premium-register-btn" class="premium-toggle-btn">Register</button>
                    </div>

                    <!-- Forms Container -->
                    <div class="premium-forms-container">
                        <div class="premium-forms-wrapper">
                            <!-- Login Form -->
                            <form id="premium-login-form" class="premium-form">
                                <div class="premium-input-wrapper">
                                    <input type="text" id="premiumLoginUsername" required autocomplete="username">
                                    <span class="premium-input-label">Username</span>
                                    <div class="premium-input-border"></div>
                                </div>
                                <div class="premium-input-wrapper">
                                    <input type="password" id="premiumLoginPassword" required autocomplete="current-password">
                                    <span class="premium-input-label">Password</span>
                                    <div class="premium-input-border"></div>
                                </div>
                                <button type="submit" class="premium-submit-btn">
                                    <span class="premium-btn-text">Sign In</span>
                               
                                </button>
                                <div id="premiumLoginMessage" class="premium-message" style="display: none;"></div>
                            </form>

                            <!-- Register Form -->
                            <form id="premium-register-form" class="premium-form">
                                <div class="premium-input-wrapper">
                                    <input type="text" id="premiumRegisterUsername" required autocomplete="username">
                                    <span class="premium-input-label">Username</span>
                                    <div class="premium-input-border"></div>
                                </div>
                                <div class="premium-input-wrapper">
                                    <input type="email" id="premiumRegisterEmail" required autocomplete="email">
                                    <span class="premium-input-label">Email</span>
                                    <div class="premium-input-border"></div>
                                </div>
                                <div class="premium-input-wrapper">
                                    <input type="password" id="premiumRegisterPassword" required autocomplete="new-password">
                                    <span class="premium-input-label">Password</span>
                                    <div class="premium-input-border"></div>
                                </div>
                                <button type="submit" class="premium-submit-btn">
                                    <span class="premium-btn-text">Create Account</span>
                                
                                </button>
                                <div id="premiumRegisterMessage" class="premium-message" style="display: none;"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                /* Premium Auth Modal - Clean & Minimal */
                .premium-auth-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 15000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    box-sizing: border-box;
                }

                .premium-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }

                .premium-modal-content {
                    position: relative;
                    background: rgba(10, 10, 10, 0.95);
                    border: 1px solid rgba(0, 188, 212, 0.2);
                    border-radius: 20px;
                    padding: 3rem 2.5rem 2.5rem;
                    max-width: 400px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    box-shadow: 
                        0 20px 60px rgba(0, 0, 0, 0.5),
                        0 0 0 1px rgba(255, 255, 255, 0.05);
                    animation: premiumSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .premium-close-btn {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    width: 36px;
                    height: 36px;
                    border: none;
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .premium-close-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: rgba(255, 255, 255, 0.9);
                    transform: scale(1.05);
                }

                .premium-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .premium-logo {
                    height: 60px;
                    width: auto;
                    margin-bottom: 1.5rem;
                    filter: drop-shadow(0 0 15px rgba(0, 188, 212, 0.4));
                }

                .premium-title {
                    font-family: 'Sora', sans-serif;
                    font-size: 1.8rem;
                    font-weight: 600;
                    color: white;
                    margin: 0 0 0.5rem 0;
                    line-height: 1.2;
                }

                .premium-subtitle {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 0.95rem;
                    margin: 0;
                    line-height: 1.4;
                }

                .premium-form-toggle {
                    display: flex;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                    padding: 4px;
                    margin-bottom: 2rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .premium-toggle-btn {
                    flex: 1;
                    padding: 0.8rem 1rem;
                    border: none;
                    background: transparent;
                    color: rgba(255, 255, 255, 0.6);
                    font-family: 'Inter', sans-serif;
                    font-weight: 500;
                    font-size: 0.9rem;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .premium-toggle-btn.active {
                    background: rgba(0, 188, 212, 0.15);
                    color: #00bcd4;
                    border: 1px solid rgba(0, 188, 212, 0.3);
                }

                .premium-forms-container {
                    overflow: hidden;
                    border-radius: 12px;
                }

                .premium-forms-wrapper {
                    width: 200%;
                    display: flex;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .premium-form {
                    width: 50%;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    flex-shrink: 0;
                }

                .premium-input-wrapper {
                    position: relative;
                }

                .premium-input-wrapper input {
                    width: 100%;
                    padding: 1.2rem 0 0.8rem;
                    background: transparent;
                    border: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    font-family: 'Inter', sans-serif;
                    font-size: 1rem;
                    outline: none;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }

                .premium-input-wrapper input:focus {
                    border-bottom-color: #00bcd4;
                }

                .premium-input-wrapper input:focus + .premium-input-label,
                .premium-input-wrapper input:valid + .premium-input-label {
                    top: 0;
                    font-size: 0.75rem;
                    color: #00bcd4;
                    font-weight: 500;
                }

                .premium-input-label {
                    position: absolute;
                    left: 0;
                    top: 1.2rem;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 1rem;
                    font-family: 'Inter', sans-serif;
                    transition: all 0.3s ease;
                    pointer-events: none;
                    transform-origin: left top;
                }

                .premium-input-border {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: linear-gradient(90deg, #00bcd4, #00e5ff);
                    transition: width 0.3s ease;
                }

                .premium-input-wrapper input:focus + .premium-input-label + .premium-input-border {
                    width: 100%;
                }

                .premium-submit-btn {
                    width: 100%;
                    padding: 1.2rem 2rem;
                    background: linear-gradient(135deg, #00bcd4, #00acc1);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                    box-shadow: 0 4px 15px rgba(0, 188, 212, 0.2);
                }

                .premium-submit-btn:hover:not(:disabled) {
                    background: linear-gradient(135deg, #00e5ff, #00bcd4);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 25px rgba(0, 188, 212, 0.3);
                }

                .premium-submit-btn:hover:not(:disabled) .premium-btn-icon {
                    transform: translateX(3px);
                }

                .premium-submit-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .premium-btn-icon {
                    transition: transform 0.2s ease;
                }

                .premium-message {
                    padding: 1rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    text-align: center;
                    margin-top: 1rem;
                    animation: premiumMessageSlide 0.3s ease-out;
                }

                .premium-message.success {
                    background: rgba(76, 175, 80, 0.1);
                    border: 1px solid rgba(76, 175, 80, 0.3);
                    color: #4caf50;
                }

                .premium-message.error {
                    background: rgba(244, 67, 54, 0.1);
                    border: 1px solid rgba(244, 67, 54, 0.3);
                    color: #ff6b6b;
                }

                /* Animations */
                @keyframes premiumSlideIn {
                    0% {
                        opacity: 0;
                        transform: translateY(40px) scale(0.95);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @keyframes premiumMessageSlide {
                    0% {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Mobile Responsive */
                @media (max-width: 480px) {
                    .premium-auth-modal {
                        padding: 1rem;
                    }

                    .premium-modal-content {
                        padding: 2rem 1.5rem 1.5rem;
                        border-radius: 16px;
                        max-height: 95vh;
                    }

                    .premium-title {
                        font-size: 1.5rem;
                    }

                    .premium-logo {
                        height: 50px;
                    }
                }

                /* Prevent body scroll */
                body.premium-modal-open {
                    overflow: hidden;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.loginModal = document.getElementById('auth-modal');
    }

    // Create account dropdown (disabled)
    createAccountDropdown() {
        if (this.accountDropdownDisabled) {
            console.log('🚫 Auth manager account dropdown disabled - using main.js blue shadow dropdown');
            this.accountDropdown = null;
            return;
        }
        
        const accountBtn = document.querySelector('.account-btn');
        if (!accountBtn) {
            console.warn('⚠️ Account button not found');
            return;
        }

        accountBtn.style.position = 'relative';

        const dropdownHTML = `
            <div class="account-dropdown" id="account-dropdown">
                <div class="account-user-info" id="account-user-info" style="display: none;">
                    <div class="account-dropdown-item" style="opacity: 0.7; cursor: default;">
                        <strong id="account-username">Username</strong>
                    </div>
                    <div class="account-dropdown-divider"></div>
                </div>
                <a href="liked-assets.html" class="account-dropdown-item" id="liked-assets-btn">❤️ My Liked Models</a>
                <div class="account-dropdown-divider"></div>
                <button class="account-dropdown-item" id="auth-action-btn">🔐 Login</button>
            </div>
        `;

        accountBtn.insertAdjacentHTML('afterend', dropdownHTML);
        this.accountDropdown = document.getElementById('account-dropdown');
    }

    // Set up event listeners
    setupEventListeners() {
        // Modal event listeners
        this.setupModalEventListeners();

        // Protect generate button
        this.protectGenerateButton();

        // Setup asset click handlers
        this.setupAssetClickHandlers();
    }

    // Set up modal event listeners
    setupModalEventListeners() {
        if (!this.loginModal) return;

        // Modal form switching
        const loginBtn = document.getElementById('premium-login-btn');
        const registerBtn = document.getElementById('premium-register-btn');
        const formsWrapper = document.querySelector('.premium-forms-wrapper');

        if (loginBtn && registerBtn && formsWrapper) {
            loginBtn.addEventListener('click', () => {
                formsWrapper.style.transform = 'translateX(0)';
                loginBtn.classList.add('active');
                registerBtn.classList.remove('active');
                this.clearModalMessages();
            });

            registerBtn.addEventListener('click', () => {
                formsWrapper.style.transform = 'translateX(-50%)';
                registerBtn.classList.add('active');
                loginBtn.classList.remove('active');
                this.clearModalMessages();
            });
        }

        // Modal close handlers
        const closeBtn = document.querySelector('.premium-close-btn');
        const overlay = document.querySelector('.premium-overlay');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideLoginModal());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.hideLoginModal());
        }

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.loginModal && this.loginModal.style.display === 'flex') {
                this.hideLoginModal();
            }
        });

        // Modal form handlers
        const loginForm = document.getElementById('premium-login-form');
        const registerForm = document.getElementById('premium-register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleModalLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleModalRegister(e));
        }
    }

    showLoginModal() {
    console.trace('🔍 Login modal triggered from:');
    console.log('🔍 Current page:', window.location.pathname);
    console.log('🔍 Current section:', window.AppNavigation?.currentSection);
    
    if (this.loginModal) {
        this.loginModal.style.display = 'flex';
        document.body.classList.add('premium-modal-open');
        this.clearModalMessages();
        
        setTimeout(() => {
            const firstInput = this.loginModal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

    hideLoginModal() {
        if (this.loginModal) {
            this.loginModal.style.display = 'none';
            document.body.classList.remove('premium-modal-open');
            this.clearModalMessages();
        }
    }

   async handleModalLogin(e) {
    e.preventDefault();
    
    console.log('🔐 Starting login process...');
    
    const username = document.getElementById('premiumLoginUsername').value.trim();
    const password = document.getElementById('premiumLoginPassword').value;

    if (!username || !password) {
        this.showModalMessage('premiumLoginMessage', 'Please fill in all fields', 'error');
        return;
    }

    this.setModalLoading('premium-login-form', true);
    this.clearModalMessages();

    try {
        const loginUrl = `${this.apiBaseUrl}/auth/login`;
        console.log('📡 Login URL:', loginUrl);
        
        const response = await this.makeAuthenticatedRequest(loginUrl, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        console.log('📡 Login response status:', response.status);
        
        const data = await response.json();
        console.log('📡 Login response data:', data);

        if (response.ok) {
            console.log('✅ Login successful!');
            
            // Store token if provided
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                console.log('🔑 Auth token stored');
            }
            
            // IMPORTANT: Update user data
            this.user = {
                ...data.user,
                tokens: data.user.tokens !== undefined ? data.user.tokens : 1
            };
            this.currentUser = this.user;
            
            console.log('👤 User set:', this.user.username, 'Tokens:', this.user.tokens);
            
            // Sync with monetization system
            if (window.enhancedMonetization || window.EnhancedMonetization?.instance) {
                const monetization = window.enhancedMonetization || window.EnhancedMonetization.instance;
                monetization.userTokens = this.user.tokens;
                monetization.userId = this.user.id;
                monetization.isAdmin = this.user.isAdmin || false;
                monetization.updateTokensDisplay();
                console.log('💰 Synced tokens to monetization:', this.user.tokens);
            }
            
            // Update AppNavigation
            if (window.AppNavigation && window.AppNavigation.updateAccountStats) {
                window.AppNavigation.updateAccountStats(this.user);
            }
            
            // Update UI
            this.updateUI();
            
            // Show success message
            this.showModalMessage('premiumLoginMessage', 'Login successful! Welcome back!', 'success');
            
            // Dispatch auth state change
            this.dispatchAuthStateChange();
            
            // Update status bar visibility if needed
            if (window.AppNavigation && window.AppNavigation.updateStatusBarVisibility) {
                window.AppNavigation.updateStatusBarVisibility(true);
            }
            
            // Wait a moment for the success message to show
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Hide modal
            this.hideLoginModal();
            
            // Clear form
            document.getElementById('premium-login-form').reset();
            
            // Handle redirect
            const redirectTo = localStorage.getItem('dalma_redirectAfterLogin');
            if (redirectTo) {
                console.log('🔀 Redirecting to:', redirectTo);
                localStorage.removeItem('dalma_redirectAfterLogin');
                
                // If it's a section name, navigate to it
                if (['generate', 'assets', 'account', 'about'].includes(redirectTo)) {
                    setTimeout(() => {
                        if (window.AppNavigation) {
                            window.AppNavigation.navigateToSection(redirectTo);
                        }
                    }, 200);
                } else if (redirectTo.includes('.html')) {
                    // If it's a URL, go there
                    window.location.href = redirectTo;
                }
            }
            
            console.log('✅ Login complete');
            
        } else {
            console.error('❌ Login failed:', data);
            this.showModalMessage('premiumLoginMessage', data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('❌ Modal login error:', error);
        this.showModalMessage('premiumLoginMessage', 'Cannot connect to server. Please check your connection.', 'error');
    } finally {
        this.setModalLoading('premium-login-form', false);
    }
}
// FIX 2: Update handleModalRegister to sync tokens properly
async handleModalRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('premiumRegisterUsername').value.trim();
    const email = document.getElementById('premiumRegisterEmail').value.trim();
    const password = document.getElementById('premiumRegisterPassword').value;

    if (!username || !email || !password) {
        this.showModalMessage('premiumRegisterMessage', 'Please fill in all fields', 'error');
        return;
    }

    if (username.length < 3) {
        this.showModalMessage('premiumRegisterMessage', 'Username must be at least 3 characters long', 'error');
        return;
    }

    if (password.length < 6) {
        this.showModalMessage('premiumRegisterMessage', 'Password must be at least 6 characters long', 'error');
        return;
    }

    this.setModalLoading('premium-register-form', true);
    this.clearModalMessages();

    try {
        const response = await this.makeAuthenticatedRequest(`${this.apiBaseUrl}/auth/register`, {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token for Capacitor/mobile
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                console.log('🔑 Auth token stored for mobile/Capacitor');
            }
            
            // IMPORTANT FIX: Ensure tokens field exists (new users get 1 token)
            this.user = {
                ...data.user,
                tokens: data.user.tokens !== undefined ? data.user.tokens : 1
            };
            this.currentUser = this.user;
            
            console.log('👤 New user registered with tokens:', this.user.tokens);
            
            // CRITICAL: Sync tokens with monetization system
            if (window.enhancedMonetization || window.EnhancedMonetization?.instance) {
                const monetization = window.enhancedMonetization || window.EnhancedMonetization.instance;
                monetization.userTokens = this.user.tokens;
                monetization.userId = this.user.id;
                monetization.isAdmin = this.user.isAdmin || false;
                monetization.updateTokensDisplay();
                console.log('💰 Synced tokens to monetization system:', this.user.tokens);
            }
            
            // Update AppNavigation if it exists
            if (window.AppNavigation && window.AppNavigation.updateAccountStats) {
                window.AppNavigation.updateAccountStats(this.user);
            }
            
            this.updateUI();
            this.showModalMessage('premiumRegisterMessage', 'Account created! Welcome to Dalma AI!', 'success');
            
            this.dispatchAuthStateChange();
            
            if (window.AppNavigation && window.AppNavigation.updateStatusBarVisibility) {
                window.AppNavigation.updateStatusBarVisibility(true);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.hideLoginModal();
            document.getElementById('premium-register-form').reset();
            
            // Handle redirect
            const registerRedirectUrl = localStorage.getItem('dalma_redirectAfterLogin');
            if (registerRedirectUrl) {
                localStorage.removeItem('dalma_redirectAfterLogin');
                
                if (['generate', 'assets', 'account', 'about'].includes(registerRedirectUrl)) {
                    setTimeout(() => {
                        if (window.AppNavigation) {
                            window.AppNavigation.navigateToSection(registerRedirectUrl);
                        }
                    }, 200);
                    return;
                }
            }
            
            console.log('✅ Registration complete, tokens synced');
            
        } else {
            this.showModalMessage('premiumRegisterMessage', data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Modal register error:', error);
        this.showModalMessage('premiumRegisterMessage', 'Network error. Please try again.', 'error');
    } finally {
        this.setModalLoading('premium-register-form', false);
    }
}

async logout() {
    try {
        // Call logout endpoint
        const response = await fetch(`${this.apiBaseUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
        });

        // Clear stored auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('dalma_user');
        sessionStorage.removeItem('authToken');
        
        // Clear user data
        this.user = null;
        this.currentUser = null;
        
        // Show status bar for logged-out user
        if (window.AppNavigation && window.AppNavigation.updateStatusBarVisibility) {
            window.AppNavigation.updateStatusBarVisibility(false);
        }
        
        // Update UI
        this.updateUI();
        
        // Dispatch auth state change
        this.dispatchAuthStateChange();
        
        // Navigate to assets section
        if (window.AppNavigation) {
            // Update navigation labels instead of updateUIForAuthState
            window.AppNavigation.updateAccountNavLabel(null);
            window.AppNavigation.updateTopBarAccountButton();
            window.AppNavigation.navigateToSection('assets');
        }
        
        console.log('✅ User logged out successfully');
        
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        
        // Even if server logout fails, clear local data
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('dalma_user');
        sessionStorage.removeItem('authToken');
        
        this.user = null;
        this.currentUser = null;
        
        // Show status bar
        if (window.AppNavigation && window.AppNavigation.updateStatusBarVisibility) {
            window.AppNavigation.updateStatusBarVisibility(false);
        }
        
        // Update UI
        this.updateUI();
        
        // Update navigation labels
        if (window.AppNavigation) {
            window.AppNavigation.updateAccountNavLabel(null);
            window.AppNavigation.updateTopBarAccountButton();
        }
        
        // Dispatch auth state change
        this.dispatchAuthStateChange();
        
        return { success: false, error: error.message };
    }
}
    // Update UI based on auth state
    updateUI() {
        this.updateAccountDropdown();
        this.updateAdminNavigation();
    }

    // Update account dropdown
    updateAccountDropdown() {
        if (this.accountDropdownDisabled) {
            console.log('🚫 Account dropdown update disabled - using main.js blue shadow dropdown');
            return;
        }
        
        const userInfo = document.getElementById('account-user-info');
        const username = document.getElementById('account-username');
        const authActionBtn = document.getElementById('auth-action-btn');

        if (this.user) {
            if (userInfo) userInfo.style.display = 'block';
            if (username) username.textContent = this.user.username;
            if (authActionBtn) {
                authActionBtn.innerHTML = '🚪 Logout';
            }
        } else {
            if (userInfo) userInfo.style.display = 'none';
            if (authActionBtn) {
                authActionBtn.innerHTML = '🔐 Login';
            }
        }
    }

    // Update admin navigation with both Asset Manager and User Models
    updateAdminNavigation() {
        const nav = document.querySelector('.nav-left');
        const mobileNav = document.querySelector('.mobile-nav');
        
        if (!nav) return;

        // Remove existing admin items
        const existingAdminItems = document.querySelectorAll('.admin-nav-item');
        existingAdminItems.forEach(item => item.remove());

        // Add admin items if user is admin
        if (this.user && this.user.isAdmin) {
            console.log('🔧 Adding admin navigation items');
            
            // Desktop nav - Asset Manager
            const assetManagerLink = document.createElement('a');
            assetManagerLink.href = 'manageAssets.html';
            assetManagerLink.textContent = 'Asset Manager';
            assetManagerLink.className = 'admin-nav-item show';
            assetManagerLink.style.color = 'white';
            assetManagerLink.style.textDecoration = 'none';
            assetManagerLink.style.fontFamily = 'Inter, sans-serif';
            assetManagerLink.style.fontWeight = '500';
            assetManagerLink.style.fontSize = '0.95rem';
            assetManagerLink.style.transition = 'color 0.3s ease';
            
            assetManagerLink.addEventListener('mouseenter', () => {
                assetManagerLink.style.color = '#00bcd4';
            });
            
            assetManagerLink.addEventListener('mouseleave', () => {
                assetManagerLink.style.color = 'white';
            });

            nav.appendChild(assetManagerLink);
            
            // Desktop nav - User Models Manager
            const userModelsLink = document.createElement('a');
            userModelsLink.href = 'admin-user-models.html';
            userModelsLink.textContent = 'User Models';
            userModelsLink.className = 'admin-nav-item show';
            userModelsLink.style.color = 'white';
            userModelsLink.style.textDecoration = 'none';
            userModelsLink.style.fontFamily = 'Inter, sans-serif';
            userModelsLink.style.fontWeight = '500';
            userModelsLink.style.fontSize = '0.95rem';
            userModelsLink.style.transition = 'color 0.3s ease';
            
            userModelsLink.addEventListener('mouseenter', () => {
                userModelsLink.style.color = '#00bcd4';
            });
            
            userModelsLink.addEventListener('mouseleave', () => {
                userModelsLink.style.color = 'white';
            });

            nav.appendChild(userModelsLink);
            
            // Mobile nav
            if (mobileNav) {
                const mobileAssetManagerLink = assetManagerLink.cloneNode(true);
                mobileAssetManagerLink.style = ''; // Reset inline styles for mobile
                
                const mobileUserModelsLink = userModelsLink.cloneNode(true);
                mobileUserModelsLink.style = ''; // Reset inline styles for mobile
                
                // Insert before account button
                const accountBtn = mobileNav.querySelector('.account-btn');
                if (accountBtn) {
                    mobileNav.insertBefore(mobileAssetManagerLink, accountBtn);
                    mobileNav.insertBefore(mobileUserModelsLink, accountBtn);
                } else {
                    mobileNav.appendChild(mobileAssetManagerLink);
                    mobileNav.appendChild(mobileUserModelsLink);
                }
            }
            
            console.log('✅ Admin navigation items added: Asset Manager & User Models');
        }
    }

    // Protect ALL generate buttons - both hero button and navigation
    protectGenerateButton() {
        // Protect main CTA button (hero section)
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            ctaButton.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Wait for auth check to complete
                const isAuthenticated = await this.waitForAuthCheck();
                
                if (!isAuthenticated) {
                    // Store intended destination for after login
                    localStorage.setItem('dalma_redirectAfterLogin', 'generate');
                    console.log('🔐 Hero generate button clicked - not authenticated, showing login modal');
                    console.log('📍 Stored redirect:', localStorage.getItem('dalma_redirectAfterLogin'));
                    this.showLoginModal();
                } else {
                    // User is authenticated, navigate to generate section
                    console.log('✅ Hero generate button clicked - authenticated, going to generate section');
                    if (window.AppNavigation) {
                        window.AppNavigation.navigateToSection('generate');
                    } else {
                        // Fallback if AppNavigation not available
                        window.location.href = 'index.html#generate';
                    }
                }
            });
            console.log('✅ CTA (hero) generate button protected');
        }
        
        // Also protect any other generate buttons that might exist
        const generateButtons = document.querySelectorAll('[data-action="generate"], .generate-btn, button[onclick*="generate"]');
        generateButtons.forEach(btn => {
            if (btn !== ctaButton) { // Don't double-protect the CTA button
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    
                    const isAuthenticated = await this.waitForAuthCheck();
                    
                    if (!isAuthenticated) {
                        localStorage.setItem('dalma_redirectAfterLogin', 'generate');
                        console.log('🔐 Generate button clicked - not authenticated, showing login modal');
                        this.showLoginModal();
                    } else {
                        console.log('✅ Generate button clicked - authenticated, proceeding');
                        if (window.AppNavigation) {
                            window.AppNavigation.navigateToSection('generate');
                        }
                    }
                });
            }
        });
        
        // Set up observer for dynamically added generate buttons
        this.setupGenerateButtonObserver();
    }

    // Watch for dynamically added generate buttons
    setupGenerateButtonObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node is a generate button
                        if (node.classList && (node.classList.contains('cta-button') || node.classList.contains('generate-btn'))) {
                            this.protectSingleGenerateButton(node);
                        }
                        
                        // Check if any child nodes are generate buttons
                        const generateBtns = node.querySelectorAll && node.querySelectorAll('.cta-button, .generate-btn, [data-action="generate"]');
                        if (generateBtns) {
                            generateBtns.forEach(btn => this.protectSingleGenerateButton(btn));
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.generateButtonObserver = observer;
    }

    // Protect a single generate button
    protectSingleGenerateButton(button) {
        // Check if already protected
        if (button.dataset.authProtected === 'true') return;
        
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const isAuthenticated = await this.waitForAuthCheck();
            
            if (!isAuthenticated) {
                localStorage.setItem('dalma_redirectAfterLogin', 'generate');
                console.log('🔐 Dynamic generate button clicked - not authenticated, showing login modal');
                this.showLoginModal();
            } else {
                console.log('✅ Dynamic generate button clicked - authenticated, proceeding');
                if (window.AppNavigation) {
                    window.AppNavigation.navigateToSection('generate');
                }
            }
        });
        
        // Mark as protected
        button.dataset.authProtected = 'true';
        console.log('✅ Generate button protected:', button);
    }

    // Setup asset click handlers - Allow navigation, don't require auth
    setupAssetClickHandlers() {
        document.addEventListener('click', async (e) => {
            const assetCard = e.target.closest('.asset-card');
            if (assetCard) {
                console.log('🎯 Asset card clicked, allowing normal navigation');
                
                // Call the global handleAssetClick function if it exists
                if (window.handleAssetClick) {
                    window.handleAssetClick(assetCard);
                }
            }
        });
    }

    // Show liked assets
    async showLikedAssets() {
        if (!this.user) {
            this.showLoginModal();
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/liked-assets`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Liked assets:', data.assets);
                alert(`You have ${data.assets.length} liked assets!`);
            } else {
                console.error('Failed to fetch liked assets');
            }
        } catch (error) {
            console.error('Error fetching liked assets:', error);
        }
    }

    // Utility functions for modal
    showModalMessage(elementId, message, type = 'error') {
        const messageEl = document.getElementById(elementId);
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `premium-message ${type}`;
            messageEl.style.display = 'block';
            
            // Auto-hide success messages after 3 seconds
            if (type === 'success') {
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 3000);
            }
        }
    }

    clearModalMessages() {
        ['premiumLoginMessage', 'premiumRegisterMessage'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.textContent = '';
            }
        });
    }

    setModalLoading(formId, loading) {
        const form = document.getElementById(formId);
        if (!form) return;

        const button = form.querySelector('button[type="submit"]');
        const btnText = button?.querySelector('.premium-btn-text');
        const btnIcon = button?.querySelector('.premium-btn-icon');
        
        if (loading) {
            if (button) button.disabled = true;
            if (btnText) btnText.textContent = 'Processing...';
            if (btnIcon) {
                btnIcon.innerHTML = `
                    <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <style>
                        @keyframes spin { to { transform: rotate(360deg); } }
                    </style>
                `;
            }
        } else {
            if (button) button.disabled = false;
            if (btnText) {
                btnText.textContent = formId === 'premium-login-form' ? 'Sign In' : 'Create Account';
            }
            if (btnIcon) {
                btnIcon.innerHTML = `
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12,5 19,12 12,19"></polyline>
                `;
            }
        }
    }

    // Public methods
    isAuthenticated() {
        return !!this.user;
    }

    getUser() {
        return this.user;
    }

    getCurrentUser() {
        return this.user; // For backward compatibility
    }

    async requireAuth(callback) {
        const isAuthenticated = await this.waitForAuthCheck();
        if (isAuthenticated) {
            callback();
        } else {
            // Store current page for redirect after login
            localStorage.setItem('dalma_redirectAfterLogin', window.location.href);
            this.showLoginModal();
        }
    }

    // Method to refresh auth status
    async refreshAuthStatus() {
        await this.checkAuthStatus();
        return this.isAuthenticated();
    }
}

// Initialize auth manager when DOM is loaded or immediately if already loaded
let authManager;

function initializeAuthManager() {
    if (!authManager) {
        console.log('🚀 Creating AuthManager...');
        authManager = new AuthManager();
        
        // Make it globally available immediately
        window.authManager = authManager;
        
        console.log('🚀 Auth manager created and globally available');
    }
}

// Initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthManager);
} else {
    // DOM is already loaded
    initializeAuthManager();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}