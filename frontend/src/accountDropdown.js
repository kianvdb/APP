// accountDropdown.js - Shared account dropdown functionality for all pages
console.log('📊 Account Dropdown Module Loading...');

// Helper function to get API URL with proper protocol
function getAccountApiUrl() {
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

// Global namespace for account dropdown
window.AccountDropdown = {
    API_BASE_URL: getAccountApiUrl(),
    currentUser: null,
    isInitialized: false
};

console.log('🔧 Account Dropdown API URL:', window.AccountDropdown.API_BASE_URL);

// Get current user
async function getCurrentUser() {
    try {
        console.log('🔐 Checking current user for dropdown...');
        
        const response = await fetch(`${AccountDropdown.API_BASE_URL}/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.log('❌ User not authenticated');
            return null;
        }
        
        const data = await response.json();
        AccountDropdown.currentUser = data.user;
        console.log('✅ User authenticated:', data.user.username || data.user.email, 'Role:', data.user.role);
        return data.user;
    } catch (error) {
        console.error('❌ Error getting current user:', error);
        return null;
    }
}

// Show login prompt instead of redirecting to non-existent login.html
function showLoginPrompt() {
    // Remove any existing prompt
    const existingPrompt = document.querySelector('.login-prompt-modal');
    if (existingPrompt) existingPrompt.remove();
    
    const prompt = document.createElement('div');
    prompt.className = 'login-prompt-modal';
    prompt.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 30000;
        backdrop-filter: blur(10px);
    `;
    
    prompt.innerHTML = `
        <div style="
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid rgba(0, 188, 212, 0.3);
            border-radius: 16px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 8px 32px rgba(0, 188, 212, 0.2);
            backdrop-filter: blur(20px);
        ">
            <h2 style="
                color: white;
                font-family: 'Sora', sans-serif;
                margin-bottom: 1rem;
                font-size: 1.5rem;
            ">Login Required</h2>
            <p style="
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 1.5rem;
                font-family: 'Inter', sans-serif;
                line-height: 1.6;
            ">You need to be logged in to access this feature. Please use the account button to log in.</p>
            <button onclick="closeLoginPrompt()" style="
                background: #00bcd4;
                color: white;
                border: none;
                padding: 0.8rem 2rem;
                border-radius: 8px;
                font-family: 'Sora', sans-serif;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 100%;
            " onmouseover="this.style.background='#00e5ff'" onmouseout="this.style.background='#00bcd4'">
                OK
            </button>
        </div>
    `;
    
    document.body.appendChild(prompt);
    
    // Click outside to close
    prompt.addEventListener('click', (e) => {
        if (e.target === prompt) {
            closeLoginPrompt();
        }
    });
}

// Close login prompt
function closeLoginPrompt() {
    const prompt = document.querySelector('.login-prompt-modal');
    if (prompt) prompt.remove();
}

// Show account menu dropdown
function showAccountMenu(user, buttonElement) {
    // Remove any existing menu first
    const existingMenu = document.querySelector('.account-dropdown-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'account-dropdown-menu';
    
    // Match homepage styling exactly
    menu.style.cssText = `
        position: fixed !important;
        top: 70px !important;
        right: 20px !important;
        background: rgba(20, 20, 20, 0.95) !important;
        border: 1px solid rgba(0, 188, 212, 0.3) !important;
        border-radius: 8px !important;
        padding: 1rem !important;
        z-index: 20000 !important;
        backdrop-filter: blur(20px) !important;
        box-shadow: 0 8px 32px rgba(0, 188, 212, 0.2) !important;
        min-width: 200px !important;
        opacity: 0 !important;
        transform: translateY(-10px) !important;
        transition: opacity 0.2s ease, transform 0.2s ease !important;
    `;
    
    menu.innerHTML = `
        <div style="color: white; font-family: 'Sora', sans-serif; margin-bottom: 0.5rem;">
            <strong>${user.username || user.email}</strong>
        </div>
        <div style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 1rem;">
            ${user.role === 'admin' ? '👑 Administrator' : '👤 User'}
        </div>
        ${user.role === 'admin' ? `
            <a href="admin-user-models.html" style="display: block; color: #00bcd4; text-decoration: none; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); transition: all 0.2s ease;">
                User Models
            </a>
            <a href="admin-asset-manager.html" style="display: block; color: #00bcd4; text-decoration: none; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); transition: all 0.2s ease;">
                Asset Manager
            </a>
        ` : ''}
        <a href="html/homepage.html#assets" style="display: block; color: #00bcd4; text-decoration: none; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); transition: all 0.2s ease;">
            View All Assets
        </a>
        <a href="#" onclick="navigateToLikedAssets(event)" style="display: block; color: #00bcd4; text-decoration: none; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); transition: all 0.2s ease;">
            Liked Assets
        </a>
        <a href="#" onclick="handleLogout(event)" style="display: block; color: #ff6b6b; text-decoration: none; padding: 0.5rem 0; transition: all 0.2s ease;" data-logout="true">
            Log out
        </a>
    `;
    
    document.body.appendChild(menu);
    
    // Add hover effects to links
    const links = menu.querySelectorAll('a');
    links.forEach(link => {
        const isLogoutLink = link.hasAttribute('data-logout');
        
        link.addEventListener('mouseenter', function() {
            if (isLogoutLink) {
                this.style.color = '#ff9999';
                this.style.paddingLeft = '0.5rem';
            } else {
                this.style.color = '#00e5ff';
                this.style.paddingLeft = '0.5rem';
            }
        });
        
        link.addEventListener('mouseleave', function() {
            if (isLogoutLink) {
                this.style.color = '#ff6b6b';
                this.style.paddingLeft = '0';
            } else {
                this.style.color = '#00bcd4';
                this.style.paddingLeft = '0';
            }
        });
    });
    
    // Animate in
    setTimeout(() => {
        menu.style.opacity = '1';
        menu.style.transform = 'translateY(0)';
    }, 10);
    
    // Click outside to close
    const closeHandler = (e) => {
        if (!menu.contains(e.target) && !e.target.closest('.account-btn')) {
            closeDropdown();
        }
    };
    
    // Scroll to close
    const scrollHandler = () => {
        closeDropdown();
    };
    
    // Close dropdown function
    const closeDropdown = () => {
        if (menu.parentNode) {
            menu.remove();
        }
        // Remove all event listeners
        document.removeEventListener('click', closeHandler);
        window.removeEventListener('scroll', scrollHandler);
    };
    
    // Add event handlers after animation completes
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
        // Add scroll handler with a delay to prevent immediate closing
        setTimeout(() => {
            window.addEventListener('scroll', scrollHandler);
        }, 100);
    }, 300);
}

// Navigate to liked assets with authentication check
async function navigateToLikedAssets(event) {
    event.preventDefault();
    
    try {
        // Double-check authentication in case session expired
        const user = await getCurrentUser();
        
        if (user) {
            // User is authenticated, navigate to liked assets
            window.location.href = 'liked-assets.html';
        } else {
            // Session expired, close dropdown and show login prompt
            const menu = document.querySelector('.account-dropdown-menu');
            if (menu) menu.remove();
            
            // Store intended destination
            sessionStorage.setItem('redirectAfterLogin', 'liked-assets.html');
            
            // Show auth interface
            if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
                window.authManager.showLoginModal();
            } else {
                showLoginPrompt();
            }
        }
    } catch (error) {
        console.error('❌ Error navigating to liked assets:', error);
        // On error, try direct navigation
        window.location.href = 'liked-assets.html';
    }
}

// Handle logout
async function handleLogout(event) {
    event.preventDefault();
    
    try {
        const response = await fetch(`${AccountDropdown.API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('✅ Logged out successfully');
            
            // Remove dropdown
            const menu = document.querySelector('.account-dropdown-menu');
            if (menu) menu.remove();
            
            // Update navigation if function exists
            if (typeof updateNavigationForUser === 'function') {
                updateNavigationForUser(null);
            }
            
            // Dispatch logout event
            window.dispatchEvent(new CustomEvent('userLoggedOut'));
            
            // Show notification if function exists
            if (typeof showNotificationToast === 'function') {
                showNotificationToast('Logged out successfully', 'success', 3000);
            } else {
                // Simple fallback notification
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(76, 175, 80, 0.9);
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    font-family: 'Sora', sans-serif;
                    z-index: 10000;
                    transition: all 0.3s ease;
                `;
                toast.textContent = 'Logged out successfully';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }
            
            // Update account button text
            updateAccountButtonText(null);
            
            // Refresh page after a short delay to update UI
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('❌ Logout error:', error);
        if (typeof showNotificationToast === 'function') {
            showNotificationToast('Error logging out', 'error', 3000);
        }
    }
}

// Update account button text
function updateAccountButtonText(user) {
    const accountButtons = document.querySelectorAll('.account-btn');
    accountButtons.forEach(btn => {
        if (user) {
            btn.textContent = user.username || user.email || 'Account';
            btn.title = 'Manage your account';
        } else {
            btn.textContent = 'Account';
            btn.title = 'Login or Sign up';
        }
    });
}

// Setup account button click handlers
function setupAccountButtonHandlers() {
    console.log('🔧 Setting up account button handlers...');
    
    // Remove any existing handlers by cloning nodes
    document.querySelectorAll('.account-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Re-select buttons after cloning
    document.querySelectorAll('.account-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('👤 Account button clicked');
            
            // Check if dropdown exists
            const existingDropdown = document.querySelector('.account-dropdown-menu');
            
            if (existingDropdown) {
                // Close existing dropdown
                existingDropdown.remove();
                return;
            }
            
            // Get user and show appropriate interface
            const user = await getCurrentUser();
            
            if (user) {
                // User is logged in - show account dropdown
                showAccountMenu(user, btn);
            } else {
                // User is not logged in - show login modal or prompt
                console.log('❌ User not logged in, showing login interface');
                
                if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
                    window.authManager.showLoginModal();
                } else {
                    // Show inline login prompt instead of redirecting
                    showLoginPrompt();
                }
            }
        });
    });
    
    console.log('✅ Account button handlers setup complete');
}

