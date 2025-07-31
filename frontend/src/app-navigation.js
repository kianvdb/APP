// Enhanced app-navigation.js - DALMA AI Mobile App Navigation
// Updated version with assets section public, authentication only for actions

class AppNavigation {
    constructor() {
        this.currentSection = 'home';
        this.sections = ['home', 'generate', 'assets', 'account', 'about'];
        this.loadedSections = new Set();
        this.sectionContent = {};
        
        // Assets management
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
        
        // Liked assets management for account section
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

    updateAccountNavLabel(username = null) {
        const accountNavItem = document.querySelector('.nav-item[data-section="account"] .nav-label');
        if (accountNavItem) {
            if (username) {
                const displayName = username.length > 10 ? username.substring(0, 10) + '...' : username;
                accountNavItem.textContent = displayName;
            } else {
                accountNavItem.textContent = 'Login';
            }
        }
    }

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

    init(initialSection = null) {
        console.log('🎯 Setting up app navigation with public assets access...');
        
        this.setupBottomNavigation();
        
        // Check for redirect section first
        const urlParams = new URLSearchParams(window.location.search);
        const redirectSection = urlParams.get('redirect') || localStorage.getItem('dalma_redirectAfterLogin');
        
        // Determine which section to load initially
        const sectionToLoad = initialSection || redirectSection || 'home';
        console.log('📍 Initial section to load:', sectionToLoad);
        
        // Update navigation state immediately if not home
        if (sectionToLoad !== 'home') {
            this.currentSection = sectionToLoad;
            this.updateNavigation(sectionToLoad);
        }
        
        // Load the appropriate section (skip animation for initial load)
        this.loadSectionContent(sectionToLoad).then(() => {
            this.showSection(sectionToLoad, true); // Skip animation for initial load
        });
        
        // Check authentication and update navigation labels
        const isAuthenticated = window.authManager?.isAuthenticated();
        if (isAuthenticated) {
            const userData = window.authManager?.currentUser || {};
            this.updateAccountNavLabel(userData.email);
            this.updateTopBarAccountButton();
        } else {
            this.updateAccountNavLabel(null);
            this.updateTopBarAccountButton();
        }
        
        // Set up account button click handler
        const accountBtn = document.querySelector('.header-actions .account-btn');
        if (accountBtn) {
            accountBtn.addEventListener('click', () => {
                const isAuth = window.authManager?.isAuthenticated();
                if (!isAuth) {
                    window.authManager?.showLoginModal();
                } else {
                    this.navigateToSection('account');
                }
            });
        }
        
        console.log('✅ App navigation ready with public assets access');
    }

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

    async navigateToSection(sectionName) {
        if (sectionName === this.currentSection) return;
        
        console.log(`📱 Navigating to: ${sectionName}`);
        
        // Update navigation state
        this.updateNavigation(sectionName);
        
        // Show section
        await this.showSection(sectionName);
        
        this.currentSection = sectionName;
    }

    updateNavigation(activeSection) {
        // Update bottom nav active state
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.section === activeSection) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    async showSection(sectionName, skipAnimation = false) {
        const sectionElement = document.getElementById(`${sectionName}Section`);
        
        if (!sectionElement) {
            console.error(`❌ Section not found: ${sectionName}`);
            return;
        }

        // Hide all sections first
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Load content if not already loaded
        if (!this.loadedSections.has(sectionName)) {
            await this.loadSectionContent(sectionName);
        }

        // Show new section
        if (skipAnimation) {
            // Immediate display without animation for initial load
            sectionElement.style.display = 'block';
            sectionElement.classList.add('active');
            sectionElement.scrollTop = 0;
            console.log(`✅ Section displayed immediately: ${sectionName}`);
        } else {
            // Normal animated transition
            setTimeout(() => {
                sectionElement.style.display = 'block';
                sectionElement.classList.add('active');
                sectionElement.scrollTop = 0;
                
                console.log(`✅ Section displayed: ${sectionName}`);
            }, 50);
        }
    }

    async loadSectionContent(sectionName) {
        const sectionElement = document.getElementById(`${sectionName}Section`);
        
        if (!sectionElement) {
            console.error(`❌ Section element not found: ${sectionName}Section`);
            return;
        }

        // Show loading state with smooth spinner
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

            sectionElement.innerHTML = `<div class="section-content">${content}</div>`;
            
            // Initialize section-specific functionality
            await this.initializeSectionFunctionality(sectionName);
            
            this.loadedSections.add(sectionName);
            console.log(`✅ Section loaded: ${sectionName}`);
            
        } catch (error) {
            console.error(`❌ Error loading section ${sectionName}:`, error);
            sectionElement.innerHTML = `
                <div class="section-content" style="padding: 2rem; text-align: center;">
                    <h3 style="color: #dc3545; margin-bottom: 1rem;">Error Loading Section</h3>
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 1rem;">Failed to load ${sectionName} content.</p>
                    <button onclick="window.AppNavigation.reloadSection('${sectionName}')" 
                            style="background: #00bcd4; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    async loadHomeContent() {
        return `
            <!-- Hero Section -->
            <section class="hero">
                <div class="geometric-pattern"></div>
                <div class="hero-3d" id="appHero3d">
                    <!-- 3D Dog Model will be rendered here -->
                </div>
                <div class="hero-content" style="padding: 0.5rem; padding-top: 0.25rem; position: relative; z-index: 10;">
                    <div class="hero-text">
                        <h2 class="hero-title" style="margin-bottom: 0.4rem; line-height: 1.05;">From picture to<br>3D with ease!</h2>
                        <p class="hero-subtitle" style="margin-bottom: 1rem; line-height: 1.1; font-size: 0.8rem;">Within a few clicks of a button you can generate, rig and animate your own, ready to use 3D model!</p>
                        <button class="cta-button" id="heroGenerateBtn" style="position: relative; z-index: 20; pointer-events: auto;">GENERATE</button>
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
                
                /* Ensure 3D canvas doesn't block interactions */
                #appHero3d canvas {
                    pointer-events: auto !important;
                }
            </style>
        `;
    }

    async loadGenerateContent() {
        // Same as before - existing generate content
        return `
            <div class="container">
                <div class="main-layout">
                    <!-- Left side - 3D Viewer -->
                    <div class="viewer-section">
                        <!-- 3D Viewer -->
                        <div id="viewer">
                            <div id="3dCanvas">
                                <div id="dogFactOverlay"></div>
                                <div id="generationOverlay"></div>
                                
                                <!-- Like Button -->
                                <div class="like-button-container" id="likeButtonContainer" style="display: none;">
                                    <button class="like-button" id="likeButton" title="Like this model">
                                        <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
                                            <path class="heart-outline" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" stroke-width="2"/>
                                            <path class="heart-filled" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" opacity="0"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Action buttons -->
                        <div class="action-buttons">
                            <button class="action-btn">
                                <span>🦴 Rigging & Animation</span>
                            </button>
                            <button class="action-btn">
                                <span>🚀 Direct Export</span>
                            </button>
                            <!-- Download dropdown -->
                            <div class="download-dropdown">
                                <button class="download-trigger">
                                    <span>📥 Download</span>
                                    <span class="dropdown-arrow">▶</span>
                                </button>
                                <div class="download-options">
                                    <button id="downloadGLB" class="download-option">GLB</button>
                                    <button id="downloadUSDZ" class="download-option">USDZ</button>
                                    <button id="downloadOBJ" class="download-option">OBJ</button>
                                    <button id="downloadFBX" class="download-option">FBX</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right side - Controls -->
                    <div class="controls-sidebar disabled">
                        
                        <!-- Image Upload -->
                        <div class="control-section image-upload">
                            <label class="control-label" for="imageInput">Upload Image</label>
                            <div class="upload-area" onclick="document.getElementById('imageInput').click()">
                                <input type="file" id="imageInput" accept="image/*"/>
                                <div class="upload-text">Supported formats: .jpg .jpeg .png</div>
                                <div class="upload-preview" id="uploadPreview">
                                    <div class="upload-preview-overlay">
                                        <div class="upload-change-text">Click to change image</div>
                                    </div>
                                </div>
                                <div class="scanning-overlay" id="scanningOverlay">
                                    <div class="scanning-animation"></div>
                                    <div class="scanning-text">Scanning picture...</div>
                                </div>
                            </div>
                        </div>

                        <!-- Symmetry Controls -->
                        <div class="control-section dropdown-section">
                            <label class="control-label">Symmetry</label>
                            <div class="dropdown-control" id="symmetryDropdown">
                                <div class="dropdown-display">
                                    <span class="dropdown-label">Symmetry</span>
                                    <span class="dropdown-value">Auto</span>
                                    <span class="dropdown-arrow">></span>
                                </div>
                                <div class="dropdown-options">
                                    <div class="dropdown-option" data-value="auto">Auto</div>
                                    <div class="dropdown-option" data-value="on">On</div>
                                </div>
                            </div>
                        </div>

                        <!-- Topology Controls -->
                        <div class="control-section dropdown-section">
                            <label class="control-label">Topology</label>
                            <div class="dropdown-control" id="topologyDropdown">
                                <div class="dropdown-display">
                                    <span class="dropdown-label">Topology</span>
                                    <span class="dropdown-value">Triangles</span>
                                    <span class="dropdown-arrow">></span>
                                </div>
                                <div class="dropdown-options">
                                    <div class="dropdown-option" data-value="triangle">Triangles</div>
                                    <div class="dropdown-option" data-value="quad">Quads</div>
                                </div>
                            </div>
                        </div>

                        <!-- Polycount Controls -->
                        <div class="control-section">
                            <div class="polycount-control">
                                <label class="control-label" for="polycountSlider">Polycount</label>
                                <div class="polycount-inputs">
                                    <input type="range" id="polycountSlider" min="100" max="300000" value="30000" step="100">
                                    <input type="number" id="polycountInput" min="100" max="300000" value="30000" step="100">
                                </div>
                            </div>
                        </div>

                        <!-- Texture Controls -->
                        <div class="control-section dropdown-section">
                            <label class="control-label">Texture</label>
                            <div class="dropdown-control" id="textureDropdown">
                                <div class="dropdown-display">
                                    <span class="dropdown-label">Texture</span>
                                    <span class="dropdown-value">Yes</span>
                                    <span class="dropdown-arrow">></span>
                                </div>
                                <div class="dropdown-options">
                                    <div class="dropdown-option" data-value="true">Yes</div>
                                    <div class="dropdown-option" data-value="false">No</div>
                                </div>
                            </div>
                        </div>

                        <!-- PBR Controls -->
                        <div class="control-section">
                            <div id="pbrButtons" class="checkbox-group">
                                <label for="pbrCheckbox">
                                    <input type="checkbox" id="pbrCheckbox" />
                                    PBR Enabled
                                </label>
                            </div>
                        </div>

                        <!-- Progress Section -->
                        <div class="progress-section-container">
                            <div class="progress-section">
                                <div id="spinnerContainer">
                                    <div class="spinner"></div>
                                    <span id="progressText">0%</span>
                                </div>
                                <progress id="progressBar" value="0" max="100"></progress>
                            </div>
                        </div>

                        <!-- Generate Button -->
                        <button id="generateBtn">Generate Model</button>
                        
                    </div>
                </div>
            </div>
        `;
    }

    async loadAssetsContent() {
        return `
            <div class="assets-mobile-container" style="height: 100%; overflow-y: auto; background: #0a0a0a; padding: 1rem; padding-bottom: 2rem;">
                <!-- Public Assets Header - No authentication required -->
                <div class="assets-header" style="margin-bottom: 1.5rem;">
                    <h2 class="assets-title" style="font-family: 'Sora', sans-serif; font-size: 1.8rem; font-weight: 700; color: white; margin: 0 0 1rem 0;">3D Dog Gallery</h2>
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.5rem; font-size: 0.9rem;">Browse amazing 3D models created by our community. Sign in to like or download models.</p>
                    
                    <!-- Search and Sort Controls in One Row -->
                    <div class="search-sort-row" style="display: flex; gap: 1rem; align-items: center;">
                        <div class="assets-search" style="position: relative; flex: 1;">
                            <svg class="assets-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: rgba(0, 188, 212, 0.6); pointer-events: none;">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input type="text" class="assets-search-input" placeholder="Search models..." id="mobileAssetSearchInput" style="width: 100%; padding: 0.8rem 1.2rem 0.8rem 3rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(0, 188, 212, 0.3); border-radius: 24px; color: white; font-family: 'Inter', sans-serif; font-size: 0.95rem; transition: all 0.3s ease; backdrop-filter: blur(10px);">
                        </div>
                        <select class="sort-select" id="mobileSortSelect" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-family: 'Inter', sans-serif; font-size: 0.85rem; padding: 0.6rem 0.8rem; cursor: pointer; min-width: 120px;">
                            <option value="recent">Recent</option>
                            <option value="popular">Popular</option>
                            <option value="name">Name</option>
                            <option value="downloads">Downloads</option>
                        </select>
                    </div>
                </div>
                
                <!-- Assets Grid with Loading State -->
                <div class="mobile-assets-grid" id="mobileAssetsGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <!-- Loading skeleton cards -->
                    <div class="skeleton-card">
                        <div class="skeleton-preview"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-stats"></div>
                        </div>
                    </div>
                    <div class="skeleton-card">
                        <div class="skeleton-preview"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-stats"></div>
                        </div>
                    </div>
                    <div class="skeleton-card">
                        <div class="skeleton-preview"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-stats"></div>
                        </div>
                    </div>
                    <div class="skeleton-card">
                        <div class="skeleton-preview"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-stats"></div>
                        </div>
                    </div>
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

    async loadAccountContent() {
        // Check if user is authenticated
        const isAuthenticated = window.authManager?.isAuthenticated();
        
        if (!isAuthenticated) {
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
        
        // Get user data
        const userData = window.authManager?.currentUser || {};
        const userEmail = userData.email || 'User';
        const userInitial = userEmail.charAt(0).toUpperCase();
        
        // Update navigation to show username
        this.updateAccountNavLabel(userEmail);
        
        // Enhanced account content for authenticated users with liked models integration
        return `
            <div class="account-section" style="height: 100%; background: #0a0a0a; position: relative; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;">
                <!-- Animated Background -->
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; pointer-events: none;">
                    <div style="position: absolute; width: 300px; height: 300px; background: radial-gradient(circle, rgba(0,188,212,0.15) 0%, transparent 70%); top: -150px; right: -150px; filter: blur(60px); animation: float-1 20s ease-in-out infinite;"></div>
                    <div style="position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%); bottom: -200px; left: -200px; filter: blur(80px); animation: float-2 25s ease-in-out infinite;"></div>
                </div>
                
                <!-- Default Account View -->
                <div class="account-main-view" id="accountMainView" style="position: relative; z-index: 1; padding: 1rem 1rem 8rem 1rem; min-height: calc(100vh - 2rem); box-sizing: border-box;">
                    <!-- Profile Header -->
                    <div style="text-align: center; margin-bottom: 3rem; padding-top: 1rem;">
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

                    <!-- Stats Cards with animations -->
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2.5rem;">
                        <div style="background: linear-gradient(135deg, rgba(0,188,212,0.1), rgba(0,188,212,0.05)); border: 1px solid rgba(0,188,212,0.3); border-radius: 16px; padding: 1.5rem; text-align: center; position: relative; overflow: hidden; animation: cardSlideUp 0.5s ease-out;">
                            <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(0,188,212,0.1); border-radius: 50%; filter: blur(20px);"></div>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2" style="margin-bottom: 0.5rem;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 6v6l4 2"></path>
                            </svg>
                            <div style="font-family: 'Sora', sans-serif; font-size: 2rem; color: #00bcd4; margin-bottom: 0.3rem; font-weight: 700;" id="accountCreditsCount">0</div>
                            <div style="color: rgba(255,255,255,0.8); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Credits</div>
                        </div>
                        <div style="background: linear-gradient(135deg, rgba(0,188,212,0.1), rgba(0,188,212,0.05)); border: 1px solid rgba(0,188,212,0.3); border-radius: 16px; padding: 1.5rem; text-align: center; position: relative; overflow: hidden; animation: cardSlideUp 0.5s ease-out 0.1s; animation-fill-mode: both;">
                            <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(0,188,212,0.1); border-radius: 50%; filter: blur(20px);"></div>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2" style="margin-bottom: 0.5rem;">
                                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
                            </svg>
                            <div style="font-family: 'Sora', sans-serif; font-size: 2rem; color: #00bcd4; margin-bottom: 0.3rem; font-weight: 700;" id="accountModelsCount">0</div>
                            <div style="color: rgba(255,255,255,0.8); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Liked Models</div>
                        </div>
                    </div>

                    <!-- Quick Actions Section -->
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
                            <button style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.2); border-radius: 12px; padding: 1rem 0.5rem; text-align: center; transition: all 0.3s ease; cursor: pointer;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2" style="margin-bottom: 0.5rem;">
                                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                                    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"></path>
                                </svg>
                                <div style="color: white; font-size: 0.85rem;">Archive</div>
                            </button>
                        </div>
                    </div>

                    <!-- Menu Items -->
                    <div style="display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 2rem;">
                        <button onclick="window.AppNavigation.showLikedModels()" 
                                style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.2rem; color: white; text-align: left; font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 1rem; position: relative; overflow: hidden;">
                            <div style="background: rgba(255,255,255,0.05); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.2rem;">My Liked Models</div>
                                <div style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">View your favorite creations</div>
                            </div>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                        
                        <button onclick="window.MobileMonetization.showPricingModal()" 
                                style="background: linear-gradient(135deg, rgba(0,188,212,0.15), rgba(0,188,212,0.05)); border: 1px solid rgba(0,188,212,0.3); border-radius: 16px; padding: 1.2rem; color: #00bcd4; text-align: left; font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 1rem; position: relative; overflow: hidden;">
                            <div style="background: rgba(0,188,212,0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                    <line x1="1" y1="10" x2="23" y2="10"></line>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.2rem; color: #00bcd4;">Buy More Credits</div>
                                <div style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">Top up your generation balance</div>
                            </div>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(0,188,212,0.5)" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                        
                        <button style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.2rem; color: white; text-align: left; font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 1rem; position: relative; overflow: hidden;">
                            <div style="background: rgba(255,255,255,0.05); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M12 1v6m0 6v6m4.22-10.22l4.24 4.24m-4.24 4.24l4.24 4.24M20 12h6m-6 0h-6m-2.22 4.22l-4.24 4.24m4.24-4.24l-4.24-4.24M12 20v6m0-6v-6"></path>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.2rem;">Settings</div>
                                <div style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">Manage your preferences</div>
                            </div>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                        
                        <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 0.5rem 0;"></div>
                        
                        <button onclick="window.AppNavigation.handleLogout()" 
                                style="background: rgba(220,53,69,0.05); border: 1px solid rgba(220,53,69,0.2); border-radius: 16px; padding: 1.2rem; color: #dc3545; text-align: left; font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 1rem; position: relative; overflow: hidden;">
                            <div style="background: rgba(220,53,69,0.1); width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2">
                                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; font-size: 1rem; margin-bottom: 0.2rem;">Logout</div>
                                <div style="color: rgba(220,53,69,0.7); font-size: 0.85rem;">Sign out of your account</div>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Liked Models View -->
                <div class="liked-models-view" id="likedModelsView" style="position: relative; z-index: 1; padding: 1rem; min-height: 100%; display: none;">
                    <!-- Header with back button -->
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; padding-top: 0.5rem;">
                        <button onclick="window.AppNavigation.hideLikedModels()" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.6rem; color: white; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <h2 style="font-family: 'Sora', sans-serif; font-size: 1.8rem; font-weight: 700; color: white; margin: 0; flex: 1;">My Liked Models</h2>
                    </div>

                    <!-- Search and Sort Controls in One Row -->
                    <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem;">
                        <div style="position: relative; flex: 1;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: rgba(0, 188, 212, 0.6); pointer-events: none;">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input type="text" placeholder="Search liked models..." id="likedModelsSearchInput" style="width: 100%; padding: 0.8rem 1.2rem 0.8rem 3rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(0, 188, 212, 0.3); border-radius: 24px; color: white; font-family: 'Inter', sans-serif; font-size: 0.95rem; transition: all 0.3s ease; backdrop-filter: blur(10px);">
                        </div>
                        <select id="likedModelsSortSelect" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: white; font-family: 'Inter', sans-serif; font-size: 0.85rem; padding: 0.6rem 0.8rem; cursor: pointer; min-width: 120px;">
                            <option value="recent">Recent</option>
                            <option value="name">Name</option>
                            <option value="popular">Popular</option>
                            <option value="downloads">Downloads</option>
                        </select>
                    </div>

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
                </div>
                
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
            </div>
        `;
    }

    async loadAboutContent() {
        return `
            <!-- About Section with Premium Animations -->
            <div class="about-container" style="height: 100%; overflow-y: auto; overflow-x: hidden; background: #0a0a0a; position: relative;">
                <!-- Animated Background - Fixed position -->
                <div class="animated-bg" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; pointer-events: none;">
                    <div class="particle-field" id="particleField" style="position: absolute; width: 100%; height: 100%;">
                        <!-- Particles will be added via JS -->
                    </div>
                    <div class="gradient-orb orb-1" style="position: absolute; width: 300px; height: 300px; background: radial-gradient(circle, rgba(0,188,212,0.3) 0%, transparent 70%); top: 10%; left: -150px; filter: blur(40px); animation: float-1 15s ease-in-out infinite;"></div>
                    <div class="gradient-orb orb-2" style="position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(0,229,255,0.2) 0%, transparent 70%); bottom: 10%; right: -200px; filter: blur(50px); animation: float-2 20s ease-in-out infinite;"></div>
                    <div class="gradient-orb orb-3" style="position: absolute; width: 350px; height: 350px; background: radial-gradient(circle, rgba(0,151,167,0.25) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(45px); animation: float-3 18s ease-in-out infinite;"></div>
                </div>

                <!-- Scrollable Content -->
                <div style="position: relative; z-index: 1; padding: 1rem; padding-bottom: 4rem; min-height: 100%;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 2rem; padding-top: 1rem;">
                        <h1 style="font-family: 'Sora', sans-serif; font-size: 2.5rem; font-weight: 700; color: white; margin-bottom: 0.5rem; text-shadow: 0 0 30px rgba(0,188,212,0.5);">About Threely</h1>
                        <p style="color: rgba(255,255,255,0.8); font-size: 1rem; line-height: 1.4; max-width: 500px; margin: 0 auto;">Transform every picture into professional 3D models with cutting-edge AI technology.</p>
                    </div>

                    <!-- Stats with animation -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; margin-bottom: 2rem;">
                        <div class="stat-card" style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1.2rem 0.5rem; text-align: center; backdrop-filter: blur(10px); animation: fadeInUp 0.6s ease-out 0.1s forwards; opacity: 0;">
                            <div class="stat-number" style="font-family: 'Sora', sans-serif; font-size: 1.8rem; font-weight: 700; color: #00bcd4; margin-bottom: 0.3rem;" data-target="50000">0</div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">Models Created</div>
                        </div>
                        <div class="stat-card" style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1.2rem 0.5rem; text-align: center; backdrop-filter: blur(10px); animation: fadeInUp 0.6s ease-out 0.2s forwards; opacity: 0;">
                            <div class="stat-number" style="font-family: 'Sora', sans-serif; font-size: 1.8rem; font-weight: 700; color: #00bcd4; margin-bottom: 0.3rem;" data-target="5">0</div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">Min Generation</div>
                        </div>
                        <div class="stat-card" style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1.2rem 0.5rem; text-align: center; backdrop-filter: blur(10px); animation: fadeInUp 0.6s ease-out 0.3s forwards; opacity: 0;">
                            <div class="stat-number" style="font-family: 'Sora', sans-serif; font-size: 1.8rem; font-weight: 700; color: #00bcd4; margin-bottom: 0.3rem;" data-target="98">0</div>
                            <div style="color: rgba(255,255,255,0.7); font-size: 0.75rem;">% Satisfaction</div>
                        </div>
                    </div>

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

                    <!-- FAQ Section -->
                    <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; backdrop-filter: blur(10px);">
                        <h2 style="font-family: 'Sora', sans-serif; font-size: 1.5rem; color: white; margin-bottom: 1.2rem; text-align: center;">FAQ</h2>
                        <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                            <details class="faq-item" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem;">
                                <summary style="font-weight: 600; color: #00bcd4; font-size: 0.95rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                    What image formats are supported?
                                    <span class="faq-arrow" style="transition: transform 0.3s; display: inline-block;">▼</span>
                                </summary>
                                <p style="color: rgba(255,255,255,0.8); margin-top: 0.8rem; font-size: 0.85rem; line-height: 1.4;">We support JPG, PNG, and WEBP formats up to 10MB. For best results, use clear, well-lit pictures with the object as the main subject.</p>
                            </details>
                            
                            <details class="faq-item" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem;">
                                <summary style="font-weight: 600; color: #00bcd4; font-size: 0.95rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                    Can I get a refund?
                                    <span class="faq-arrow" style="transition: transform 0.3s; display: inline-block;">▼</span>
                                </summary>
                                <p style="color: rgba(255,255,255,0.8); margin-top: 0.8rem; font-size: 0.85rem; line-height: 1.4;">Due to the computational resources required for each generation, we do not offer refunds for credits once purchased. However, we're always here to help if you experience any issues.</p>
                            </details>
                            
                            <details class="faq-item" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem;">
                                <summary style="font-weight: 600; color: #00bcd4; font-size: 0.95rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                    Who owns the generated models?
                                    <span class="faq-arrow" style="transition: transform 0.3s; display: inline-block;">▼</span>
                                </summary>
                                <p style="color: rgba(255,255,255,0.8); margin-top: 0.8rem; font-size: 0.85rem; line-height: 1.4;">You retain full ownership and commercial rights to all models generated with paid credits. Use them freely in games, animations, NFTs, or any other projects.</p>
                            </details>
                            
                            <details class="faq-item" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem;">
                                <summary style="font-weight: 600; color: #00bcd4; font-size: 0.95rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                                    What export formats are available?
                                    <span class="faq-arrow" style="transition: transform 0.3s; display: inline-block;">▼</span>
                                </summary>
                                <p style="color: rgba(255,255,255,0.8); margin-top: 0.8rem; font-size: 0.85rem; line-height: 1.4;">We support GLB, FBX, OBJ, and USDZ formats, compatible with Unity, Unreal Engine, Blender, and more.</p>
                            </details>
                        </div>
                    </div>

                    <!-- Legal & Privacy -->
                    <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; backdrop-filter: blur(10px);">
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

                    <!-- Contact - Final Section with Limited Scroll -->
                    <div style="text-align: center; padding: 2rem 0; margin-bottom: 0;">
                        <h3 style="color: white; margin-bottom: 0.8rem; font-size: 1.3rem;">Need Help?</h3>
                        <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.2rem; font-size: 0.9rem;">Our support team is here to assist you</p>
                        <a href="mailto:threely.service@gmail.com" style="background: #00bcd4; color: white; padding: 0.8rem 2rem; border-radius: 50px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 0.95rem;">Contact Support</a>
                    </div>
                </div>

                <style>
                    /* Make sure the about container takes full height */
                    #aboutSection {
                        height: 100%;
                        overflow: hidden;
                    }
                    
                    #aboutSection .section-content {
                        height: 100%;
                        overflow: hidden;
                    }
                    
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
                    @keyframes particle-float {
                        from {
                            transform: translateY(100vh) translateX(-50px);
                        }
                        to {
                            transform: translateY(-100px) translateX(50px);
                        }
                    }
                    .faq-item[open] .faq-arrow {
                        transform: rotate(180deg);
                    }
                    .faq-item summary::-webkit-details-marker {
                        display: none;
                    }
                </style>
            </div>
        `;
    }

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

    async initializeHome() {
        console.log('🎯 Initializing home section 3D viewer...');
        setTimeout(() => {
            const container = document.getElementById('appHero3d');
            if (container) {
                console.log('✅ Found appHero3d container, initializing 3D...');
                window.Mobile3D.init('appHero3d');
            } else {
                console.error('❌ appHero3d container not found!');
            }
        }, 500);
    }

    async initializeGenerate() {
        console.log('🎯 Initializing generate section...');
        setTimeout(() => {
            if (window.initGenerate && typeof window.initGenerate === 'function') {
                window.initGenerate();
            } else {
                console.log('⚠️ initGenerate function not available, setting up basic functionality');
                this.setupBasicGenerate();
            }
        }, 200);
    }

    async initializeAssets() {
        console.log('🎯 Initializing public assets section...');
        
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
                this.filterAndRenderAssets(false); // Don't clear existing assets
            });
        }

