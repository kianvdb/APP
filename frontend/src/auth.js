// Complete Enhanced Authentication System for DALMA AI
// Supports both web and mobile app usage with modal-only approach

class AuthManager {
    constructor() {
        this.user = null;
        this.isInitialized = false;
        this.initialized = false; // Backward compatibility
        
        // DISABLE account dropdown functionality - let main.js handle it
        this.accountDropdownDisabled = true;
        
        // Dynamically match the hostname being used with protocol awareness
        this.apiBaseUrl = this.getApiBaseUrl();
            
        console.log('🔧 Auth API Base URL:', this.apiBaseUrl);
        
        this.loginModal = null;
        this.accountDropdown = null;
        this.authCheckComplete = false;
        this.authCheckPromise = null;
        
        // Pages that require authentication
        this.protectedPages = ['index.html', 'generate.html', 'liked-assets.html'];
        
        // Store current user immediately if available
        this.currentUser = null;
        
        this.init();
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
        
        this.isInitialized = true;
        this.initialized = true; // For backward compatibility
        
        // Dispatch auth ready event
        window.dispatchEvent(new CustomEvent('authManagerReady', {
            detail: { 
                authenticated: !!this.user,
                user: this.user 
            }
        }));
        
        console.log('✅ AuthManager initialized');
    }

