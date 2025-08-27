/**
 * AppNavigation - Main navigation controller for Threely mobile app
 * Handles section navigation, authentication states, and content loading
 * @class AppNavigation
 */
class AppNavigation {
    constructor() {
        // Core navigation state
        this.currentSection = 'home';
        this.sections = ['home', 'generate', 'assets', 'account', 'about'];
        this.loadedSections = new Set();
        this.sectionContent = {};
        
        // Assets gallery management
        this.assetsData = {
            allAssets: [],
            likedAssets: new Set(),
            filteredAssets: [],
            currentPage: 1,
            assetsPerPage: 8,
            isLoadingLikes: false,
            searchTerm: '',
            sortBy: 'recent'
        };
        
        // Liked models management for account section
        this.likedAssetsData = {
            assets: [],
            filteredAssets: [],
            currentPage: 1,
            assetsPerPage: 8,
            searchTerm: '',
            sortBy: 'recent',
            isLoading: false,
            showLikedModels: false
        };
        
        console.log('🚀 AppNavigation initialized with public assets access');
    }

    /**
     * Controls Android status bar visibility based on authentication state
     * @param {boolean} isLoggedIn - Current authentication status
     */
    updateStatusBarVisibility(isLoggedIn) {
        // Android WebView specific functionality
        if (window.AndroidAds) {
            if (isLoggedIn) {
                if (window.AndroidAds.hideStatusBar) {
                    window.AndroidAds.hideStatusBar();
                }
                document.body.classList.add('status-bar-hidden');
            } else {
                if (window.AndroidAds.showStatusBar) {
                    window.AndroidAds.showStatusBar();
                }
                document.body.classList.remove('status-bar-hidden');
            }
        }
    }

    /**
     * Resets a section to its initial state
     * @param {string} sectionName - Name of the section to reset
     */
    resetSectionState(sectionName) {
        console.log(`🔄 Resetting ${sectionName} section state`);
        
        switch(sectionName) {
            case 'generate':
                this.resetGenerateSection();
                break;
            case 'account':
                this.resetAccountSection();
                break;
            case 'about':
                this.resetAboutSection();
                break;
            case 'assets':
                this.resetAssetsSection();
                break;
            case 'home':
                this.resetHomeSection();
                break;
        }
    }

    /**
     * Resets the generate section to default state
     */
    resetGenerateSection() {
        if (window.generateController) {
            // Reset to form view
            window.generateController.resetToForm();
            
            // Clear file input
            const imageInput = document.getElementById('imageInput');
            if (imageInput) {
                imageInput.value = '';
            }
            
            // Reset upload area display
            const uploadPlaceholder = document.getElementById('uploadPlaceholder');
            const uploadPreview = document.getElementById('uploadPreview');
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
            if (uploadPreview) uploadPreview.style.display = 'none';
            
            // Clear preview image
            const previewImage = document.getElementById('previewImage');
            if (previewImage) {
                previewImage.src = '';
            }
            
            // Reset settings to defaults
            if (window.generateController.generateState) {
                window.generateController.generateState.settings = {
                    symmetryMode: 'auto',
                    topology: 'triangle',
                    targetPolycount: 30000,
                    shouldTexture: true,
                    enablePBR: false
                };
            }
            
            // Reset UI toggles to defaults
            this.resetGenerateUIToDefaults();
        }
    }

    /**
     * Resets the account section to main view
     */
    resetAccountSection() {
    // Find the main account content container
    const accountSection = document.getElementById('accountSection');
    if (accountSection) {
        // Reset to main view
        const accountContent = accountSection.querySelector('.account-content');
        const likedModelsView = document.getElementById('likedModelsView');
        
        if (accountContent) {
            accountContent.style.display = 'block';
        }
        if (likedModelsView) {
            likedModelsView.style.display = 'none';
        }
        
        // Scroll to top
        accountSection.scrollTop = 0;
        
        // Reset any inner containers
        const accountContainer = accountSection.querySelector('.account-container');
        if (accountContainer) {
            accountContainer.scrollTop = 0;
        }
    }
}

    /**
     * Resets the about section scroll position
     */
    resetAboutSection() {
        const aboutSection = document.getElementById('aboutSection');
        if (aboutSection) {
            aboutSection.scrollTop = 0;
            // Reset inner scrollable containers
            const aboutContainer = aboutSection.querySelector('.about-container');
            if (aboutContainer) aboutContainer.scrollTop = 0;
            const sectionContent = aboutSection.querySelector('.section-content');
            if (sectionContent) sectionContent.scrollTop = 0;
        }
    }

    /**
     * Resets the assets gallery section
     */
    resetAssetsSection() {
        // Reset search and filters
        const searchInput = document.getElementById('mobileAssetSearchInput');
        const sortSelect = document.getElementById('mobileSortSelect');
        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'recent';
        
        this.assetsData.searchTerm = '';
        this.assetsData.sortBy = 'recent';
        this.assetsData.currentPage = 1;
        
        // Scroll to top
        const assetsSection = document.getElementById('assetsSection');
        if (assetsSection) {
            assetsSection.scrollTop = 0;
            // Reset inner scrollable containers
            const assetsContainer = assetsSection.querySelector('.assets-mobile-container');
            if (assetsContainer) assetsContainer.scrollTop = 0;
            const sectionContent = assetsSection.querySelector('.section-content');
            if (sectionContent) sectionContent.scrollTop = 0;
        }
        
        // Re-filter assets to reset view
        if (this.assetsData.allAssets.length > 0) {
            this.filterAndRenderAssets();
        }
    }

    /**
     * Resets the home section scroll position
     */
    resetHomeSection() {
        const homeSection = document.getElementById('homeSection');
        if (homeSection) {
            homeSection.scrollTop = 0;
        }
    }