        // Load user likes only if authenticated (for button states)
        await this.loadUserLikedAssets();
        
        // Load all assets - public access
        await this.loadAllAssets();
    }

    async initializeAccount() {
        console.log('🎯 Initializing account section...');
        this.updateAccountStats();
        
        const isAuthenticated = window.authManager?.isAuthenticated();
        if (isAuthenticated) {
            const userData = window.authManager?.currentUser || {};
            this.updateAccountNavLabel(userData.email);
            this.updateTopBarAccountButton();
        } else {
            this.updateAccountNavLabel(null);
            this.updateTopBarAccountButton();
        }
    }

    async initializeAbout() {
        console.log('🎯 Initializing about section animations...');
        
        // Create floating particles
        const particleField = document.getElementById('particleField');
        if (particleField) {
            for (let i = 0; i < 30; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    background: #00bcd4;
                    opacity: ${Math.random() * 0.5 + 0.2};
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    animation: particle-float ${10 + Math.random() * 20}s linear infinite;
                `;
                particleField.appendChild(particle);
            }
        }
        
        // Animate stats numbers when they come into view
        setTimeout(() => {
            const statNumbers = document.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                const duration = 2000;
                const start = 0;
                const increment = target / (duration / 16);
                let current = start;
                
                const updateNumber = () => {
                    current += increment;
                    if (current < target) {
                        stat.textContent = Math.floor(current);
                        requestAnimationFrame(updateNumber);
                    } else {
                        stat.textContent = target + (stat.parentElement.textContent.includes('%') ? '%' : '');
                    }
                };
                
                updateNumber();
            });
        }, 300);
    }

    // Liked Models functionality
    async showLikedModels() {
        console.log('💖 Showing liked models view...');
        
        const mainView = document.getElementById('accountMainView');
        const likedView = document.getElementById('likedModelsView');
        
        if (mainView && likedView) {
            mainView.style.display = 'none';
            likedView.style.display = 'block';
            
            // Setup liked models functionality
            this.setupLikedModelsEventListeners();
            
            // Load liked models
            await this.loadLikedModels();
        }
    }

    hideLikedModels() {
        console.log('🔙 Hiding liked models view...');
        
        const mainView = document.getElementById('accountMainView');
        const likedView = document.getElementById('likedModelsView');
        
        if (mainView && likedView) {
            likedView.style.display = 'none';
            mainView.style.display = 'block';
        }
    }

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

    async loadLikedModels() {
        this.likedAssetsData.isLoading = true;
        this.showLikedModelsLoading();
        
        try {
            console.log('💖 Loading liked models...');
            
            const response = await fetch(`${this.getApiBaseUrl()}/auth/liked-assets`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.likedAssetsData.assets = data.assets || [];
            this.likedAssetsData.filteredAssets = [...this.likedAssetsData.assets];
            
            console.log('✅ Liked models loaded:', this.likedAssetsData.assets.length);
            
            if (this.likedAssetsData.assets.length === 0) {
                this.showLikedModelsEmpty();
            } else {
                this.filterAndRenderLikedModels();
            }
            
        } catch (error) {
            console.error('❌ Error loading liked models:', error);
            this.showLikedModelsError();
        } finally {
            this.likedAssetsData.isLoading = false;
        }
    }

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
        
        assetCard.innerHTML = `
            ${imageUrl ? `
                <div class="asset-preview" style="width: 100%; height: 200px; position: relative; background: rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <div class="image-loading-placeholder" style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%); background-size: 200% 100%; animation: shimmer 2s infinite;"></div>
                    <img src="${imageUrl}" alt="${this.escapeHtml(asset.name)}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; background: #0a0a0a; opacity: 0; transition: opacity 0.3s ease;" 
                         onload="this.style.opacity='1'; this.parentElement.querySelector('.image-loading-placeholder').style.display='none';"
                         onerror="this.parentElement.innerHTML = '<div style=\\'font-size: 3rem; opacity: 0.6;\\'>${asset.icon || '🐕'}</div>';">
                    <button class="mobile-like-button liked" data-asset-id="${asset._id}" style="position: absolute; top: 8px; right: 8px; background: rgba(0, 188, 212, 0.2); border: 2px solid #00bcd4; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px); color: #00bcd4; z-index: 10;">
                        <svg width="14" height="14" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
                <div class="asset-info" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; background: rgba(10, 10, 10, 0.5);">
                    <h3 style="font-family: 'Sora', sans-serif; font-size: 1rem; font-weight: 600; color: white; margin: 0; text-align: center; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical;">${this.escapeHtml(asset.name)}</h3>
                    <div style="margin-top: 0.5rem; text-align: center; color: #00bcd4; font-family: 'Inter', sans-serif; font-size: 0.75rem;">
                        <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
                    </div>
                </div>
            ` : `
                <div style="font-size: 3rem; opacity: 0.6; text-align: center; padding: 2rem;">${asset.icon || '🐕'}</div>
                <h3 style="font-family: 'Sora', sans-serif; font-size: 1rem; font-weight: 600; color: white; margin: 0; padding: 0 1rem; text-align: center;">${this.escapeHtml(asset.name)}</h3>
                <div style="padding: 1rem; text-align: center; color: #00bcd4; font-family: 'Inter', sans-serif; font-size: 0.75rem;">
                    <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
                </div>
                <button class="mobile-like-button liked" data-asset-id="${asset._id}" style="position: absolute; top: 8px; right: 8px; background: rgba(0, 188, 212, 0.2); border: 2px solid #00bcd4; border-radius: 50%; width: 32px; height: 32px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px); color: #00bcd4; z-index: 10; touch-action: manipulation;">
                    <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            `}
        `;
        
        // Add hover effects
        assetCard.addEventListener('mouseenter', () => {
            assetCard.style.transform = 'translateY(-5px)';
            assetCard.style.background = 'rgba(30, 30, 30, 0.8)';
            assetCard.style.borderColor = 'rgba(0, 188, 212, 0.3)';
            assetCard.style.boxShadow = '0 10px 30px rgba(0, 188, 212, 0.2)';
        });
        
        assetCard.addEventListener('mouseleave', () => {
            assetCard.style.transform = 'translateY(0)';
            assetCard.style.background = 'rgba(20, 20, 20, 0.6)';
            assetCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            assetCard.style.boxShadow = 'none';
        });
        
        // Add click handler for viewing asset
        assetCard.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-like-button')) {
                this.viewAsset(asset._id);
            }
        });
        
        // Add like button handler - REQUIRES AUTHENTICATION
        const likeButton = assetCard.querySelector('.mobile-like-button');
        if (likeButton) {
            likeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLike(asset._id, asset.name);
            });
        }
        
        return assetCard;
    }

    async toggleLike(assetId, assetName) {
        const isAuthenticated = await this.checkAuthentication();
        if (!isAuthenticated) {
            console.log('❌ User not authenticated, showing login modal');
            // Store the pending like action for after login
            sessionStorage.setItem('pendingLikeAction', JSON.stringify({ assetId, assetName }));
            
            if (window.MobileAuth) {
                window.MobileAuth.showAuth('like', { assetId, assetName });
            } else if (window.authManager) {
                window.authManager.showLoginModal();
            }
            return;
        }
        
        try {
            const response = await fetch(`${this.getApiBaseUrl()}/auth/like-asset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ assetId: assetId })
            });
            
            if (!response.ok) throw new Error('Failed to update like status');
            
            const data = await response.json();
            const isLiked = data.isLiked;
            
            if (isLiked) {
                this.assetsData.likedAssets.add(assetId);
            } else {
                this.assetsData.likedAssets.delete(assetId);
            }
            
            // Update like button states
            document.querySelectorAll(`[data-asset-id="${assetId}"]`).forEach(button => {
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
            
            const message = isLiked 
                ? `Added "${assetName}" to your liked models ❤️` 
                : `Removed "${assetName}" from your liked models`;
            this.showFeedback(message, 'success');
            
            // Update account stats
            this.updateAccountStats();
            
        } catch (error) {
            console.error('❌ Like error:', error);
            this.showFeedback('Failed to update like status. Please try again.', 'error');
        }
    }

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

    showLikedModelsLoading() {
        this.hideLikedModelsStates();
        const loading = document.getElementById('likedModelsLoading');
        if (loading) loading.style.display = 'block';
    }

    showLikedModelsEmpty() {
        this.hideLikedModelsStates();
        const empty = document.getElementById('likedModelsEmpty');
        if (empty) empty.style.display = 'block';
    }

    showLikedModelsError() {
        this.hideLikedModelsStates();
        const error = document.getElementById('likedModelsError');
        if (error) error.style.display = 'block';
    }

    hideLikedModelsStates() {
        const states = ['likedModelsLoading', 'likedModelsEmpty', 'likedModelsError'];
        states.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
    }

    viewAsset(assetId) {
        console.log('🎯 Viewing asset:', assetId);
        // Create URL for view-asset page with mobile-friendly parameters
        const viewUrl = `view-asset.html?id=${assetId}&from=mobile-app`;
        window.location.href = viewUrl;
    }

    // Assets functionality methods (existing methods remain the same)
    getApiBaseUrl() {
        if (window.DALMA_CONFIG && window.DALMA_CONFIG.API_BASE_URL) {
            return window.DALMA_CONFIG.API_BASE_URL;
        } else if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
            return window.APP_CONFIG.API_BASE_URL;
        } else {
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
    }

    async checkAuthentication() {
        try {
            const response = await fetch(`${this.getApiBaseUrl()}/auth/me`, {
                method: 'GET',
                credentials: 'include'
            });
            return response.ok;
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    }

    async loadUserLikedAssets() {
        if (this.assetsData.isLoadingLikes) return;
        
        try {
            this.assetsData.isLoadingLikes = true;
            
            const isAuthenticated = await this.checkAuthentication();
            if (!isAuthenticated) {
                this.assetsData.likedAssets.clear();
                return;
            }
            
            const response = await fetch(`${this.getApiBaseUrl()}/auth/liked-assets`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                this.assetsData.likedAssets.clear();
                return;
            }
            
            const data = await response.json();
            const likedAssetsList = data.assets || [];
            
            this.assetsData.likedAssets.clear();
            likedAssetsList.forEach(asset => {
                this.assetsData.likedAssets.add(asset._id);
            });
            
            console.log('💖 Loaded', this.assetsData.likedAssets.size, 'liked assets');
            
        } catch (error) {
            console.error('❌ Error loading liked assets:', error);
            this.assetsData.likedAssets.clear();
        } finally {
            this.assetsData.isLoadingLikes = false;
        }
    }

    async loadAllAssets() {
        try {
            console.log('🔄 Loading public assets from API...');
            
            // Show loading state
            this.showAssetsLoading();
            
            const response = await fetch(`${this.getApiBaseUrl()}/assets?limit=20&sortBy=popularity&sortOrder=desc`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Assets loaded:', data.assets?.length || 0);
            this.assetsData.allAssets = data.assets || [];
            this.assetsData.filteredAssets = [...this.assetsData.allAssets];
            
            this.filterAndRenderAssets();
            
        } catch (error) {
            console.error('❌ Error loading assets:', error);
            this.showAssetsError();
        }
    }

    showAssetsLoading() {
        const grid = document.getElementById('mobileAssetsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: #00bcd4;">
                    <div style="width: 50px; height: 50px; border: 3px solid rgba(0, 188, 212, 0.2); border-top: 3px solid #00bcd4; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <p style="font-family: 'Sora', sans-serif; font-weight: 500;">Loading amazing 3D models...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    }

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
        
        assetCard.innerHTML = `
            ${imageUrl ? `
                <div class="asset-preview" style="width: 100%; height: 200px; position: relative; background: rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <div class="image-loading-placeholder" style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%); background-size: 200% 100%; animation: shimmer 2s infinite;"></div>
                    <img src="${imageUrl}" alt="${this.escapeHtml(asset.name)}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; background: #0a0a0a; opacity: 0; transition: opacity 0.3s ease;" 
                         onload="this.style.opacity='1'; this.parentElement.querySelector('.image-loading-placeholder').style.display='none';"
                         onerror="this.parentElement.innerHTML = '<div style=\\'font-size: 3rem; opacity: 0.6;\\'>${asset.icon || '🐕'}</div>';">
                    <button class="mobile-like-button ${isLiked ? 'liked' : ''}" data-asset-id="${asset._id}" style="position: absolute; top: 8px; right: 8px; background: rgba(0, 0, 0, 0.7); border: 2px solid rgba(0, 188, 212, 0.4); border-radius: 50%; width: 32px; height: 32px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px); color: rgba(0, 188, 212, 0.8); z-index: 10; touch-action: manipulation;">
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
            ` : `
                <div style="font-size: 3rem; opacity: 0.6; text-align: center; padding: 2rem;">${asset.icon || '🐕'}</div>
                <h3 style="font-family: 'Sora', sans-serif; font-size: 1rem; font-weight: 600; color: white; margin: 0; padding: 0 1rem; text-align: center;">${this.escapeHtml(asset.name)}</h3>
                <div style="padding: 1rem; text-align: center; color: #00bcd4; font-family: 'Inter', sans-serif; font-size: 0.75rem;">
                    <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
                </div>
                <button class="mobile-like-button ${isLiked ? 'liked' : ''}" data-asset-id="${asset._id}" style="position: absolute; top: 8px; right: 8px; background: rgba(0, 0, 0, 0.7); border: 2px solid rgba(0, 188, 212, 0.4); border-radius: 50%; width: 32px; height: 32px; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; backdrop-filter: blur(10px); color: rgba(0, 188, 212, 0.8); z-index: 10; touch-action: manipulation;">
                    <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            `}
        `;
        
        // Add hover effects
        assetCard.addEventListener('mouseenter', () => {
            assetCard.style.transform = 'translateY(-5px)';
            assetCard.style.background = 'rgba(30, 30, 30, 0.8)';
            assetCard.style.borderColor = 'rgba(0, 188, 212, 0.3)';
            assetCard.style.boxShadow = '0 10px 30px rgba(0, 188, 212, 0.2)';
        });
        
        assetCard.addEventListener('mouseleave', () => {
            assetCard.style.transform = 'translateY(0)';
            assetCard.style.background = 'rgba(20, 20, 20, 0.6)';
            assetCard.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            assetCard.style.boxShadow = 'none';
        });
        
        // Add click handler for viewing asset
        assetCard.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-like-button')) {
                this.viewAsset(asset._id);
            }
        });
        
        // Add like button handler - REQUIRES AUTHENTICATION
        const likeButton = assetCard.querySelector('.mobile-like-button');
        if (likeButton) {
            likeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLike(asset._id, asset.name);
            });
        }
        
        return assetCard;
    }

    showAssetsError() {
        const grid = document.getElementById('mobileAssetsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: rgba(255, 255, 255, 0.6);">
                    <div style="font-size: 3rem; margin-bottom: 1rem; color: #dc3545;">⚠️</div>
                    <h3 style="color: white; margin-bottom: 0.5rem; font-family: 'Sora', sans-serif;">Error Loading Assets</h3>
                    <p style="margin-bottom: 1.5rem;">Failed to load models. Please try again.</p>
                    <button onclick="window.AppNavigation.loadAllAssets()" style="background: #00bcd4; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-family: 'Sora', sans-serif; font-weight: 600;">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    setupBasicGenerate() {
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                alert('Generate functionality will be connected to your existing generate.js system');
            });
        }
    }

    updateAccountStats() {
        const creditsCount = document.getElementById('accountCreditsCount');
        const modelsCount = document.getElementById('accountModelsCount');
        
        if (creditsCount && window.MobileMonetization) {
            creditsCount.textContent = window.MobileMonetization.getUserCredits();
        } else if (creditsCount) {
            creditsCount.textContent = '10';
        }
        
        if (modelsCount) {
            modelsCount.textContent = this.assetsData.likedAssets.size.toString();
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            if (window.authManager && window.authManager.logout) {
                window.authManager.logout();
            } else {
                localStorage.removeItem('user');
                sessionStorage.removeItem('user');
            }
            
            this.updateAccountNavLabel(null);
            this.updateTopBarAccountButton();
            this.navigateToSection('home');
            
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }

    async reloadSection(sectionName) {
        this.loadedSections.delete(sectionName);
        await this.loadSectionContent(sectionName);
    }

    // Utility functions
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

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
}

// Initialize app navigation
window.AppNavigation = new AppNavigation();

// Make sure to update account button when everything is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.AppNavigation && window.AppNavigation.updateTopBarAccountButton) {
            window.AppNavigation.updateTopBarAccountButton();
        }
    }, 1000);
});

// Also update on window load
window.addEventListener('load', () => {
    if (window.AppNavigation && window.AppNavigation.updateTopBarAccountButton) {
        window.AppNavigation.updateTopBarAccountButton();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppNavigation;
}