// Update navigation for user (page-specific implementation)
function updateNavigationForUser(user) {
    console.log('🔄 Updating navigation for user:', user ? (user.username || user.email) : 'guest');
    
    const nav = document.querySelector('.nav');
    const navLeft = document.querySelector('.nav-left');
    const mobileNav = document.querySelector('.mobile-nav');
    
    if (!nav || !navLeft) {
        console.warn('⚠️ Navigation elements not found');
        return;
    }
    
    // Remove existing admin items
    document.querySelectorAll('.admin-nav-item').forEach(item => item.remove());
    
    // Check if user is admin
    const isAdmin = user && (user.role === 'admin' || user.isAdmin);
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // FIXED: Add about.html to the list of pages that support admin navigation
    const adminSupportedPages = ['index.html', 'homepage.html', 'about.html'];
    
    if (isAdmin && adminSupportedPages.includes(currentPage)) {
        console.log(`👑 Admin user on ${currentPage} - adding admin navigation`);
        
        // Remove compact layout
        nav.classList.remove('nav-compact');
        
        // Add admin navigation items
        const generateLink = navLeft.querySelector('a[href="index.html"]');
        const adminItems = [
            { href: 'admin-user-models.html', text: 'User Models' },
            { href: 'admin-asset-manager.html', text: 'Asset Manager' }
        ];
        
        adminItems.forEach(item => {
            const adminLink = document.createElement('a');
            adminLink.href = item.href;
            adminLink.textContent = item.text;
            adminLink.classList.add('admin-nav-item');
            
            if (generateLink) {
                navLeft.insertBefore(adminLink, generateLink);
            } else {
                navLeft.appendChild(adminLink);
            }
        });
        
        // Add to mobile nav
        if (mobileNav) {
            const accountBtn = mobileNav.querySelector('.account-btn');
            adminItems.forEach(item => {
                const adminLink = document.createElement('a');
                adminLink.href = item.href;
                adminLink.textContent = item.text;
                adminLink.classList.add('admin-nav-item');
                if (accountBtn) {
                    mobileNav.insertBefore(adminLink, accountBtn);
                } else {
                    mobileNav.appendChild(adminLink);
                }
            });
        }
    } else if (!isAdmin && adminSupportedPages.includes(currentPage)) {
        // Add compact layout for non-admin users on supported pages
        nav.classList.add('nav-compact');
    }
    
    // Update account button text
    updateAccountButtonText(user);
}