    /**
     * Resets generate form UI elements to default values
     */
    resetGenerateUIToDefaults() {
        const settingsItems = document.querySelectorAll('.settings-item');
        
        settingsItems.forEach(item => {
            const label = item.querySelector('.settings-item-label');
            if (!label) return;
            
            const labelText = label.textContent.toLowerCase();
            const toggleButtons = item.querySelectorAll('.toggle-btn');
            
            // Reset toggle buttons based on setting type
            if (labelText.includes('symmetry')) {
                toggleButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === 'auto');
                });
            } else if (labelText.includes('topology')) {
                toggleButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === 'triangle');
                });
            } else if (labelText.includes('texture')) {
                toggleButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.value === 'true');
                });
            }
        });
        
        // Reset PBR checkbox
        const pbrCheckbox = document.getElementById('pbrCheckbox');
        if (pbrCheckbox) {
            pbrCheckbox.checked = false;
        }
        
        // Reset polycount slider
        const polycountSlider = document.getElementById('polycountSlider');
        const polycountValue = document.getElementById('polycountValue');
        if (polycountSlider) {
            polycountSlider.value = 30000;
            if (polycountValue) {
                polycountValue.textContent = '30,000';
            }
        }
        
        // Collapse settings section
        const settingsSection = document.querySelector('.settings-section');
        const settingsContent = document.getElementById('settingsContent');
        if (settingsSection) {
            settingsSection.classList.remove('expanded');
        }
        if (settingsContent) {
            settingsContent.style.display = 'none';
        }
        
        // Update settings summary
        const settingsSummary = document.getElementById('settingsSummary');
        if (settingsSummary) {
            settingsSummary.textContent = '30K polys, Textured';
        }
        
        // Update controller if exists
        if (window.generateController && window.generateController.updateSettingsSummary) {
            window.generateController.updateSettingsSummary();
        }
    }

    /**
     * Cleanup handler for logout action
     */
    handleLogoutCleanup() {
        console.log('🧹 Cleaning up all sections after logout');
        
        // Reset all sections
        this.sections.forEach(section => {
            this.resetSectionState(section);
        });
        
        // Clear loaded sections to force reload
        this.loadedSections.clear();
        
        // Navigate to home
        this.navigateToSection('home');
    }

    /**
     * Navigate to a specific section
     * @param {string} sectionName - Target section name
     */
    async navigateToSection(sectionName) {
        if (sectionName === this.currentSection) return;
        
        console.log(`📱 Navigating from ${this.currentSection} to: ${sectionName}`);
        
        // Reset the previous section state when leaving
        if (this.currentSection) {
            this.resetSectionState(this.currentSection);
        }
        
        // Update navigation state
        this.updateNavigation(sectionName);
        
        // Show section
        await this.showSection(sectionName);
        
        // Force scroll reset after section is shown
        setTimeout(() => {
            const sectionElement = document.getElementById(`${sectionName}Section`);
            if (sectionElement) {
                sectionElement.scrollTop = 0;
                console.log(`✅ Forced scroll reset for ${sectionName}`);
            }
        }, 100);
        
        this.currentSection = sectionName;
    }

    /**
     * Shows a section with optional animation
     * @param {string} sectionName - Section to display
     * @param {boolean} skipAnimation - Whether to skip animation
     */
    async showSection(sectionName, skipAnimation = false) {
    const sectionElement = document.getElementById(`${sectionName}Section`);
    
    if (!sectionElement) {
        console.error(`❌ Section not found: ${sectionName}`);
        return;
    }

    // Stop all animations first
    this.stopAllAnimations();

    // Hide all sections
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    // Load content if not already loaded
    if (!this.loadedSections.has(sectionName)) {
        await this.loadSectionContent(sectionName);
    }

    // Reset scroll position before showing
    sectionElement.scrollTop = 0;

    // Show new section
    sectionElement.style.display = 'block';
    sectionElement.classList.add('active');
    
    // Force layout recalculation
    sectionElement.offsetHeight;
    
    // Reset scroll again after display
    sectionElement.scrollTop = 0;
    
    // Special handling for about section
    if (sectionName === 'about') {
        const aboutContainer = sectionElement.querySelector('.about-container');
        if (aboutContainer) {
            aboutContainer.scrollTop = 0;
            aboutContainer.style.overflowY = 'auto';
            aboutContainer.style.height = '100%';
        }
        
        // Debug: Check if particleField exists at different times
        console.log('Checking for particleField immediately:', !!document.getElementById('particleField'));
        
        setTimeout(() => {
            console.log('Checking for particleField after 100ms:', !!document.getElementById('particleField'));
        }, 100);
        
        setTimeout(() => {
            console.log('Checking for particleField after 300ms:', !!document.getElementById('particleField'));
            this.initializeAbout();
        }, 300);
        
        setTimeout(() => {
            console.log('Checking for particleField after 500ms:', !!document.getElementById('particleField'));
            const pf = document.getElementById('particleField');
            if (pf) {
                console.log('ParticleField children count:', pf.children.length);
                console.log('ParticleField HTML:', pf.innerHTML);
            }
        }, 500);
    }
    
// Special handling for account section
if (sectionName === 'account') {
    const accountContent = sectionElement.querySelector('.account-content');
    const likedModelsView = document.getElementById('likedModelsView');
    
    if (accountContent && likedModelsView) {
        // Always show main account view when navigating to account
        accountContent.style.display = 'block';
        likedModelsView.style.display = 'none';
    }
    
    // Reset account container scroll
    const accountContainer = sectionElement.querySelector('.account-container');
    if (accountContainer) {
        accountContainer.scrollTop = 0;
    }

}


    // Start animations for other sections
    if (sectionName !== 'about') {
        setTimeout(() => {
            this.startSectionAnimations(sectionName);
        }, 100);
    }
    
    console.log(`✅ Section displayed: ${sectionName}`);
}

    /**
     * Updates navigation UI to reflect active section
     * @param {string} activeSection - Currently active section
     */
    updateNavigation(activeSection) {
        // Update bottom navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.section === activeSection) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Sets up bottom navigation event listeners
     */
    setupBottomNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.navigateToSection(section);
            });
        });
        
        console.log('✅ Bottom navigation set up');
    }

    /**
     * Initialize the navigation system
     * @param {string} initialSection - Optional initial section to load
     */
    init(initialSection = null) {
        console.log('🎯 Setting up app navigation with public assets access...');
        
        // Clear any stuck redirects if not authenticated
        const isAuthenticated = window.authManager?.isAuthenticated();
        if (!isAuthenticated) {
            this.clearAuthRedirects();
        }
        
        this.setupBottomNavigation();
        this.initializeMobileAssetViewer();
        
        // Define protected and public sections
        const protectedSections = ['generate', 'account'];
        const publicSections = ['home', 'assets', 'about'];
        
        // Determine initial section
        const sectionToLoad = this.determineInitialSection(
            initialSection, 
            isAuthenticated, 
            protectedSections, 
            publicSections
        );
        
        // Load initial section
        this.loadSectionContent(sectionToLoad).then(() => {
            this.showSection(sectionToLoad, true);
        }).catch(error => {
            console.error('❌ Failed to load initial section:', error);
            // Fallback to home on error
            this.currentSection = 'home';
            this.updateNavigation('home');
            this.loadSectionContent('home').then(() => {
                this.showSection('home', true);
            });
        });
        
        // Update UI based on authentication state
        this.updateAuthenticationUI(isAuthenticated);
        this.setupAccountButtonHandler();
        this.setupTokenUpdateListener();
        
        console.log('✅ App navigation ready with public assets access');
    }

    /**
     * Clears authentication redirects from storage
     */
    clearAuthRedirects() {
        localStorage.removeItem('dalma_redirectAfterLogin');
        sessionStorage.removeItem('redirect');
        sessionStorage.removeItem('pendingRedirect');
        
        // Remove redirect from URL params
        const url = new URL(window.location);
        url.searchParams.delete('redirect');
        if (url.searchParams.toString() === '') {
            window.history.replaceState({}, '', window.location.pathname);
        } else {
            window.history.replaceState({}, '', url);
        }
        
        console.log('🚫 Cleared stuck redirects - user not authenticated');
    }

    /**
     * Initializes the Mobile Asset Viewer component
     */
    initializeMobileAssetViewer() {
        if (typeof MobileAssetViewer !== 'undefined' && !window.MobileAssetViewer) {
            window.MobileAssetViewer = new MobileAssetViewer();
            console.log('✅ Created new MobileAssetViewer instance');
        }

        if (window.MobileAssetViewer && !window.MobileAssetViewer.viewerInitialized) {
            window.MobileAssetViewer.initializeViewerHTML();
            console.log('✅ Mobile Asset Viewer HTML initialized');
        } else if (window.MobileAssetViewer && window.MobileAssetViewer.viewerInitialized) {
            console.log('✅ Mobile Asset Viewer already initialized');
        } else {
            console.warn('⚠️ MobileAssetViewer not available, will retry later');
            // Retry after delay if script hasn't loaded
            setTimeout(() => {
                if (typeof MobileAssetViewer !== 'undefined' && !window.MobileAssetViewer) {
                    window.MobileAssetViewer = new MobileAssetViewer();
                }
                if (window.MobileAssetViewer && !window.MobileAssetViewer.viewerInitialized) {
                    window.MobileAssetViewer.initializeViewerHTML();
                    console.log('✅ Mobile Asset Viewer initialized (delayed)');
                }
            }, 1000);
        }
    }

    /**
     * Determines which section to load initially
     * @param {string} initialSection - Requested initial section
     * @param {boolean} isAuthenticated - Authentication status
     * @param {Array} protectedSections - Sections requiring auth
     * @param {Array} publicSections - Public sections
     * @returns {string} Section to load
     */
    determineInitialSection(initialSection, isAuthenticated, protectedSections, publicSections) {
        const urlParams = new URLSearchParams(window.location.search);
        let redirectSection = null;
        
        if (isAuthenticated) {
            // Authenticated users can go anywhere
            redirectSection = urlParams.get('redirect') || localStorage.getItem('dalma_redirectAfterLogin');
            if (redirectSection) {
                localStorage.removeItem('dalma_redirectAfterLogin');
                // Clean URL
                const url = new URL(window.location);
                url.searchParams.delete('redirect');
                window.history.replaceState({}, '', url.searchParams.toString() === '' ? window.location.pathname : url);
            }
        } else {
            // Non-authenticated users limited to public sections
            const requestedSection = urlParams.get('redirect');
            if (requestedSection && publicSections.includes(requestedSection)) {
                redirectSection = requestedSection;
            } else if (requestedSection && protectedSections.includes(requestedSection)) {
                console.log('🔒 Attempted to access protected section without auth:', requestedSection);
                redirectSection = null;
            }
        }
        
        const sectionToLoad = initialSection || redirectSection || 'home';
        console.log('📍 Initial section to load:', sectionToLoad);
        
        // Validate section
        if (protectedSections.includes(sectionToLoad) && !isAuthenticated) {
            console.log('🔒 Redirecting to home - attempted to load protected section:', sectionToLoad);
            this.currentSection = 'home';
            this.updateNavigation('home');
            return 'home';
        } else if (!this.sections.includes(sectionToLoad)) {
            console.warn(`⚠️ Invalid section: ${sectionToLoad}, defaulting to home`);
            this.currentSection = 'home';
            this.updateNavigation('home');
            return 'home';
        }
        
        this.currentSection = sectionToLoad;
        this.updateNavigation(sectionToLoad);
        return sectionToLoad;
    }

    /**
     * Updates UI elements based on authentication status
     * @param {boolean} isAuthenticated - Current auth status
     */
    updateAuthenticationUI(isAuthenticated) {
        this.updateStatusBarVisibility(isAuthenticated);

        if (isAuthenticated) {
            const userData = window.authManager?.currentUser || {};
            this.updateAccountNavLabel(userData.email);
            this.updateTopBarAccountButton();
            this.updateLikedCount();
        } else {
            this.updateAccountNavLabel(null);
            this.updateTopBarAccountButton();
        }
    }

    /**
     * Sets up the account button click handler
     */
    setupAccountButtonHandler() {
        const accountBtn = document.querySelector('.header-actions .account-btn');
        if (accountBtn) {
            // Remove existing listeners
            accountBtn.replaceWith(accountBtn.cloneNode(true));
            const newAccountBtn = document.querySelector('.header-actions .account-btn');
            
            newAccountBtn.addEventListener('click', () => {
                const isAuth = window.authManager?.isAuthenticated();
                if (!isAuth) {
                    window.authManager?.showLoginModal();
                } else {
                    this.navigateToSection('account');
                }
            });
        }
    }

    /**
     * Updates account navigation label
     * @param {string} username - Username to display
     */
    updateAccountNavLabel(username = null) {
        const accountNavItem = document.querySelector('.nav-item[data-section="account"] .nav-label');
        if (accountNavItem) {
            accountNavItem.textContent = username ? 'Account' : 'Login';
        }
    }

    /**
     * Updates the top bar account button text
     */
    updateTopBarAccountButton() {
        const accountBtn = document.querySelector('.header-actions .account-btn');
        if (accountBtn) {
            const isAuthenticated = window.authManager?.isAuthenticated();
            if (isAuthenticated) {
                const userData = window.authManager?.currentUser || {};
                const username = userData.email || 'User';
                const displayName = username.length > 12 ? username.substring(0, 12) + '...' : username;
                accountBtn.textContent = displayName;
            } else {
                accountBtn.textContent = 'Login';
            }
        }
    }

    /**
     * Updates the count of liked models
     */
    async updateLikedModelsCount() {
        try {
            // Count local and backend models
            const localModels = await window.LocalStorageManager.getAllLocalModels();
            let backendCount = 0;
            
            try {
                const response = await window.makeAuthenticatedRequest(
                    `${this.getApiBaseUrl()}/auth/liked-assets`,
                    { method: 'GET' }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    backendCount = data.assets ? data.assets.length : 0;
                }
            } catch (error) {
                console.warn('Could not get backend count:', error);
            }
            
            // Use the higher count to account for duplicates
            const totalCount = Math.max(localModels.length, backendCount);
            
            // Update count display
            const countElement = document.getElementById('accountModelsCount');
            if (countElement) {
                countElement.textContent = totalCount;
            }
        } catch (error) {
            console.error('Error updating liked models count:', error);
        }
    }

    /**
     * Updates the liked count in the UI
     */
    updateLikedCount() {
        const countElement = document.getElementById('accountModelsCount');
        if (countElement) {
            // Check local storage first
            window.LocalStorageManager.getAllLocalModels().then(localModels => {
                let count = localModels.length;
                
                // Check backend if authenticated
                if (window.authManager?.isAuthenticated()) {
                    window.makeAuthenticatedRequest(
                        `${this.getApiBaseUrl()}/auth/liked-assets`,
                        { method: 'GET' }
                    ).then(response => {
                        if (response.ok) {
                            return response.json();
                        }
                    }).then(data => {
                        if (data && data.assets) {
                            count = Math.max(count, data.assets.length);
                            countElement.textContent = count;
                        }
                    }).catch(error => {
                        console.warn('Could not get backend liked count:', error);
                        countElement.textContent = count;
                    });
                } else {
                    countElement.textContent = count;
                }
            }).catch(error => {
                console.error('Error getting liked count:', error);
                countElement.textContent = '0';
            });
        }
    }

    /**
     * Loads liked models from local and cloud storage
     */
    async loadLikedModels() {
        const likedModelsGrid = document.getElementById('likedModelsGrid');
        const likedModelsEmpty = document.getElementById('likedModelsEmpty');
        const likedModelsLoading = document.getElementById('likedModelsLoading');
        const likedModelsError = document.getElementById('likedModelsError');
        
        if (!likedModelsGrid) return;
        
        // Show loading state
        if (likedModelsLoading) likedModelsLoading.style.display = 'block';
        if (likedModelsEmpty) likedModelsEmpty.style.display = 'none';
        if (likedModelsError) likedModelsError.style.display = 'none';
        
        try {
            // Load from local storage for instant display
            const localModels = await window.LocalStorageManager.getAllLocalModels();
            
            // Hide loading if we have local models
            if (localModels.length > 0 && likedModelsLoading) {
                likedModelsLoading.style.display = 'none';
            }
            
            // Render local models immediately
            if (localModels.length > 0) {
                likedModelsGrid.innerHTML = localModels.map(model => this.createLocalModelCard(model)).join('');
            } else {
                if (likedModelsEmpty) likedModelsEmpty.style.display = 'block';
            }
            
            // Update models count
            const modelsCount = document.getElementById('accountModelsCount');
            if (modelsCount) {
                modelsCount.textContent = localModels.length;
            }
            
            // Sync with cloud models
            window.makeAuthenticatedRequest(
                `${this.getApiBaseUrl()}/auth/liked-assets`,
                { method: 'GET' }
            ).then(response => {
                if (response.ok) {
                    return response.json();
                }
            }).then(data => {
                if (data && data.assets && data.assets.length > 0) {
                    console.log('☁️ Cloud models synced:', data.assets.length);
                    
                    // Combine local and backend models
                    const allModels = [...localModels];
                    const seenTaskIds = new Set(localModels.map(m => m.taskId).filter(Boolean));
                    
                    // Add non-duplicate backend models
                    data.assets.forEach(model => {
                        if (!seenTaskIds.has(model.meshyTaskId)) {
                            allModels.push(model);
                        }
                    });
                    
                    // Re-render grid with all models
                    if (allModels.length > 0) {
                        likedModelsGrid.innerHTML = allModels.map(model => {
                            if (model.localData) {
                                return this.createLocalModelCard(model);
                            } else {
                                return this.createBackendModelCard(model);
                            }
                        }).join('');
                        
                        // Update total count
                        if (modelsCount) {
                            modelsCount.textContent = allModels.length;
                        }
                        
                        console.log(`✅ Total liked models: ${allModels.length}`);
                    }
                }
            }).catch(error => {
                console.warn('Using local models only:', error);
            });
            
        } catch (error) {
            console.error('❌ Error loading models:', error);
            if (likedModelsLoading) likedModelsLoading.style.display = 'none';
            if (likedModelsError) likedModelsError.style.display = 'block';
        }
    }

    /**
     * Creates a card element for local model display
     * @param {Object} model - Local model data
     * @returns {string} HTML string for model card
     */
    createLocalModelCard(model) {
        const thumbnailUrl = model.localData?.thumbnail 
            ? URL.createObjectURL(model.localData.thumbnail)
            : '/api/placeholder/180/180';
        
        const syncIcon = model.syncStatus === 'synced' 
            ? '☁️' 
            : model.syncStatus === 'pending' 
            ? '⏳' 
            : '📱';
        
        const totalSize = model.localData?.metadata?.totalSize || 0;
        const sizeInMB = (totalSize / 1024 / 1024).toFixed(1);
        const formats = model.localData?.metadata?.formats || ['glb'];
        
        return `
            <div class="model-card" onclick="window.LocalModelViewer.openLocalModel('${model.id}')" 
                 style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.3s ease; position: relative;">
                <div style="aspect-ratio: 1; background: url('${thumbnailUrl}') center/cover; position: relative;">
                    <span style="position: absolute; top: 8px; left: 8px; font-size: 1.2rem;" title="Sync status">${syncIcon}</span>
                    <div style="position: absolute; bottom: 8px; left: 8px; display: flex; gap: 4px;">
                        ${formats.map(format => `
                            <span style="background: rgba(0,188,212,0.2); color: #00bcd4; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; border: 1px solid rgba(0,188,212,0.3);">${format}</span>
                        `).join('')}
                    </div>
                    <button onclick="event.stopPropagation(); window.AppNavigation.removeLocalModel('${model.id}')" 
                            style="position: absolute; top: 8px; right: 8px; background: rgba(220,53,69,0.9); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
                <div style="padding: 0.8rem;">
                    <h4 style="color: white; font-size: 0.9rem; margin-bottom: 0.3rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${model.name}</h4>
                    <div style="display: flex; gap: 1rem; color: rgba(255,255,255,0.5); font-size: 0.75rem;">
                        <span>${sizeInMB} MB</span>
                        <span>${model.localData?.metadata?.polygons || 0} polys</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Creates a card element for backend model display
     * @param {Object} model - Backend model data
     * @returns {string} HTML string for model card
     */
    createBackendModelCard(model) {
        const thumbnailUrl = model.previewImage?.url || 
                            model.originalImage?.url || 
                            '/api/placeholder/180/180';
        
        return `
            <div class="model-card" onclick="window.MobileAssetViewer.openAsset('${model._id}')" 
                 style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; cursor: pointer; transition: all 0.3s ease; position: relative;">
                <div style="aspect-ratio: 1; background: url('${thumbnailUrl}') center/cover; position: relative;">
                    <span style="position: absolute; top: 8px; left: 8px; font-size: 1.2rem;">☁️</span>
                    <button onclick="event.stopPropagation(); window.AppNavigation.toggleLike('${model._id}', '${model.name}')" 
                            style="position: absolute; top: 8px; right: 8px; background: rgba(220,53,69,0.9); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </button>
                </div>
                <div style="padding: 0.8rem;">
                    <h4 style="color: white; font-size: 0.9rem; margin-bottom: 0.3rem;">${model.name}</h4>
                    <div style="display: flex; gap: 1rem; color: rgba(255,255,255,0.5); font-size: 0.75rem;">
                        <span>${model.views || 0} views</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Removes a local model from storage
     * @param {string} modelId - ID of model to remove
     */
    async removeLocalModel(modelId) {
        try {
            await window.LocalStorageManager.deleteLocalModel(modelId);
            // Reload the liked models view
            this.loadLikedModels();
            // Update the count
            this.updateLikedModelsCount();
            this.showFeedback('Model removed', 'success');
        } catch (error) {
            console.error('Error removing model:', error);
            this.showFeedback('Failed to remove model', 'error');
        }
    }

    /**
     * Shows the liked models view in account section
     */
    async showLikedModels() {
        console.log('💖 Showing liked models view...');
        
        const mainView = document.getElementById('accountMainView');
        const likedView = document.getElementById('likedModelsView');
        
        if (mainView && likedView) {
            mainView.style.display = 'none';
            likedView.style.display = 'block';
            
            // Setup event listeners
            this.setupLikedModelsEventListeners();
            
            // Load liked models
            await this.loadLikedModels();
        }
    }

    /**
     * Hides the liked models view
     */
    hideLikedModels() {
        console.log('🔙 Hiding liked models view...');
        
        const mainView = document.getElementById('accountMainView');
        const likedView = document.getElementById('likedModelsView');
        
        if (mainView && likedView) {
            likedView.style.display = 'none';
            mainView.style.display = 'block';
        }
    }

    /**
     * Sets up event listeners for liked models view
     */
    setupLikedModelsEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('likedModelsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.likedAssetsData.searchTerm = e.target.value.toLowerCase().trim();
                this.likedAssetsData.currentPage = 1;
                this.filterAndRenderLikedModels();
            }, 300));
        }

        // Sort functionality
        const sortSelect = document.getElementById('likedModelsSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.likedAssetsData.sortBy = e.target.value;
                this.likedAssetsData.currentPage = 1;
                this.filterAndRenderLikedModels();
            });
        }

        // Load more button
        const loadMoreBtn = document.getElementById('likedModelsLoadMore');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.likedAssetsData.currentPage++;
                this.filterAndRenderLikedModels(false);
            });
        }
    }

    /**
     * Filters and renders liked models grid
     * @param {boolean} clearExisting - Whether to clear existing items
     */
    filterAndRenderLikedModels(clearExisting = true) {
        let filtered = [...this.likedAssetsData.assets];
        
        // Apply search filter
        if (this.likedAssetsData.searchTerm) {
            filtered = filtered.filter(asset => 
                asset.name.toLowerCase().includes(this.likedAssetsData.searchTerm) ||
                (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(this.likedAssetsData.searchTerm)))
            );
        }
        
        // Apply sorting
        switch (this.likedAssetsData.sortBy) {
            case 'popular':
                filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'downloads':
                filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                break;
            case 'recent':
            default:
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }
        
        this.likedAssetsData.filteredAssets = filtered;
        this.renderLikedModelsGrid(clearExisting);
    }

    /**
     * Renders the liked models grid
     * @param {boolean} clearExisting - Whether to clear existing items
     */
    renderLikedModelsGrid(clearExisting = true) {
        const grid = document.getElementById('likedModelsGrid');
        if (!grid) return;
        
        const startIndex = clearExisting ? 0 : grid.children.length;
        const endIndex = Math.min(startIndex + this.likedAssetsData.assetsPerPage, this.likedAssetsData.filteredAssets.length);
        const assetsToShow = this.likedAssetsData.filteredAssets.slice(startIndex, endIndex);
        
        if (clearExisting) {
            grid.innerHTML = '';
        }
        
        // Hide loading/error/empty states
        this.hideLikedModelsStates();
        
        if (this.likedAssetsData.filteredAssets.length === 0) {
            this.showLikedModelsEmpty();
            return;
        }
        
        assetsToShow.forEach(asset => {
            const assetCard = this.createLikedModelCard(asset);
            grid.appendChild(assetCard);
        });
        
        // Update load more button
        const loadMoreBtn = document.getElementById('likedModelsLoadMore');
        if (loadMoreBtn) {
            if (endIndex < this.likedAssetsData.filteredAssets.length) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.textContent = `Load More (${this.likedAssetsData.filteredAssets.length - endIndex} remaining)`;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
        
        console.log(`📊 Rendered ${assetsToShow.length} liked models`);
    }

    /**
     * Creates a liked model card element
     * @param {Object} asset - Asset data
     * @returns {HTMLElement} Card element
     */
    createLikedModelCard(asset) {
        const assetCard = document.createElement('div');
        assetCard.className = 'mobile-asset-card liked-model-card';
        assetCard.style.cssText = `
            background: rgba(20, 20, 20, 0.6);
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            cursor: pointer;
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
        `;
        
        // Determine image URL
        let imageUrl = null;
        if (asset.originalImage?.url) imageUrl = asset.originalImage.url;
        else if (asset.inputImage?.url) imageUrl = asset.inputImage.url;
        else if (asset.previewImage?.url) imageUrl = asset.previewImage.url;
        
        assetCard.innerHTML = this.createAssetCardHTML(asset, imageUrl, true);
        
        // Add click handler
        assetCard.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-like-button')) {
                if (window.MobileAssetViewer) {
                    window.MobileAssetViewer.openAsset(asset._id);
                } else {
                    this.viewAsset(asset._id);
                }
            }
        });
        
        // Add like button handler
        const likeButton = assetCard.querySelector('.mobile-like-button');
        if (likeButton) {
            likeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLike(asset._id, asset.name);
            });
        }
        
        return assetCard;
    }

    /**
     * Creates HTML for asset card content
     * @param {Object} asset - Asset data
     * @param {string} imageUrl - Image URL for preview
     * @param {boolean} isLiked - Whether asset is liked
     * @returns {string} HTML string
     */
    createAssetCardHTML(asset, imageUrl, isLiked) {
        if (imageUrl) {
            return `
                <div class="asset-preview" style="width: 100%; height: 200px; position: relative; background: rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <div class="image-loading-placeholder" style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%); background-size: 200% 100%; animation: shimmer 2s infinite;"></div>
                    <img src="${imageUrl}" alt="${this.escapeHtml(asset.name)}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; background: #0a0a0a; opacity: 0; transition: opacity 0.3s ease;" 
                         onload="this.style.opacity='1'; this.parentElement.querySelector('.image-loading-placeholder').style.display='none';"
                         onerror="this.parentElement.innerHTML = '<div style=\\'font-size: 3rem; opacity: 0.6;\\'>${asset.icon || '🕐'}</div>';">
                    <button class="mobile-like-button ${isLiked ? 'liked' : ''}" data-asset-id="${asset._id}" style="position: absolute; top: 8px; right: 8px; background: ${isLiked ? 'rgba(0, 188, 212, 0.2)' : 'rgba(0, 0, 0, 0.7)'}; border: 2px solid ${isLiked ? '#00bcd4' : 'rgba(0, 188, 212, 0.4)'}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px); color: ${isLiked ? '#00bcd4' : 'rgba(0, 188, 212, 0.8)'}; z-index: 10;">
                        <svg width="14" height="14" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                <div class="asset-info" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; background: rgba(10, 10, 10, 0.5);">
                    <h3 style="font-family: 'Sora', sans-serif; font-size: 1rem; font-weight: 600; color: white; margin: 0; text-align: center; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical;">${this.escapeHtml(asset.name)}</h3>
                    <div style="margin-top: 0.5rem; text-align: center; color: #00bcd4; font-family: 'Inter', sans-serif; font-size: 0.75rem;">
                        <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
                    </div>
                </div>
            `;
        } else {
            return `
                <div style="font-size: 3rem; opacity: 0.6; text-align: center; padding: 2rem;">${asset.icon || '🕐'}</div>
                <h3 style="font-family: 'Sora', sans-serif; font-size: 1rem; font-weight: 600; color: white; margin: 0; padding: 0 1rem; text-align: center;">${this.escapeHtml(asset.name)}</h3>
                <div style="padding: 1rem; text-align: center; color: #00bcd4; font-family: 'Inter', sans-serif; font-size: 0.75rem;">
                    <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
                </div>
                <button class="mobile-like-button ${isLiked ? 'liked' : ''}" data-asset-id="${asset._id}" style="position: absolute; top: 8px; right: 8px; background: ${isLiked ? 'rgba(0, 188, 212, 0.2)' : 'rgba(0, 0, 0, 0.7)'}; border: 2px solid ${isLiked ? '#00bcd4' : 'rgba(0, 188, 212, 0.4)'}; border-radius: 50%; width: 32px; height: 32px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px); color: ${isLiked ? '#00bcd4' : 'rgba(0, 188, 212, 0.8)'}; z-index: 10; touch-action: manipulation;">
                    <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            `;
        }
    }

    /**
     * Toggles like status for an asset
     * @param {string} assetId - Asset ID
     * @param {string} assetName - Asset name
     */
    async toggleLike(assetId, assetName) {
        const isAuthenticated = await this.checkAuthentication();
        if (!isAuthenticated) {
            console.log('❌ User not authenticated, showing login modal');
            sessionStorage.setItem('pendingLikeAction', JSON.stringify({ assetId, assetName }));
            
            if (window.MobileAuth) {
                window.MobileAuth.showAuth('like', { assetId, assetName });
            } else if (window.authManager) {
                window.authManager.showLoginModal();
            }
            return;
        }
        
        try {
            const response = await window.makeAuthenticatedRequest(
                `${this.getApiBaseUrl()}/auth/like-asset`,
                {
                    method: 'POST',
                    body: JSON.stringify({ assetId: assetId })
                }
            );
            
            if (!response.ok) throw new Error('Failed to update like status');
            
            const data = await response.json();
            const isLiked = data.isLiked;
            
            // Update local state
            if (isLiked) {
                this.assetsData.likedAssets.add(assetId);
            } else {
                this.assetsData.likedAssets.delete(assetId);
            }
            
            // Save to localStorage for persistence
            localStorage.setItem('userLikedAssets', JSON.stringify([...this.assetsData.likedAssets]));
            
            // Update UI
            this.updateLikeButtonStates(assetId, isLiked);
            
            const message = isLiked 
                ? `Added "${assetName}" to your liked models ❤️` 
                : `Removed "${assetName}" from your liked models`;
            this.showFeedback(message, 'success');
            this.updateLikedCount();
            
            // Update account stats
            await this.updateLikedModelsCount();
           
        } catch (error) {
            console.error('❌ Like error:', error);
            this.showFeedback('Failed to update like status. Please try again.', 'error');
        }
    }
        updateLikeButtons() {
    // Update like button states in the gallery
    document.querySelectorAll('.mobile-like-button').forEach(btn => {
        const assetId = btn.dataset.assetId;
        if (assetId && this.userLikedAssets.has(assetId)) {
            btn.classList.add('liked');
        } else {
            btn.classList.remove('liked');
        }
    });
    
    console.log('Updated like buttons based on user auth state');
}

    /**
     * Updates like button states in the UI
     * @param {string} assetId - Asset ID
     * @param {boolean} isLiked - New like status
     */
    updateLikeButtonStates(assetId, isLiked) {
        const likeButtons = document.querySelectorAll(
            `[data-asset-id="${assetId}"], .asset-card[data-asset-id="${assetId}"] .like-btn`
        );
        
        likeButtons.forEach(button => {
            if (isLiked) {
                button.classList.add('liked');
                button.style.background = 'rgba(0, 188, 212, 0.2)';
                button.style.borderColor = '#00bcd4';
                button.style.color = '#00bcd4';
            } else {
                button.classList.remove('liked');
                button.style.background = 'rgba(0, 0, 0, 0.7)';
                button.style.borderColor = 'rgba(0, 188, 212, 0.4)';
                button.style.color = 'rgba(0, 188, 212, 0.8)';
            }
            
            // Update SVG fill
            const svg = button.querySelector('path');
            if (svg) {
                svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
            }
        });
    }


    /**
     * Shows feedback message to user
     * @param {string} message - Message to display
     * @param {string} type - Message type (success/error/info)
     */
    showFeedback(message, type = 'success') {
        const existingFeedback = document.querySelector('.mobile-feedback-message');
        if (existingFeedback) existingFeedback.remove();
        
        const feedback = document.createElement('div');
        feedback.className = 'mobile-feedback-message';
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed; top: 20px; right: 20px; left: 20px;
            background: ${type === 'success' ? 'rgba(0, 188, 212, 0.9)' : type === 'error' ? 'rgba(220, 38, 127, 0.9)' : 'rgba(0, 150, 255, 0.9)'};
            color: white; padding: 1rem 1.5rem; border-radius: 8px;
            font-family: 'Sora', sans-serif; font-weight: 500; z-index: 10000;
            opacity: 0; transform: translateY(-20px); transition: all 0.3s ease;
            text-align: center; font-size: 0.9rem; max-width: 400px; margin: 0 auto;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateY(0)';
        }, 10);
        
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateY(-20px)';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    /**
     * Shows loading state for liked models
     */
    showLikedModelsLoading() {
        this.hideLikedModelsStates();
        const grid = document.getElementById('likedModelsGrid');
        if (grid) {
            grid.innerHTML = '';
        }
    }

    /**
     * Shows empty state for liked models
     */
    showLikedModelsEmpty() {
        this.hideLikedModelsStates();
        const empty = document.getElementById('likedModelsEmpty');
        if (empty) empty.style.display = 'block';
    }

    /**
     * Shows error state for liked models
     */
    showLikedModelsError() {
        this.hideLikedModelsStates();
        const error = document.getElementById('likedModelsError');
        if (error) error.style.display = 'block';
    }

    /**
     * Hides all liked models states
     */
    hideLikedModelsStates() {
        const states = ['likedModelsLoading', 'likedModelsEmpty', 'likedModelsError'];
        states.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    }

    /**
     * Views an asset in the mobile viewer
     * @param {string} assetId - Asset ID to view
     */
    viewAsset(assetId) {
        console.log('🎯 Opening asset viewer for:', assetId);
        
        if (window.MobileAssetViewer) {
            window.MobileAssetViewer.openAsset(assetId);
        } else {
            console.error('❌ Mobile Asset Viewer not initialized');
            // Fallback to web version
            const viewUrl = `view-asset.html?id=${assetId}&from=mobile-app`;
            window.location.href = viewUrl;
        }
    }

    /**
     * Gets the API base URL based on environment
     * @returns {string} API base URL
     */
    getApiBaseUrl() {
        // Capacitor/Android native platform
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            return 'https://threely-ai.onrender.com/api';
        }
        
        // Check for configured URLs
        if (window.DALMA_CONFIG && window.DALMA_CONFIG.API_BASE_URL) {
            return window.DALMA_CONFIG.API_BASE_URL;
        } else if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
            return window.APP_CONFIG.API_BASE_URL;
        }
        
        // Default based on current location
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isDev) {
            return `http://${hostname}:3000/api`;
        } else {
            return protocol === 'https:' 
                ? `https://${hostname}/api`
                : `http://${hostname}:3000/api`;
        }
    }

    /**
     * Checks if user is authenticated
     * @returns {Promise<boolean>} Authentication status
     */
    async checkAuthentication() {
        try {
            const response = await window.makeAuthenticatedRequest(
                `${this.getApiBaseUrl()}/auth/me`, 
                { method: 'GET' }
            );
            return response.ok;
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    }

    /**
     * Loads user's liked assets
     */
    async loadUserLikedAssets() {
        // Load from localStorage for immediate UI update
        const stored = localStorage.getItem('userLikedAssets');
        if (stored) {
            try {
                this.userLikedAssets = new Set(JSON.parse(stored));
                this.updateAllLikeButtons();
            } catch (e) {
                this.userLikedAssets = new Set();
            }
        }
        
        // Sync with server if authenticated
        if (!window.authManager?.isAuthenticated()) {
            return;
        }
        
        try {
            const response = await fetch(`${this.getApiBaseUrl()}/auth/liked-assets`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const likedIds = data.assets.map(a => a._id || a);
                this.userLikedAssets = new Set(likedIds);
                
                // Save to localStorage
                localStorage.setItem('userLikedAssets', JSON.stringify([...this.userLikedAssets]));
                
                // Update UI
                this.updateAllLikeButtons();
                
                console.log('❤️ Loaded user liked assets:', this.userLikedAssets.size);
            }
        } catch (error) {
            console.log('ℹ️ Could not load liked assets:', error.message);
        }
    }

    /**
     * Updates all like button states
     */
    updateAllLikeButtons() {
        document.querySelectorAll('.mobile-like-button').forEach(button => {
            const assetId = button.dataset.assetId;
            const isLiked = this.userLikedAssets.has(assetId);
            this.updateLikeButtonStates(assetId, isLiked);
        });
    }

    /**
     * Loads all public assets from API
     */
    async loadAllAssets() {
        try {
            console.log('🔄 Loading public assets from API...');
            
            // Show loading state
            this.showAssetsLoading();
            
            const apiUrl = this.getApiBaseUrl();
            const fullUrl = `${apiUrl}/assets?limit=20&sortBy=popularity&sortOrder=desc`;
            console.log('📡 Fetching from:', fullUrl);
            
            // Add timeout for mobile
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(fullUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Assets loaded:', data.assets?.length || 0);
            
            this.assetsData.allAssets = data.assets || [];
            this.assetsData.filteredAssets = [...this.assetsData.allAssets];
            
            if (this.assetsData.allAssets.length === 0) {
                this.showNoAssetsMessage();
            } else {
                this.filterAndRenderAssets();
            }
            
        } catch (error) {
            console.error('❌ Error loading assets:', error);
            
            // Show specific error message
            let errorMsg = 'Failed to load assets';
            if (error.name === 'AbortError') {
                errorMsg = 'Request timed out. Check your connection.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMsg = 'Cannot connect to server. Check your internet.';
            }
            
            this.showAssetsError(errorMsg);
        }
    }

    /**
     * Shows loading state for assets
     */
    showAssetsLoading() {
        const grid = document.getElementById('mobileAssetsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
                    <div style="width: 50px; height: 50px; border: 3px solid rgba(0, 188, 212, 0.2); border-top: 3px solid #00bcd4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <p style="color: #00bcd4; font-family: 'Sora', sans-serif;">Loading assets...</p>
                </div>
            `;
        }
    }

    /**
     * Shows no assets message
     */
    showNoAssetsMessage() {
        const grid = document.getElementById('mobileAssetsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: rgba(255, 255, 255, 0.6);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                    <h3 style="color: white; margin-bottom: 0.5rem; font-family: 'Sora', sans-serif;">No Assets Available</h3>
                    <p>Check back later for new 3D models!</p>
                </div>
            `;
        }
    }

    /**
     * Shows error message for assets
     * @param {string} message - Error message to display
     */
    showAssetsError(message = 'Failed to load assets') {
        const grid = document.getElementById('mobileAssetsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: rgba(255, 255, 255, 0.6);">
                    <div style="font-size: 3rem; margin-bottom: 1rem; color: #dc3545;">⚠️</div>
                    <h3 style="color: white; margin-bottom: 0.5rem; font-family: 'Sora', sans-serif;">Error Loading Assets</h3>
                    <p style="margin-bottom: 1.5rem;">${message}</p>
                    <button onclick="window.AppNavigation.loadAllAssets()" style="background: #00bcd4; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-family: 'Sora', sans-serif; font-weight: 600;">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Filters and renders assets grid
     * @param {boolean} clearExisting - Whether to clear existing items
     */
    filterAndRenderAssets(clearExisting = true) {
        let filtered = [...this.assetsData.allAssets];
        
        // Apply search filter
        if (this.assetsData.searchTerm) {
            filtered = filtered.filter(asset => 
                asset.name.toLowerCase().includes(this.assetsData.searchTerm) ||
                (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(this.assetsData.searchTerm)))
            );
        }
        
        // Apply sorting
        switch (this.assetsData.sortBy) {
            case 'popular':
                filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'downloads':
                filtered.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                break;
            case 'recent':
            default:
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }
        
        this.assetsData.filteredAssets = filtered;
        this.renderAssetsGrid(clearExisting);
    }

    /**
     * Renders the assets grid
     * @param {boolean} clearExisting - Whether to clear existing items
     */
    renderAssetsGrid(clearExisting = true) {
        const grid = document.getElementById('mobileAssetsGrid');
        if (!grid) return;
        
        const startIndex = clearExisting ? 0 : grid.children.length;
        const endIndex = Math.min(startIndex + this.assetsData.assetsPerPage, this.assetsData.filteredAssets.length);
        const assetsToShow = this.assetsData.filteredAssets.slice(startIndex, endIndex);
        
        if (clearExisting) {
            grid.innerHTML = '';
        }
        
        if (this.assetsData.filteredAssets.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: rgba(255, 255, 255, 0.6);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <h3 style="color: white; margin-bottom: 0.5rem; font-family: 'Sora', sans-serif;">No models found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
        } else {
            assetsToShow.forEach(asset => {
                const assetCard = this.createMobileAssetCard(asset);
                grid.appendChild(assetCard);
            });
        }
        
        // Update load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            if (endIndex < this.assetsData.filteredAssets.length) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.textContent = `Load More (${this.assetsData.filteredAssets.length - endIndex} remaining)`;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
        
        console.log(`📊 Rendered ${assetsToShow.length} assets (${startIndex}-${endIndex}/${this.assetsData.filteredAssets.length})`);
    }

    /**
     * Creates a mobile asset card element
     * @param {Object} asset - Asset data
     * @returns {HTMLElement} Card element
     */
    createMobileAssetCard(asset) {
        const assetCard = document.createElement('div');
        assetCard.className = 'mobile-asset-card';
        assetCard.style.cssText = `
            background: rgba(20, 20, 20, 0.6);
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            cursor: pointer;
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
        `;
        
        // Determine image URL
        let imageUrl = null;
        if (asset.originalImage?.url) imageUrl = asset.originalImage.url;
        else if (asset.inputImage?.url) imageUrl = asset.inputImage.url;
        else if (asset.previewImage?.url) imageUrl = asset.previewImage.url;
        
        const isLiked = this.assetsData.likedAssets.has(asset._id);
        
        assetCard.innerHTML = this.createAssetCardHTML(asset, imageUrl, isLiked);
        
        // Add click handler
        assetCard.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-like-button')) {
                if (window.MobileAssetViewer) {
                    console.log('🎯 Opening asset via MobileAssetViewer:', asset._id);
                    window.MobileAssetViewer.openAsset(asset._id);
                } else {
                    console.error('❌ MobileAssetViewer not found!');
                    this.viewAsset(asset._id);
                }
            }
        });
        
        // Add like button handler
        const likeButton = assetCard.querySelector('.mobile-like-button');
        if (likeButton) {
            likeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLike(asset._id, asset.name);
            });
        }
        
        return assetCard;
    }

    /**
     * Updates account statistics display
     * @param {Object} userData - User data object
     */
    updateAccountStats(userData = null) {
        console.log('📊 Updating account stats with userData:', userData);
        
        const accountSection = document.getElementById('accountSection');
        if (!accountSection) return;

        // Get user data from various sources
        let user = userData;
        
        // Try auth manager if no userData provided
        if (!user && window.authManager) {
            user = window.authManager.getUser();
        }
        
        // Try monetization system as fallback
        if (!user && window.enhancedMonetization) {
            user = {
                tokens: window.enhancedMonetization.userTokens,
                isAdmin: window.enhancedMonetization.isAdmin,
                email: window.authManager?.currentUser?.email || 'User'
            };
        }
        
        if (user) {
            // Update username
            const usernameEl = document.getElementById('accountUsername');
            if (usernameEl) {
                usernameEl.textContent = user.username || user.email || 'User';
            }

            // Update email
            const emailEl = document.getElementById('accountEmail');
            if (emailEl) {
                emailEl.textContent = user.email || '';
            }

            // Update tokens display
            const creditsEl = document.getElementById('accountCreditsCount');
            if (creditsEl) {
                let tokenCount = user.tokens;
                
                // Try multiple sources for token count
                if (tokenCount === undefined || tokenCount === null) {
                    if (window.enhancedMonetization) {
                        tokenCount = window.enhancedMonetization.userTokens;
                    } else if (window.EnhancedMonetization?.instance) {
                        tokenCount = window.EnhancedMonetization.instance.userTokens;
                    }
                }
                
                // Default to 1 if still undefined
                if (tokenCount === undefined || tokenCount === null) {
                    tokenCount = 1;
                }
                
                creditsEl.textContent = user.isAdmin ? '∞' : tokenCount;
                console.log('✅ Account section credits updated to:', tokenCount);
            }

            // Update member status
            const memberEl = document.getElementById('accountMemberStatus');
            if (memberEl) {
                if (user.isAdmin) {
                    memberEl.textContent = 'Admin';
                    memberEl.style.color = '#00bcd4';
                } else {
                    memberEl.textContent = user.role === 'premium' ? 'Premium' : 'Free';
                }
            }
        }
    }

    /**
     * Sets up listener for token updates
     */
    setupTokenUpdateListener() {
        window.addEventListener('tokensUpdated', (event) => {
            console.log('📡 Received tokensUpdated event:', event.detail);
            
            // Update account stats with new token count
            if (window.AppNavigation && window.AppNavigation.updateAccountStats) {
                const userData = {
                    tokens: event.detail.tokens,
                    email: window.authManager?.currentUser?.email || 'User',
                    isAdmin: window.authManager?.currentUser?.isAdmin || false
                };
                window.AppNavigation.updateAccountStats(userData);
            }
            
            // Direct update of account credits display
            const accountCredits = document.getElementById('accountCreditsCount');
            if (accountCredits) {
                const isAdmin = window.enhancedMonetization?.isAdmin || false;
                accountCredits.textContent = isAdmin ? '∞' : event.detail.tokens;
                console.log('✅ Direct update of account credits to:', event.detail.tokens);
            }
        });
    }

    /**
     * Handles logout action
     */
    handleLogout() {
        this.showLogoutConfirmation();
    }

    /**
     * Shows logout confirmation modal
     */
    showLogoutConfirmation() {
        // Remove any existing logout modal
        const existingModal = document.querySelector('.logout-confirmation-modal');
        if (existingModal) existingModal.remove();
        
        const logoutModal = document.createElement('div');
        logoutModal.className = 'logout-confirmation-modal';
        logoutModal.innerHTML = `
            <div class="logout-modal-overlay"></div>
            <div class="logout-modal-content">
                <div class="logout-icon">👋</div>
                <h3>Sign Out</h3>
                <p>Are you sure you want to sign out of your account?</p>
                <div class="logout-actions">
                    <button class="logout-cancel-btn" onclick="this.closest('.logout-confirmation-modal').remove()">
                        Cancel
                    </button>
                    <button class="logout-confirm-btn" onclick="window.AppNavigation.confirmLogout(); this.closest('.logout-confirmation-modal').remove()">
                        Sign Out
                    </button>
                </div>
            </div>
            
            <style>
                .logout-confirmation-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    animation: fadeIn 0.3s ease;
                }
                
                .logout-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(10px);
                }
                
                .logout-modal-content {
                    position: relative;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
                    border-radius: 20px;
                    padding: 2rem;
                    max-width: 350px;
                    width: 100%;
                    text-align: center;
                    border: 1px solid rgba(0, 188, 212, 0.3);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }
                
                .logout-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    animation: wave 1s ease infinite;
                }
                
                .logout-modal-content h3 {
                    font-family: 'Sora', sans-serif;
                    color: white;
                    margin-bottom: 0.5rem;
                    font-size: 1.5rem;
                }
                
                .logout-modal-content p {
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 2rem;
                    line-height: 1.5;
                }
                
                .logout-actions {
                    display: flex;
                    gap: 1rem;
                    flex-direction: column;
                }
                
                .logout-cancel-btn, .logout-confirm-btn {
                    padding: 1rem 2rem;
                    border-radius: 12px;
                    font-family: 'Sora', sans-serif;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-height: 48px;
                    font-size: 1rem;
                }
                
                .logout-cancel-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: rgba(255, 255, 255, 0.8);
                }
                
                .logout-cancel-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
                
                .logout-confirm-btn {
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    border: none;
                    color: white;
                }
                
                .logout-confirm-btn:hover {
                    background: linear-gradient(135deg, #c82333, #a71e2a);
                    transform: translateY(-1px);
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                
                @keyframes wave {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-10deg); }
                    75% { transform: rotate(10deg); }
                }
                
                @media (max-width: 480px) {
                    .logout-confirmation-modal {
                        padding: 1rem;
                    }
                    
                    .logout-modal-content {
                        padding: 1.5rem;
                    }
                }
            </style>
        `;
        
        document.body.appendChild(logoutModal);
        
        // Close on overlay click
        logoutModal.querySelector('.logout-modal-overlay').addEventListener('click', () => {
            logoutModal.remove();
        });
    }

    /**
     * Confirms and processes logout
     */
    confirmLogout() {
        // Call cleanup before logout
        this.handleLogoutCleanup();
        
        if (window.authManager && window.authManager.logout) {
            window.authManager.logout();
        } else {
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
        }
        
        // Update UI
        this.updateAccountNavLabel(null);
        this.updateTopBarAccountButton();
    }

    /**
     * Reloads a section's content
     * @param {string} sectionName - Section to reload
     */
    async reloadSection(sectionName) {
        this.loadedSections.delete(sectionName);
        await this.loadSectionContent(sectionName);
    }

    /**
     * Stops all animations in the app
     */
    stopAllAnimations() {
        // Pause particles if leaving about section
        const aboutSection = document.getElementById('aboutSection');
        if (aboutSection && !aboutSection.classList.contains('active')) {
            const particles = document.querySelectorAll('.particle');
            particles.forEach(p => p.style.animationPlayState = 'paused');
        }
        
        // Stop any running intervals/timeouts
        if (window.animationIntervals) {
            window.animationIntervals.forEach(id => clearInterval(id));
            window.animationIntervals = [];
        }
        
        // Add animation reduction class
        const currentSection = this.currentSection;
        if (!['home', 'about'].includes(currentSection)) {
            document.body.classList.add('reduce-animations');
        }
    }

    /**
     * Starts animations for active section
     * @param {string} sectionName - Section name
     */
    startSectionAnimations(sectionName) {
        // Start animations for active section
        if (sectionName === 'about') {
            const particles = document.querySelectorAll('#particleField .particle');
            particles.forEach(p => p.style.animationPlayState = 'running');
            
            // Trigger stats animation
            this.animateStatsIfVisible();
        }
        
        // Remove animation reduction for active sections
        if (['home', 'about'].includes(sectionName)) {
            document.body.classList.remove('reduce-animations');
        }
        
        // Control 3D rendering for home section
        if (sectionName === 'home' && window.Mobile3D) {
            window.Mobile3D.resume && window.Mobile3D.resume();
        }
    }

    /**
     * Animates stats if visible in about section
     */
    animateStatsIfVisible() {
        const aboutSection = document.getElementById('aboutSection');
        if (!aboutSection || !aboutSection.classList.contains('active')) return;
        
        const statNumbers = aboutSection.querySelectorAll('.stat-number');
        statNumbers.forEach(stat => {
            const target = parseInt(stat.dataset.target) || 0;
            const duration = 2000;
            const start = 0;
            const startTime = Date.now();
            
            const updateNumber = () => {
                const now = Date.now();
                const progress = Math.min((now - startTime) / duration, 1);
                const current = Math.floor(start + (target - start) * progress);
                stat.textContent = current.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(updateNumber);
                } else {
                    stat.textContent = target.toLocaleString();
                }
            };
            
            updateNumber();
        });
    }

    /**
     * Escapes HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Creates a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Loads content for a specific section
     * @param {string} sectionName - Section to load
     */
    async loadSectionContent(sectionName) {
        const sectionElement = document.getElementById(`${sectionName}Section`);
        
        if (!sectionElement) {
            console.error(`❌ Section element not found: ${sectionName}Section`);
            return;
        }

        console.log(`📦 Loading content for section: ${sectionName}`);

        // Show loading state
        sectionElement.innerHTML = `
            <div class="section-loading">
                <div class="section-loading-spinner"></div>
                <div class="section-loading-text">Loading ${sectionName}...</div>
            </div>
        `;

        try {
            let content = '';
            
            switch (sectionName) {
                case 'home':
                    content = await this.loadHomeContent();
                    break;
                case 'generate':
                    content = await this.loadGenerateContent();
                    break;
                case 'assets':
                    content = await this.loadAssetsContent();
                    break;
                case 'account':
                    content = await this.loadAccountContent();
                    break;
                case 'about':
                    content = await this.loadAboutContent();
                    break;
                default:
                    content = '<div class="section-content">Section not found</div>';
            }

            console.log(`✅ Content loaded for ${sectionName}, length: ${content.length}`);
            
            if (!content || content.length === 0) {
                console.error(`❌ Empty content for section: ${sectionName}`);
                content = `<div style="padding: 2rem; text-align: center; color: white;">Error: Empty content for ${sectionName}</div>`;
            }

            sectionElement.innerHTML = `<div class="section-content">${content}</div>`;
            
            console.log(`📊 Section element after insert:`, sectionElement.innerHTML.substring(0, 100));
            
            // Initialize section-specific functionality
            this.initializeSectionFunctionality(sectionName);
            
            this.loadedSections.add(sectionName);
            console.log(`✅ Section loaded: ${sectionName}`);
            
        } catch (error) {
            console.error(`❌ Error loading section ${sectionName}:`, error);
            console.error('Full stack:', error.stack);
            sectionElement.innerHTML = `
                <div class="section-content" style="padding: 2rem; text-align: center;">
                    <h3 style="color: #dc3545; margin-bottom: 1rem;">Error Loading Section</h3>
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 1rem;">Failed to load ${sectionName} content.</p>
                    <p style="color: #ff6b6b; font-size: 0.85rem;">${error.message}</p>
                    <button onclick="window.AppNavigation.reloadSection('${sectionName}')" 
                            style="background: #00bcd4; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Loads home section content
     * @returns {Promise<string>} HTML content
     */
    loadHomeContent() {
        return `
            <!-- Hero Section -->
            <section class="hero">
                <div class="geometric-pattern"></div>
                <div class="hero-3d" id="appHero3d">
                    <!-- 3D Dog Model will be rendered here -->
                </div>
                <div class="hero-content" style="padding: 0.5rem; padding-top: 0.25rem; position: relative; z-index: 10;">
                    <div class="hero-text">
                        <h2 class="hero-title" style="margin-bottom: 0.6rem; margin-top: -1rem; line-height: 1.05;">From picture to<br>3D with ease!</h2>
                        <p class="hero-subtitle" style="margin-bottom: 1rem; line-height: 1.1; font-size: 0.8rem;">Within a few clicks of a button you can generate, rig and animate your own, ready to use 3D model!</p>
                        <button class="cta-button" id="heroGenerateBtn" style="position: relative; z-index: 20; pointer-events: auto; width: 80%; max-width: 300px; padding: 0.6rem 2rem;">GENERATE</button>
                    </div>
                </div>
            </section>
            
            <style>
                .hero {
                    position: relative;
                }
                
                .hero-3d {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1;
                }
                
                .hero-content {
                    position: relative;
                    z-index: 10;
                    pointer-events: none;
                }
                
                .hero-content * {
                    pointer-events: auto;
                }
                
                .cta-button {
                    cursor: pointer !important;
                    touch-action: manipulation;
                }
                
                #appHero3d canvas {
                    pointer-events: auto !important;
                }
            </style>
        `;
    }

    /**
     * Loads generate section content
     * @returns {Promise<string>} HTML content
     */
    loadGenerateContent() {
        return `
            <div class="generate-container" id="generateContainer">
                <!-- Form State -->
                <div class="generate-form-state" id="generateFormState">
                    <div class="generate-controls-wrapper">
                        <!-- Image Upload -->
                        <div class="control-section image-upload">
                            <label class="control-label">Upload Image</label>
                            <div class="upload-area" id="uploadArea">
                               <input type="file" id="imageInput" accept="image/jpeg,image/jpg,image/png" hidden/>
                                <div class="upload-placeholder" id="uploadPlaceholder">
                                    <svg class="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                                    </svg>
                                    <p class="upload-text">Tap to upload image</p>
                                    <p class="upload-formats">Supported: JPG, JPEG, PNG</p>
                                </div>
                                <div class="upload-preview" id="uploadPreview" style="display: none;">
                                    <img id="previewImage" alt="Preview"/>
                                    <button class="change-image-btn" id="changeImageBtn" type="button">Change Image</button>
                                </div>
                            </div>
                        </div>

                        <!-- Collapsible Settings -->
                        <div class="settings-section">
                            <button class="settings-toggle" id="settingsToggle" type="button">
                                <div class="settings-toggle-content">
                                    <div class="settings-toggle-left">
                                        <svg class="settings-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="3"></circle>
                                            <path d="M12 1v6m0 6v6m4.22-10.22l4.24 4.24m-4.24 4.24l4.24 4.24M20 12h6m-6 0h-6"></path>
                                        </svg>
                                        <span class="settings-label">Settings</span>
                                    </div>
                                    <svg class="settings-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                <div class="settings-summary" id="settingsSummary">Default settings</div>
                            </button>
                            
                            <div class="settings-content" id="settingsContent" style="display: none;">
                                <!-- Settings controls -->
                                ${this.generateSettingsControls()}
                            </div>
                        </div>

                        <!-- Generate Button -->
                        <button class="generate-model-btn" id="generateModelBtn">
                            <span class="btn-text">Generate Model</span>
                        </button>
                    </div>
                </div>

                <!-- Loading State -->
                ${this.generateLoadingState()}

                <!-- Viewer State -->
                ${this.generateViewerState()}
            </div>
        `;
    }

    /**
     * Generates settings controls HTML
     * @returns {string} Settings controls HTML
     */
    generateSettingsControls() {
        return `
            <!-- Symmetry Control -->
            <div class="settings-item">
                <label class="settings-item-label">Symmetry</label>
                <div class="toggle-group">
                    <button class="toggle-btn active" data-value="auto">Auto</button>
                    <button class="toggle-btn" data-value="on">On</button>
                </div>
            </div>

            <!-- Topology Control -->
            <div class="settings-item">
                <label class="settings-item-label">Topology</label>
                <div class="toggle-group">
                    <button class="toggle-btn active" data-value="triangle">Triangles</button>
                    <button class="toggle-btn" data-value="quad">Quads</button>
                </div>
            </div>

            <!-- Polycount Control -->
            <div class="settings-item">
                <label class="settings-item-label">Polycount: <span id="polycountValue">30,000</span></label>
                <input type="range" id="polycountSlider" min="100" max="100000" value="30000" step="50" class="polycount-slider"/>
                <div class="polycount-labels">
                    <span>100</span>
                    <span>100K</span>
                </div>
            </div>

            <!-- Texture Control -->
            <div class="settings-item">
                <label class="settings-item-label">Texture</label>
                <div class="toggle-group">
                    <button class="toggle-btn active" data-value="true">Yes</button>
                    <button class="toggle-btn" data-value="false">No</button>
                </div>
            </div>

            <!-- PBR Control -->
            <div class="settings-item" id="pbrSection">
                <label class="checkbox-label">
                    <input type="checkbox" id="pbrCheckbox" class="premium-checkbox"/>
                    <span class="checkbox-custom"></span>
                    <span>PBR Materials</span>
                </label>
            </div>
        `;
    }

    /**
     * Generates loading state HTML
     * @returns {string} Loading state HTML
     */
    generateLoadingState() {
        return `
            <div class="generate-loading-state" id="generateLoadingState" style="display: none;">
                <div class="loading-background">
                    <!-- Animated background particles -->
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                </div>
                
                <div class="loading-content">
                    <h2 class="loading-title">Creating Your 3D Model</h2>
                    
                    <!-- Progress Circle -->
                    <div class="progress-circle-container" style="position: relative;">
                        <div class="progress-glow"></div>
                        <svg class="progress-circle" width="180" height="180" viewBox="0 0 180 180">
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#00bcd4;stop-opacity:1" />
                                    <stop offset="100%" style="stop-color:#00e5ff;stop-opacity:1" />
                                </linearGradient>
                            </defs>
                            <circle cx="90" cy="90" r="85" class="progress-bg"/>
                            <circle cx="90" cy="90" r="85" class="progress-fill" id="progressFill" stroke="url(#progressGradient)"/>
                        </svg>
                        <div class="progress-text">
                            <span class="progress-percent" id="progressPercent">0%</span>
                            <span class="progress-status" id="progressStatus">Initializing...</span>
                        </div>
                        
                        <!-- Boost Indicators -->
                        <div class="boost-indicators" id="boostIndicators" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none;"></div>
                    </div>

                    <!-- 3D Facts -->
                    <div class="dog-fact-container">
                        <p class="dog-fact-text" id="dogFactText">3D modeling transforms flat images into immersive experiences</p>
                    </div>

                    <!-- Watch Ad Button -->
                    <div class="ad-boost-section">
                        <button class="watch-ad-btn" id="watchAdBtn">
                            <span class="ad-icon">⚡</span>
                            <span class="ad-text">Speed Boost</span>
                            <span class="ad-boost">2x Faster</span>
                        </button>
                        <p class="ad-info">Watch ads for unlimited speed boosts!</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generates viewer state HTML
     * @returns {string} Viewer state HTML
     */
    generateViewerState() {
        return `
            <div class="generate-viewer-state" id="generateViewerState" style="display: none;">
                <!-- Maximized 3D Viewer -->
                <div class="model-viewer-maximized" id="modelViewer">
                    <div id="viewer3d" class="viewer3d-fullscreen"></div>
                </div>

                <!-- Compact Controls Bar -->
                <div class="viewer-controls-bar">
                    <button class="new-model-btn-compact" id="newModelBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        <span>New Model</span>
                    </button>
                    
                    <!-- Options Dropdown -->
                    <div class="options-dropdown-container">
                        <button class="options-dropdown-btn" id="optionsDropdownBtn" onclick="window.generateController && window.generateController.toggleOptionsDropdown && window.generateController.toggleOptionsDropdown()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="1"/>
                                <circle cx="12" cy="5" r="1"/>
                                <circle cx="19" cy="12" r="1"/>
                                <circle cx="5" cy="12" r="1"/>
                                <circle cx="12" cy="19" r="1"/>
                            </svg>
                            <span>Options</span>
                            <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        
                        <!-- Dropdown Menu -->
                        <div class="options-dropdown-menu" id="optionsDropdownMenu">
                            ${this.generateDropdownOptions()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generates dropdown options HTML
     * @returns {string} Dropdown options HTML
     */
    generateDropdownOptions() {
        return `
            <button class="option-item" id="downloadBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                <span>Download Model</span>
            </button>
            
            <button class="option-item" id="exportBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span>Export Options</span>
            </button>
            
            <button class="option-item" id="rigBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m4.22-10.22l4.24 4.24m-4.24 4.24l4.24 4.24M20 12h6m-6 0h-6"/>
                </svg>
                <span>Rig & Animate</span>
            </button>
            
            <button class="option-item" id="favoriteBtn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <span>Save to Favorites</span>
            </button>
        `;
    }

    /**
     * Loads assets section content
     * @returns {Promise<string>} HTML content
     */
    loadAssetsContent() {
        return `
            <div class="assets-mobile-container" style="height: 100%; overflow-y: auto; background: #0a0a0a; padding: 1rem; padding-bottom: 3rem;">
                <!-- Header -->
                <div class="assets-header" style="margin-bottom: 2rem; margin-top: 0.25rem;">
                    <div style="text-align: center; margin-bottom: 0.5rem; width: 100%;">
                        <h2 class="assets-title" style="font-family: 'Sora', sans-serif; font-size: 1.8rem; font-weight: 700; color: white; margin: 0 auto 0.5rem auto; text-align: center;">3D Assets Gallery</h2>
                        <p style="color: rgba(255,255,255,0.5); font-size: 0.85rem; line-height: 1.4; max-width: 280px; margin: 0 auto; text-align: center;">Browse amazing 3D models created by our community. Sign in to like or download models.</p>
                    </div>
                    
                    <!-- Search and Filter -->
                    <div style="display: flex; gap: 0.8rem; width: 100%; max-width: 400px; margin: 0 auto;">
                        <!-- Search Bar -->
                        <div class="assets-search" style="position: relative; flex: 1.5;">
                           <input type="text" class="assets-search-input" placeholder="Search models..." id="mobileAssetSearchInput" 
                               style="width: 100%; padding: 0.75rem 1rem 0.75rem 1.5rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 50px; color: white; font-family: 'Inter', sans-serif; font-size: 0.9rem; transition: all 0.3s ease; backdrop-filter: blur(10px); text-align: left;">
                        </div>
                        
                        <!-- Sort Dropdown -->
                        <div style="position: relative; flex: 0 0 auto;">
                            <select class="sort-select" id="mobileSortSelect" 
                                    style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(0, 188, 212, 0.3) !important; border-radius: 50px; color: white; font-family: 'Inter', sans-serif; font-size: 0.9rem; padding: 0.75rem 2.2rem 0.75rem 1rem; cursor: pointer; appearance: none; -webkit-appearance: none; -moz-appearance: none; min-width: 150px; width: 150px; text-align: left; height: 100%; transform: translateZ(0); backface-visibility: hidden; outline: none !important;">
                                <option value="recent">Recent</option>
                                <option value="popular">Popular</option>
                                <option value="name">Name</option>
                                <option value="downloads">Downloads</option>
                            </select>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                                 style="position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); color: rgba(255, 255, 255, 0.4); pointer-events: none;">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                    </div>
                </div>
                
                <!-- Assets Grid -->
                <div class="mobile-assets-grid" id="mobileAssetsGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <!-- Asset cards will be loaded here -->
                </div>

                <!-- Load More Button -->
                <div class="load-more-container" style="text-align: center; margin-top: 2rem;">
                    <button class="load-more-btn" id="loadMoreBtn" style="background: rgba(0, 188, 212, 0.1); color: #00bcd4; border: 2px solid #00bcd4; padding: 0.8rem 2rem; border-radius: 8px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: none;">
                        Load More Models
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Loads account section content
     * @returns {Promise<string>} HTML content
     */
    loadAccountContent() {
        // Check authentication
        const isAuthenticated = window.authManager?.isAuthenticated();
        
        if (!isAuthenticated) {
            return this.generateLoginRequiredContent();
        }
        
        // Get user data
        const userData = window.authManager?.currentUser || {};
        const userEmail = userData.email || 'User';
        const userInitial = userEmail.charAt(0).toUpperCase();
        
        // Update navigation
        this.updateAccountNavLabel(userEmail);
        
        return this.generateAccountContent(userEmail, userInitial);
    }

    /**
     * Generates login required content
     * @returns {string} HTML content
     */
    generateLoginRequiredContent() {
        return `
            <div class="account-section" style="padding: 2rem 1rem; text-align: center; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; background: #0a0a0a;">
                <div style="background: radial-gradient(circle at center, rgba(0,188,212,0.2), transparent 70%); width: 120px; height: 120px; margin: 0 auto 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; animation: pulse 2s ease-in-out infinite;">
                    <div style="background: rgba(0,188,212,0.1); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(0,188,212,0.3);">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2">
                            <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0110 0v4"></path>
                        </svg>
                    </div>
                </div>
                <h2 style="font-family: 'Sora', sans-serif; color: white; margin-bottom: 1rem; font-size: 2rem;">Account Access Required</h2>
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 2rem; max-width: 300px; margin-left: auto; margin-right: auto; line-height: 1.5;">Please log in to access your account settings and view your models.</p>
                <button onclick="window.authManager.showLoginModal()" 
                        style="background: linear-gradient(135deg, #00bcd4, #00acc1); color: white; border: none; padding: 1rem 3rem; border-radius: 50px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 20px rgba(0,188,212,0.3); transition: all 0.3s ease;">
                    Login
                </button>
                
                <style>
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.8; }
                    }
                </style>
            </div>
        `;
    }

    /**
     * Generates account content for authenticated user
     * @param {string} userEmail - User email
     * @param {string} userInitial - User initial
     * @returns {string} HTML content
     */
    generateAccountContent(userEmail, userInitial) {
        return `
            <div class="account-section" style="height: 100%; background: #0a0a0a; position: relative; overflow: hidden;">
                ${this.generateAccountBackground()}
                ${this.generateAccountMainView(userEmail, userInitial)}
                ${this.generateLikedModelsView()}
            </div>
        `;
    }

    /**
     * Generates account background animation
     * @returns {string} HTML content
     */
    generateAccountBackground() {
        return `
            <!-- Animated Background -->
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; pointer-events: none;">
                <div style="position: absolute; width: 300px; height: 300px; background: radial-gradient(circle, rgba(0,188,212,0.15) 0%, transparent 70%); top: -150px; right: -150px; filter: blur(60px); animation: float-1 20s ease-in-out infinite;"></div>
                <div style="position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%); bottom: -200px; left: -200px; filter: blur(80px); animation: float-2 25s ease-in-out infinite;"></div>
            </div>
        `;
    }

    /**
     * Generates account main view
     * @param {string} userEmail - User email
     * @param {string} userInitial - User initial
     * @returns {string} HTML content
     */
    generateAccountMainView(userEmail, userInitial) {
        return `
            <!-- Account Main View -->
            <div class="account-main-view" id="accountMainView" style="position: relative; z-index: 1; padding: 1rem; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
                <!-- Profile Header -->
                <div style="text-align: center; padding-top: 1rem;">
                    <div style="width: 100px; height: 100px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #00bcd4, #00acc1); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(0,188,212,0.3); position: relative; animation: profileFloat 3s ease-in-out infinite;">
                        <span style="font-family: 'Sora', sans-serif; font-size: 2.5rem; font-weight: 700; color: white;">${userInitial}</span>
                        <div style="position: absolute; bottom: 0; right: 0; width: 30px; height: 30px; background: #4caf50; border-radius: 50%; border: 3px solid #0a0a0a; display: flex; align-items: center; justify-content: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                <path d="M9 11.75L11.25 14 15 10.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" stroke-width="2" fill="none"/>
                            </svg>
                        </div>
                    </div>
                    <h2 style="font-family: 'Sora', sans-serif; color: white; margin-bottom: 0.5rem; font-size: 1.8rem;">${userEmail}</h2>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.9rem;">Premium Member</p>
                </div>

                <!-- Stats Cards -->
                ${this.generateStatsCards()}

                <!-- Quick Actions -->
                ${this.generateQuickActions()}
            </div>
        `;
    }

    /**
     * Generates stats cards for account
     * @returns {string} HTML content
     */
 generateStatsCards() {
    return `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 2rem 0;">
            <!-- Credits Card -->
            <button onclick="window.enhancedMonetization.showPricingModal()" style="background: linear-gradient(135deg, rgba(0,188,212,0.1), rgba(0,188,212,0.05)); border: 1px solid rgba(0,188,212,0.3); border-radius: 16px; padding: 1.5rem; text-align: center; position: relative; overflow: hidden; animation: cardSlideUp 0.5s ease-out; cursor: pointer; transition: all 0.3s ease;">
                <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(0,188,212,0.1); border-radius: 50%; filter: blur(20px);"></div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2" style="margin-bottom: 0.5rem;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                </svg>
                <div style="font-family: 'Sora', sans-serif; font-size: 2rem; color: #00bcd4; margin-bottom: 0.3rem; font-weight: 700;" id="accountCreditsCount">0</div>
                <div style="color: rgba(255,255,255,0.8); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Credits</div>
            </button>
                
                <!-- Liked Models Card -->
                <button onclick="window.AppNavigation.showLikedModels()" style="background: linear-gradient(135deg, rgba(0,188,212,0.1), rgba(0,188,212,0.05)); border: 1px solid rgba(0,188,212,0.3); border-radius: 16px; padding: 1.5rem; text-align: center; position: relative; overflow: hidden; animation: cardSlideUp 0.5s ease-out 0.1s; animation-fill-mode: both; cursor: pointer; transition: all 0.3s ease;">
                    <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(0,188,212,0.1); border-radius: 50%; filter: blur(20px);"></div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2" style="margin-bottom: 0.5rem;">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
                    </svg>
                    <div style="font-family: 'Sora', sans-serif; font-size: 2rem; color: #00bcd4; margin-bottom: 0.3rem; font-weight: 700;" id="accountModelsCount">0</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Liked Models</div>
                </button>
            </div>
        `;
    }

    /**
     * Generates quick actions for account
     * @returns {string} HTML content
     */
    generateQuickActions() {
        return `
            <div style="margin-bottom: 2rem;">
                <h3 style="font-family: 'Sora', sans-serif; color: white; margin-bottom: 1rem; font-size: 1.2rem;">Quick Actions</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem;">
                    <button onclick="window.AppNavigation.navigateToSection('generate')" style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.2); border-radius: 12px; padding: 1rem 0.5rem; text-align: center; transition: all 0.3s ease; cursor: pointer;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2" style="margin-bottom: 0.5rem;">
                            <path d="M12 2v20m10-10H2"></path>
                        </svg>
                        <div style="color: white; font-size: 0.85rem;">Create</div>
                    </button>
                    <button onclick="window.AppNavigation.navigateToSection('assets')" style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.2); border-radius: 12px; padding: 1rem 0.5rem; text-align: center; transition: all 0.3s ease; cursor: pointer;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2" style="margin-bottom: 0.5rem;">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <div style="color: white; font-size: 0.85rem;">Browse</div>
                    </button>
                    <button onclick="window.AppNavigation.handleLogout()" style="background: rgba(220,53,69,0.1); border: 1px solid rgba(220,53,69,0.2); border-radius: 12px; padding: 1rem 0.5rem; text-align: center; transition: all 0.3s ease; cursor: pointer;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" style="margin-bottom: 0.5rem;">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <div style="color: #dc3545; font-size: 0.85rem;">Logout</div>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generates liked models view
     * @returns {string} HTML content
     */
    generateLikedModelsView() {
        return `
            <!-- Liked Models View -->
            <div class="liked-models-view" id="likedModelsView" style="position: relative; z-index: 1; padding: 1rem; padding-bottom: 0rem; min-height: 100%; display: none;">
                ${this.generateLikedModelsHeader()}
                ${this.generateLikedModelsFilters()}
                ${this.generateLikedModelsStates()}
            </div>

            ${this.generateAccountStyles()}
        `;
    }

    /**
     * Generates liked models header
     * @returns {string} HTML content
     */
    generateLikedModelsHeader() {
        return `
            <!-- Header with back button -->
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; padding-top: 0.5rem;">
                <button onclick="window.AppNavigation.hideLikedModels()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.6rem; color: white; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h2 style="font-family: 'Sora', sans-serif; font-size: 1.8rem; font-weight: 700; color: white; margin: 0; flex: 1;">My Liked Models</h2>
            </div>
        `;
    }

    /**
     * Generates liked models filters
     * @returns {string} HTML content
     */
    generateLikedModelsFilters() {
        return `
            <!-- Search and Filter -->
            <div style="display: flex; gap: 0.8rem; width: 100%; max-width: 400px; margin: 0 auto 1.5rem auto;">
                <!-- Search Bar -->
                <div style="position: relative; flex: 1.5;">
                    <input type="text" placeholder="Search models..." id="likedModelsSearchInput" 
                           style="width: 100%; padding: 0.75rem 1rem 0.75rem 1rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 50px; color: white; font-family: 'Inter', sans-serif; font-size: 0.9rem; transition: all 0.3s ease; backdrop-filter: blur(10px); text-align: left;">
                </div>
                
                <!-- Sort Dropdown -->
                <div style="position: relative; flex: 0 0 auto;">
                    <select id="likedModelsSortSelect" 
                            style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(0, 188, 212, 0.3) !important; border-radius: 50px; color: white; font-family: 'Inter', sans-serif; font-size: 0.9rem; padding: 0.75rem 2.2rem 0.75rem 1rem; cursor: pointer; appearance: none; -webkit-appearance: none; -moz-appearance: none; min-width: 150px; width: 150px; text-align: left; height: 100%; transform: translateZ(0); backface-visibility: hidden; outline: none !important;">
                        <option value="recent">Recent</option>
                        <option value="name">Name</option>
                        <option value="popular">Popular</option>
                        <option value="downloads">Downloads</option>
                    </select>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                         style="position: absolute; right: 0.8rem; top: 50%; transform: translateY(-50%); color: rgba(255, 255, 255, 0.4); pointer-events: none;">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            </div>
        `;
    }

    /**
     * Generates liked models states (loading, empty, error, grid)
     * @returns {string} HTML content
     */
    generateLikedModelsStates() {
        return `
            <!-- Loading State -->
            <div id="likedModelsLoading" style="display: none; text-align: center; padding: 3rem 1rem; color: #00bcd4;">
                <div style="width: 50px; height: 50px; border: 3px solid rgba(0, 188, 212, 0.2); border-top: 3px solid #00bcd4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <p style="font-family: 'Sora', sans-serif; font-weight: 500;">Loading your liked models...</p>
            </div>

            <!-- Liked Models Grid -->
            <div id="likedModelsGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                <!-- Liked models will be loaded here -->
            </div>

            <!-- Empty State -->
            <div id="likedModelsEmpty" style="display: none; text-align: center; padding: 3rem 1rem; color: rgba(255, 255, 255, 0.6);">
                <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.6;">💔</div>
                <h3 style="color: white; font-family: 'Sora', sans-serif; margin-bottom: 0.5rem; font-size: 1.2rem;">No liked models yet</h3>
                <p style="margin-bottom: 2rem; line-height: 1.5;">Start liking models to build your collection!</p>
                <button onclick="window.AppNavigation.navigateToSection('assets')" style="background: #00bcd4; color: white; border: none; padding: 0.8rem 2rem; border-radius: 8px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                    Browse Models
                </button>
            </div>

            <!-- Error State -->
            <div id="likedModelsError" style="display: none; text-align: center; padding: 3rem 1rem; color: rgba(255, 255, 255, 0.6);">
                <div style="font-size: 4rem; margin-bottom: 1rem; color: #dc3545;">⚠️</div>
                <h3 style="color: white; font-family: 'Sora', sans-serif; margin-bottom: 0.5rem; font-size: 1.2rem;">Error Loading Models</h3>
                <p style="margin-bottom: 2rem; line-height: 1.5;">Failed to load your liked models. Please try again.</p>
                <button onclick="window.AppNavigation.loadLikedModels()" style="background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); padding: 0.8rem 2rem; border-radius: 8px; font-family: 'Sora', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">
                    Try Again
                </button>
            </div>

            <!-- Load More Button -->
            <div style="text-align: center; margin-top: 2rem;">
                <button id="likedModelsLoadMore" style="background: rgba(0, 188, 212, 0.1); color: #00bcd4; border: 2px solid #00bcd4; padding: 0.8rem 2rem; border-radius: 8px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: none;">
                    Load More Models
                </button>
            </div>
        `;
    }

    /**
     * Generates account styles
     * @returns {string} CSS styles
     */
    generateAccountStyles() {
        return `
            <style>
                @keyframes float-1 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(30px, -30px); }
                }
                @keyframes float-2 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-40px, 40px); }
                }
                @keyframes profileFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes cardSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .account-section button {
                    pointer-events: auto;
                    touch-action: manipulation;
                }
                
                .account-section button:active {
                    transform: translateY(0);
                }
                
                .account-section button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                
                .account-section .animated-bg {
                    position: fixed !important;
                    pointer-events: none !important;
                }
            </style>
        `;
    }

    /**
     * Loads about section content
     * @returns {Promise<string>} HTML content
     */
    loadAboutContent() {
        return `
            <!-- About Section -->
            <div class="about-container" style="height: 100%; overflow-y: auto; overflow-x: hidden; background: #0a0a0a; position: relative; max-height: 100vh;">
                ${this.generateAboutBackground()}
                ${this.generateAboutScrollableContent()}
            </div>
        `;
    }

    /**
     * Generates about section background
     * @returns {string} HTML content
     */
    generateAboutBackground() {
        return `
            <!-- Animated Background -->
            <div class="animated-bg" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; pointer-events: none;">
                <div class="particle-field" id="particleField" style="position: absolute; width: 100%; height: 100%;">
                    <!-- Particles will be added via JS -->
                </div>
                <div class="gradient-orb orb-1" style="position: absolute; width: 300px; height: 300px; background: radial-gradient(circle, rgba(0,188,212,0.3) 0%, transparent 70%); top: 10%; left: -150px; filter: blur(40px); animation: float-1 15s ease-in-out infinite;"></div>
                <div class="gradient-orb orb-2" style="position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(0,229,255,0.2) 0%, transparent 70%); bottom: 10%; right: -200px; filter: blur(50px); animation: float-2 20s ease-in-out infinite;"></div>
                <div class="gradient-orb orb-3" style="position: absolute; width: 350px; height: 350px; background: radial-gradient(circle, rgba(0,151,167,0.25) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(45px); animation: float-3 18s ease-in-out infinite;"></div>
            </div>
        `;
    }

    /**
     * Generates about section scrollable content
     * @returns {string} HTML content
     */
    generateAboutScrollableContent() {
        return `
            <!-- Scrollable Content -->
            <div style="position: relative; z-index: 1; padding: 1rem; padding-bottom: 1.5rem; min-height: 100%;">
                ${this.generateAboutHeader()}
                ${this.generateAboutStats()}
                ${this.generateHowItWorks()}
                ${this.generateFAQ()}
                ${this.generateLegalPrivacy()}
                ${this.generateContactSection()}
            </div>

            ${this.generateAboutStyles()}
        `;
    }

    /**
     * Generates about header
     * @returns {string} HTML content
     */
    generateAboutHeader() {
        return `
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 2rem; padding-top: 1rem;">
                <h1 style="font-family: 'Sora', sans-serif; font-size: 2.5rem; font-weight: 700; color: white; margin-bottom: 0.5rem; text-shadow: 0 0 30px rgba(0,188,212,0.5);">About Threely</h1>
                <p style="color: rgba(255,255,255,0.8); font-size: 1rem; line-height: 1.4; max-width: 500px; margin: 0 auto;">Transform every picture into professional 3D models with cutting-edge AI technology.</p>
            </div>
        `;
    }

    /**
     * Generates about stats section
     * @returns {string} HTML content
     */
generateAboutStats() {
    return `
        <!-- Stats -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; margin-bottom: 2rem;">
            <div class="stat-card" style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1.2rem 0.5rem; text-align: center; backdrop-filter: blur(10px); animation: fadeInUp 0.6s ease-out 0.1s forwards; opacity: 0;">
              <div class="stat-number" style="font-family: 'Sora', monospace; font-size: 1.8rem; font-weight: 700; color: #00bcd4; margin-bottom: 0.3rem; width: 100px; height: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.3rem auto;" data-target="50000">50,000</div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">Models Created</div>
            </div>
            <div class="stat-card" style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1.2rem 0.5rem; text-align: center; backdrop-filter: blur(10px); animation: fadeInUp 0.6s ease-out 0.2s forwards; opacity: 0;">
                <div class="stat-number" style="font-family: 'Sora', monospace; font-size: 1.8rem; font-weight: 700; color: #00bcd4; margin-bottom: 0.3rem; width: 40px; height: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.3rem auto;" data-target="5">5</div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">Min Generation</div>
            </div>
            <div class="stat-card" style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1.2rem 0.5rem; text-align: center; backdrop-filter: blur(10px); animation: fadeInUp 0.6s ease-out 0.3s forwards; opacity: 0;">
                <div class="stat-number" style="font-family: 'Sora', monospace; font-size: 1.8rem; font-weight: 700; color: #00bcd4; margin-bottom: 0.3rem; width: 40px; height: 32px; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.3rem auto;" data-target="98">98</div>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">% Satisfaction</div>
            </div>
        </div>
    `;
}

    /**
     * Generates how it works section
     * @returns {string} HTML content
     */
    generateHowItWorks() {
        return `
            <!-- How It Works -->
            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; backdrop-filter: blur(10px);">
                <h2 style="font-family: 'Sora', sans-serif; font-size: 1.5rem; color: white; margin-bottom: 1.2rem; text-align: center;">How It Works</h2>
                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                    <div class="step-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.8rem; background: rgba(0,0,0,0.3); border-radius: 12px; animation: slideInLeft 0.5s ease-out 0.4s forwards; opacity: 0; transform: translateX(-20px);">
                        <div style="background: #00bcd4; color: #0a0a0a; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: 1.1rem;">1</div>
                        <div>
                            <h3 style="color: white; font-size: 1rem; margin-bottom: 0.2rem; font-weight: 600;">Upload Photo</h3>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.3;">Take or select a clear picture of your object</p>
                        </div>
                    </div>
                    <div class="step-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.8rem; background: rgba(0,0,0,0.3); border-radius: 12px; animation: slideInLeft 0.5s ease-out 0.5s forwards; opacity: 0; transform: translateX(-20px);">
                        <div style="background: #00bcd4; color: #0a0a0a; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: 1.1rem;">2</div>
                        <div>
                            <h3 style="color: white; font-size: 1rem; margin-bottom: 0.2rem; font-weight: 600;">AI Processing</h3>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.3;">Our AI analyzes and creates a 3D model</p>
                        </div>
                    </div>
                    <div class="step-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.8rem; background: rgba(0,0,0,0.3); border-radius: 12px; animation: slideInLeft 0.5s ease-out 0.6s forwards; opacity: 0; transform: translateX(-20px);">
                        <div style="background: #00bcd4; color: #0a0a0a; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: 1.1rem;">3</div>
                        <div>
                            <h3 style="color: white; font-size: 1rem; margin-bottom: 0.2rem; font-weight: 600;">Download & Use</h3>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.3;">Export in multiple formats for any project</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generates FAQ section
     * @returns {string} HTML content
     */
    generateFAQ() {
        const faqs = [
            {
                question: 'What image formats are supported?',
                answer: 'We support JPG, PNG, and WEBP formats up to 10MB. For best results, use clear, well-lit pictures with the object as the main subject.'
            },
            {
                question: 'Can I get a refund?',
                answer: 'Due to the computational resources required for each generation, we do not offer refunds for credits once purchased. However, we\'re always here to help if you experience any issues.'
            },
            {
                question: 'Who owns the generated models?',
                answer: 'You retain full ownership and commercial rights to all models generated with paid credits. Use them freely in games, animations, NFTs, or any other projects.'
            },
            {
                question: 'What export formats are available?',
                answer: 'We support GLB, FBX, OBJ, and USDZ formats, compatible with Unity, Unreal Engine, Blender, and more.'
            }
        ];

        return `
            <!-- FAQ Section -->
            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; backdrop-filter: blur(10px);">
                <h2 style="font-family: 'Sora', sans-serif; font-size: 1.5rem; color: white; margin-bottom: 1.2rem; text-align: center;">FAQ</h2>
                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                    ${faqs.map(faq => `
                        <details class="faq-item" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem;">
                            <summary style="font-weight: 600; color: #00bcd4; font-size: 0.95rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                ${faq.question}
                                <span class="faq-arrow" style="transition: transform 0.3s; display: inline-block;">▼</span>
                            </summary>
                            <p style="color: rgba(255,255,255,0.8); margin-top: 0.8rem; font-size: 0.85rem; line-height: 1.4;">${faq.answer}</p>
                        </details>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Generates legal and privacy section
     * @returns {string} HTML content
     */
    generateLegalPrivacy() {
        return `
            <!-- Legal & Privacy -->
            <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 1.5rem; margin-bottom: 0.5rem; backdrop-filter: blur(10px);">
                <h2 style="font-family: 'Sora', sans-serif; font-size: 1.5rem; color: white; margin-bottom: 1.2rem; text-align: center;">Legal & Privacy</h2>
                <div style="display: flex; flex-direction: column; gap: 1.2rem;">
                    <div>
                        <h3 style="color: #00bcd4; font-size: 1rem; margin-bottom: 0.4rem;">Terms of Service</h3>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; line-height: 1.4;">By using Threely, you agree to our terms. All generated models from paid credits are yours to use commercially without restrictions.</p>
                    </div>
                    <div>
                        <h3 style="color: #00bcd4; font-size: 1rem; margin-bottom: 0.4rem;">Privacy Policy</h3>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; line-height: 1.4;">Uploaded images are processed securely and deleted after 24 hours. We never share your data with third parties.</p>
                    </div>
                    <div>
                        <h3 style="color: #00bcd4; font-size: 1rem; margin-bottom: 0.4rem;">Content Guidelines</h3>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; line-height: 1.4;">Use your imagination! Our AI model is trained on any object.</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generates contact section
     * @returns {string} HTML content
     */
    generateContactSection() {
        return `
            <!-- Contact -->
            <div style="text-align: center; padding: 2rem 0 1rem 0; margin-bottom: 0;">
                <h3 style="color: white; margin-bottom: 0.8rem; font-size: 1.3rem;">Need Help?</h3>
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.2rem; font-size: 0.9rem;">Our support team is here to assist you</p>
                <a href="mailto:threely.service@gmail.com" style="background: #00bcd4; color: white; padding: 0.8rem 2rem; border-radius: 50px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 0.95rem;">Contact Support</a>
            </div>
        `;
    }

    /**
     * Generates about section styles
     * @returns {string} CSS styles
     */
    generateAboutStyles() {
        return `
            <style>
                @keyframes float-1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                @keyframes float-2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(-40px, 20px) scale(0.9); }
                    66% { transform: translate(20px, -40px) scale(1.1); }
                }
                @keyframes float-3 {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-50%, -50%) scale(1.15); }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .faq-item[open] .faq-arrow {
                    transform: rotate(180deg);
                }
                .faq-item summary::-webkit-details-marker {
                    display: none;
                }
            </style>
        `;
    }

    /**
     * Initializes section-specific functionality
     * @param {string} sectionName - Section name
     */
    async initializeSectionFunctionality(sectionName) {
        switch (sectionName) {
            case 'home':
                await this.initializeHome();
                break;
            case 'generate':
                await this.initializeGenerate();
                break;
            case 'assets':
                await this.initializeAssets();
                break;
            case 'account':
                await this.initializeAccount();
                break;
            case 'about':
                await this.initializeAbout();
                break;
        }
    }

    /**
     * Initializes home section functionality
     */
    async initializeHome() {
        console.log('🎯 Initializing home section...');
        
        // Setup hero generate button
        setTimeout(() => {
            const heroGenerateBtn = document.getElementById('heroGenerateBtn');
            if (heroGenerateBtn) {
                heroGenerateBtn.addEventListener('click', () => {
                    this.navigateToSection('generate');
                });
                console.log('✅ Hero generate button connected');
            }
        }, 100);
        
        // Initialize 3D viewer
        const container = document.getElementById('appHero3d');
        if (container) {
            console.log('✅ Found appHero3d container, initializing 3D...');
            const scene = window.Mobile3D.init('appHero3d');
            
            // Wait for model if loading
            if (window.Mobile3D && window.Mobile3D.scene) {
                const sceneData = window.Mobile3D.scene();
                if (sceneData.modelLoadPromise) {
                    console.log('⏳ Waiting for 3D model to load...');
                    await sceneData.modelLoadPromise;
                    console.log('✅ 3D model ready');
                }
            }
        } else {
            console.error('❌ appHero3d container not found!');
        }
    }

    /**
     * Initializes generate section functionality
     */
    async initializeGenerate() {
        console.log('🎯 Initializing generate section...');
        
        // Create generate controller if doesn't exist
        if (!window.generateController) {
            window.generateController = new GenerateController(this.getApiBaseUrl());
        }
        
        // Check if generation is in progress
        if (window.generateController) {
            if (window.generateController.generateState.currentView === 'loading') {
                console.log('⚠️ Generation in progress, not resetting');
                return;
            }
            
            if (window.generateController.generateState.currentView === 'viewer') {
                console.log('🔄 Viewer active, keeping state');
                return;
            }
        }
        
        // Setup event listeners after DOM ready
        setTimeout(() => {
            window.generateController.setupGenerateEventListeners();
            window.generateController.initializeDogFacts();
            console.log('✅ Generate section initialized with GenerateController');
        }, 100);
    }

    /**
     * Initializes assets section functionality
     */
    async initializeAssets() {
        console.log('🎯 Initializing public assets section...');
        
        // Ensure Mobile Asset Viewer is initialized
        if (!window.MobileAssetViewer) {
            console.warn('⚠️ MobileAssetViewer not found, creating new instance...');
            if (typeof MobileAssetViewer === 'undefined') {
                console.error('❌ MobileAssetViewer class not defined. Check if mobile-asset-viewer.js is loaded.');
                return;
            }
            window.MobileAssetViewer = new MobileAssetViewer();
        }
        
        // Initialize viewer HTML if needed
        if (!window.MobileAssetViewer.viewerInitialized) {
            console.log('📱 Initializing Mobile Asset Viewer HTML...');
            window.MobileAssetViewer.initializeViewerHTML();
        }
        
        // Setup search functionality
        const searchInput = document.getElementById('mobileAssetSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.assetsData.searchTerm = e.target.value.toLowerCase().trim();
                this.assetsData.currentPage = 1;
                this.filterAndRenderAssets();
            }, 300));
        }

        // Setup sort functionality
        const sortSelect = document.getElementById('mobileSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.assetsData.sortBy = e.target.value;
                this.assetsData.currentPage = 1;
                this.filterAndRenderAssets();
            });
        }

        // Setup load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.assetsData.currentPage++;
                this.filterAndRenderAssets(false);
            });
        }

        // Load user likes and all assets
        await this.loadUserLikedAssets();
        await this.loadAllAssets();
        
        console.log('✅ Assets section initialized with MobileAssetViewer');
    }

    /**
     * Initializes account section functionality
     */
    async initializeAccount() {
        console.log('🎯 Initializing account section...');
        
        const isAuthenticated = window.authManager?.isAuthenticated();
        if (isAuthenticated) {
            const userData = window.authManager?.currentUser || {};
            this.updateAccountNavLabel(userData.email);
            this.updateTopBarAccountButton();
            
            // Update stats
            this.updateAccountStats();
            this.updateLikedCount();
            
            // Update liked models count with delay
            setTimeout(async () => {
                await this.updateLikedModelsCount();
            }, 100);
        } else {
            this.updateAccountNavLabel(null);
            this.updateTopBarAccountButton();
        }
    }

    /**
     * Initializes about section functionality
     */
    async initializeAbout() {
        console.log('🎯 Initializing about section animations...');
        
        // Create floating particles
        const particleField = document.getElementById('particleField');
       if (particleField) {
            particleField.innerHTML = '';
            
            // Add particle animation CSS if not exists
            if (!document.getElementById('particleAnimationStyles')) {
                const style = document.createElement('style');
                style.id = 'particleAnimationStyles';
                style.textContent = `
                    @keyframes float-particle {
                        0% {
                            transform: translateY(100vh) translateX(0);
                            opacity: 0;
                        }
                        10% {
                            opacity: 1;
                        }
                        90% {
                            opacity: 1;
                        }
                        100% {
                            transform: translateY(-100vh) translateX(100px);
                            opacity: 0;
                        }
                    }
                    
                    .particle {
                        position: absolute;
                        width: 2px;
                        height: 2px;
                        background: rgba(0, 188, 212, 0.6);
                        border-radius: 50%;
                        pointer-events: none;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Create particles
            for (let i = 0; i < 10; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.cssText = `
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    animation: float-particle ${10 + Math.random() * 20}s linear infinite;
                    animation-delay: ${Math.random() * 10}s;
                `;
                particleField.appendChild(particle);
            }
            console.log('✅ Created 10 floating particles');
        }
        
        // Animate stats counters
        this.animateStatsIfVisible();
    }

} // End of AppNavigation class