    // Check if user is authenticated
    async checkAuthStatus() {
        try {
            console.log('🔍 Checking authentication status...');
            console.log('🍪 Document cookies:', document.cookie);
            
            const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log('📡 Auth check response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                this.currentUser = data.user; // For backward compatibility
                this.authCheckComplete = true;
                this.updateUI();
                console.log('✅ User authenticated:', this.user.username);
                
                // Dispatch auth state change event
                this.dispatchAuthStateChange();
                return true;
            } else {
                // Only log error details if it's not a 401 (which is expected when not logged in)
                if (response.status !== 401) {
                    const errorData = await response.json().catch(() => ({}));
                    console.log('❌ Auth check failed:', errorData);
                }
                this.user = null;
                this.currentUser = null;
                this.authCheckComplete = true;
                this.updateUI();
                console.log('ℹ️ User not authenticated');
                
                // Dispatch auth state change event
                this.dispatchAuthStateChange();
                return false;
            }
        } catch (error) {
            console.error('❌ Auth check error:', error);
            this.user = null;
            this.currentUser = null;
            this.authCheckComplete = true;
            this.updateUI();
            
            // Dispatch auth state change event
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

    // Handle protected page access with modal instead of redirect
    handleProtectedPageAccess() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        console.log('🔒 Checking page protection for:', currentPage);
        console.log('🔐 User authenticated:', !!this.user);
        console.log('📋 Protected pages:', this.protectedPages);
        
        if (this.protectedPages.includes(currentPage) && !this.user) {
            console.log('🚫 Unauthorized access to protected page:', currentPage);
            
            // For truly protected pages, redirect to homepage and show modal
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            sessionStorage.setItem('showLoginModal', 'true');
            window.location.replace('html/homepage.html');
        } else if (this.protectedPages.includes(currentPage) && this.user) {
            console.log('✅ Authorized access to protected page:', currentPage);
        }
        
        // Check if we should auto-show the modal (coming from a redirect)
        if (sessionStorage.getItem('showLoginModal') === 'true') {
            sessionStorage.removeItem('showLoginModal');
            setTimeout(() => {
                this.showLoginModal();
            }, 500); // Small delay to ensure page is loaded
        }
    }

    // Create login modal - Enhanced for mobile
    createLoginModal() {
        const modalHTML = `
            <div id="auth-modal" class="auth-modal" style="display: none;">
                <div class="auth-modal-overlay"></div>
                <div class="auth-modal-content">
                    <div class="auth-modal-close">&times;</div>
                    <div class="auth-modal-header">
                        <h2 class="auth-modal-title">Sign in to continue</h2>
                        <p class="auth-modal-subtitle">Access all features of DALMA AI</p>
                    </div>
                    
                    <div class="auth-form-btns">
                        <button id="modal-login-btn" class="auth-form-btn active">Login</button>
                        <button id="modal-register-btn" class="auth-form-btn">Register</button>
                    </div>

                    <div class="auth-form-container">
                        <div class="auth-form-wrapper">
                            <!-- Login Form -->
                            <form id="modal-login-form" class="auth-form">
                                <input type="text" id="modalLoginUsername" placeholder="Username" required>
                                <input type="password" id="modalLoginPassword" placeholder="Password" required>
                                <button type="submit" class="auth-submit-btn">
                                    <span class="btn-text">Sign In</span>
                                </button>
                                <div id="modalLoginMessage" class="auth-message" style="display: none;"></div>
                            </form>

                            <!-- Register Form -->
                            <form id="modal-register-form" class="auth-form">
                                <input type="text" id="modalRegisterUsername" placeholder="Username" required>
                                <input type="email" id="modalRegisterEmail" placeholder="Email" required>
                                <input type="password" id="modalRegisterPassword" placeholder="Password" required>
                                <button type="submit" class="auth-submit-btn">
                                    <span class="btn-text">Create Account</span>
                                </button>
                                <div id="modalRegisterMessage" class="auth-message" style="display: none;"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
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
        const modalLoginBtn = document.getElementById('modal-login-btn');
        const modalRegisterBtn = document.getElementById('modal-register-btn');
        const authFormWrapper = document.querySelector('.auth-form-wrapper');

        if (modalLoginBtn && modalRegisterBtn && authFormWrapper) {
            modalLoginBtn.addEventListener('click', () => {
                authFormWrapper.style.transform = 'translateX(0)';
                modalLoginBtn.classList.add('active');
                modalRegisterBtn.classList.remove('active');
                this.clearModalMessages();
            });

            modalRegisterBtn.addEventListener('click', () => {
                authFormWrapper.style.transform = 'translateX(-50%)';
                modalRegisterBtn.classList.add('active');
                modalLoginBtn.classList.remove('active');
                this.clearModalMessages();
            });
        }

        // Modal close handlers
        const closeBtn = document.querySelector('.auth-modal-close');
        const overlay = document.querySelector('.auth-modal-overlay');

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
        const modalLoginForm = document.getElementById('modal-login-form');
        const modalRegisterForm = document.getElementById('modal-register-form');

        if (modalLoginForm) {
            modalLoginForm.addEventListener('submit', (e) => this.handleModalLogin(e));
        }

        if (modalRegisterForm) {
            modalRegisterForm.addEventListener('submit', (e) => this.handleModalRegister(e));
        }
    }

    // Show/hide modal
    showLoginModal() {
        if (this.loginModal) {
            this.loginModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
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
            document.body.style.overflow = ''; // Restore scrolling
            this.clearModalMessages();
        }
    }

    // Handle modal login
    async handleModalLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('modalLoginUsername').value.trim();
        const password = document.getElementById('modalLoginPassword').value;

        if (!username || !password) {
            this.showModalMessage('modalLoginMessage', 'Please fill in all fields', 'error');
            return;
        }

        this.setModalLoading('modal-login-form', true);
        this.clearModalMessages();

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.user = data.user;
                this.currentUser = data.user; // For backward compatibility
                this.updateUI();
                this.showModalMessage('modalLoginMessage', 'Login successful! Redirecting...', 'success');
                
                // Dispatch auth state change event
                this.dispatchAuthStateChange();
                
                // Wait longer to ensure cookie is set
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                this.hideLoginModal();
                document.getElementById('modal-login-form').reset();
                
                // Check if we're on view-asset page and just reload to update auth state
                if (window.location.pathname.includes('view-asset.html')) {
                    window.location.reload();
                    return;
                }
                
                // Check for redirect
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                console.log('🔄 Checking redirect URL:', redirectUrl);
                
                if (redirectUrl) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    
                    // If the redirect URL is to index.html or contains index.html, use it
                    if (redirectUrl.includes('index.html')) {
                        console.log('🚀 Redirecting to index.html (generate page)');
                        window.location.href = 'index.html';
                    } else {
                        // For other redirects, use them
                        window.location.href = redirectUrl;
                    }
                } else {
                    // Default: reload current page
                    window.location.reload();
                }
            } else {
                this.showModalMessage('modalLoginMessage', data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Modal login error:', error);
            this.showModalMessage('modalLoginMessage', 'Network error. Please try again.', 'error');
        } finally {
            this.setModalLoading('modal-login-form', false);
        }
    }

    // Handle modal register
    async handleModalRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('modalRegisterUsername').value.trim();
        const email = document.getElementById('modalRegisterEmail').value.trim();
        const password = document.getElementById('modalRegisterPassword').value;

        if (!username || !email || !password) {
            this.showModalMessage('modalRegisterMessage', 'Please fill in all fields', 'error');
            return;
        }

        if (username.length < 3) {
            this.showModalMessage('modalRegisterMessage', 'Username must be at least 3 characters long', 'error');
            return;
        }

        if (password.length < 6) {
            this.showModalMessage('modalRegisterMessage', 'Password must be at least 6 characters long', 'error');
            return;
        }

        this.setModalLoading('modal-register-form', true);
        this.clearModalMessages();

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.user = data.user;
                this.currentUser = data.user; // For backward compatibility
                this.updateUI();
                this.showModalMessage('modalRegisterMessage', 'Account created successfully! Redirecting...', 'success');
                
                // Dispatch auth state change event
                this.dispatchAuthStateChange();
                
                // Wait longer to ensure cookie is set
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                this.hideLoginModal();
                document.getElementById('modal-register-form').reset();
                
                // Check if we're on view-asset page and just reload to update auth state
                if (window.location.pathname.includes('view-asset.html')) {
                    window.location.reload();
                    return;
                }
                
                // Check for redirect
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                console.log('🔄 Checking redirect URL after register:', redirectUrl);
                
                if (redirectUrl) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    
                    // If the redirect URL is to index.html or contains index.html, use it
                    if (redirectUrl.includes('index.html')) {
                        console.log('🚀 Redirecting to index.html (generate page) after register');
                        window.location.href = 'index.html';
                    } else {
                        // For other redirects, use them
                        window.location.href = redirectUrl;
                    }
                } else {
                    // Default: reload current page
                    window.location.reload();
                }
            } else {
                this.showModalMessage('modalRegisterMessage', data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Modal register error:', error);
            this.showModalMessage('modalRegisterMessage', 'Network error. Please try again.', 'error');
        } finally {
            this.setModalLoading('modal-register-form', false);
        }
    }

    // Logout
    async logout() {
        try {
            await fetch(`${this.apiBaseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            this.user = null;
            this.currentUser = null;
            this.updateUI();
            console.log('✅ User logged out');
            
            // Dispatch auth state change event
            this.dispatchAuthStateChange();
            
            // Clear any stored auth data
            localStorage.removeItem('dalma_user');
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Redirect to homepage after logout
            window.location.href = 'html/homepage.html';
        } catch (error) {
            console.error('❌ Logout error:', error);
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

    // Protect generate button - show modal instead of redirecting
    protectGenerateButton() {
        const generateBtn = document.querySelector('.cta-button');
        if (generateBtn) {
            generateBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Wait for auth check to complete
                const isAuthenticated = await this.waitForAuthCheck();
                
                if (!isAuthenticated) {
                    // Store intended destination for after login
                    sessionStorage.setItem('redirectAfterLogin', 'index.html');
                    console.log('🔐 Generate button clicked - not authenticated, showing login modal');
                    this.showLoginModal();
                } else {
                    // User is authenticated, proceed to index.html
                    console.log('✅ Generate button clicked - authenticated, going to index.html');
                    window.location.href = 'index.html';
                }
            });
        }
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
            messageEl.className = `auth-message ${type}`;
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
        ['modalLoginMessage', 'modalRegisterMessage'].forEach(id => {
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
        const btnText = button?.querySelector('.btn-text');
        
        if (loading) {
            if (button) button.disabled = true;
            if (btnText) btnText.innerHTML = '<span class="auth-loading"></span>Processing...';
        } else {
            if (button) button.disabled = false;
            if (btnText) {
                btnText.textContent = formId === 'modal-login-form' ? 'Sign In' : 'Create Account';
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
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            this.showLoginModal();
        }
    }

    // Method to refresh auth status
    async refreshAuthStatus() {
        await this.checkAuthStatus();
        return this.isAuthenticated();
    }
}

// Initialize auth manager when DOM is loaded
let authManager;

document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    
    // Make it globally available immediately
    window.authManager = authManager;
    
    console.log('🚀 Auth manager created and globally available');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}