// Initialize account dropdown system
async function initializeAccountDropdown() {
    if (AccountDropdown.isInitialized) {
        console.log('⚠️ Account dropdown already initialized');
        return;
    }
    
    console.log('🚀 Initializing account dropdown system...');
    AccountDropdown.isInitialized = true;
    
    // Get current user
    const user = await getCurrentUser();
    
    // Update navigation for user
    updateNavigationForUser(user);
    
    // Setup button handlers
    setupAccountButtonHandlers();
    
    // Listen for auth state changes
    window.addEventListener('authStateChange', async (event) => {
        console.log('🔄 Auth state changed, updating dropdown system');
        const newUser = await getCurrentUser();
        updateNavigationForUser(newUser);
        updateAccountButtonText(newUser);
    });
    
    window.addEventListener('userLoggedOut', () => {
        console.log('🔄 User logged out event received');
        AccountDropdown.currentUser = null;
        updateNavigationForUser(null);
        updateAccountButtonText(null);
    });
    
    console.log('✅ Account dropdown system initialized');
}

// Mobile navigation toggle (shared function)
function toggleMobileNav() {
    console.log('📱 Toggle mobile nav called');
    const mobileNav = document.getElementById('mobileNav');
    const hamburger = document.querySelector('.hamburger');
    if (mobileNav && hamburger) {
        mobileNav.classList.toggle('active');
        hamburger.classList.toggle('active');
    }
}

// Make functions globally available
window.toggleMobileNav = toggleMobileNav;
window.handleLogout = handleLogout;
window.initializeAccountDropdown = initializeAccountDropdown;
window.showAccountMenu = showAccountMenu;
window.getCurrentUser = getCurrentUser;
window.updateNavigationForUser = updateNavigationForUser;
window.showLoginPrompt = showLoginPrompt;
window.closeLoginPrompt = closeLoginPrompt;
window.navigateToLikedAssets = navigateToLikedAssets;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAccountDropdown);
} else {
    // DOM already loaded
    initializeAccountDropdown();
}

console.log('✅ Account Dropdown Module Loaded');