// Create singleton instance
window.AppNavigation = new AppNavigation();

/**
 * Initializes token synchronization between auth and monetization systems
 */
async function initializeTokenSync() {
    // Wait for auth manager
    if (window.authManager) {
        await window.authManager.waitForAuthCheck?.();
    }
    
    // Initialize monetization with user data
    if (window.EnhancedMonetization) {
        const monetizationInstance = window.EnhancedMonetization.init();
        window.enhancedMonetization = monetizationInstance;
        
        // Sync tokens if authenticated
        if (window.authManager?.isAuthenticated()) {
            const user = window.authManager.getUser();
            if (user && user.tokens !== undefined) {
                monetizationInstance.userTokens = user.tokens;
                monetizationInstance.userId = user.id;
                monetizationInstance.isAdmin = user.isAdmin;
                monetizationInstance.updateTokensDisplay();
                console.log('🚀 Initial sync: Tokens set to', user.tokens);
            }
        }
    }
    
    // Update account button
    if (window.AppNavigation && window.AppNavigation.updateTopBarAccountButton) {
        window.AppNavigation.updateTopBarAccountButton();
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTokenSync);
} else {
    initializeTokenSync();
}

// Additional safety update on window load
window.addEventListener('load', () => {
    if (window.AppNavigation && window.AppNavigation.updateTopBarAccountButton) {
        window.AppNavigation.updateTopBarAccountButton();
    }
});

// Create singleton instance
window.AppNavigation = new AppNavigation();

/**
 * Initializes token synchronization between auth and monetization systems
 */
async function initializeTokenSync() {
    // Wait for auth manager
    if (window.authManager && window.authManager.waitForAuthCheck) {
        await window.authManager.waitForAuthCheck();
    }
    
    // Initialize monetization with user data
    if (window.EnhancedMonetization) {
        const monetizationInstance = window.EnhancedMonetization.init();
        window.enhancedMonetization = monetizationInstance;
        
        // Sync tokens if authenticated
        if (window.authManager && window.authManager.isAuthenticated()) {
            const user = window.authManager.getUser();
            if (user && user.tokens !== undefined) {
                monetizationInstance.userTokens = user.tokens;
                monetizationInstance.userId = user.id;
                monetizationInstance.isAdmin = user.isAdmin || false;
                if (monetizationInstance.updateTokensDisplay) {
                    monetizationInstance.updateTokensDisplay();
                }
                console.log('🚀 Initial sync: Tokens set to', user.tokens);
            }
        }
    }
    
    // Update account button
    if (window.AppNavigation && window.AppNavigation.updateTopBarAccountButton) {
        window.AppNavigation.updateTopBarAccountButton();
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTokenSync);
} else {
    initializeTokenSync();
}

// Additional safety update on window load
window.addEventListener('load', () => {
    if (window.AppNavigation && window.AppNavigation.updateTopBarAccountButton) {
        window.AppNavigation.updateTopBarAccountButton();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppNavigation;}