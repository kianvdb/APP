// app-navigation.js - DALMA AI Mobile App Navigation
// Handles section switching, content loading, and smooth transitions
// Based on the existing page-navigation.js structure

class AppNavigation {
    constructor() {
        this.currentSection = 'home';
        this.sections = ['home', 'generate', 'assets', 'account', 'about'];
        this.loadedSections = new Set();
        this.sectionContent = {};
        
        console.log('🚀 AppNavigation initialized');
    }

    init() {
        console.log('🎯 Setting up app navigation...');
        
        this.setupBottomNavigation();
        this.loadSection('home'); // Load home section by default
        
        console.log('✅ App navigation ready');
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

    async showSection(sectionName) {
        const sectionElement = document.getElementById(`${sectionName}Section`);
        
        if (!sectionElement) {
            console.error(`❌ Section not found: ${sectionName}`);
            return;
        }

        // Hide current section
        const currentSectionElement = document.querySelector('.app-section.active');
        if (currentSectionElement) {
            currentSectionElement.classList.remove('active');
            currentSectionElement.classList.add('prev');
        }

        // Load content if not already loaded
        if (!this.loadedSections.has(sectionName)) {
            await this.loadSectionContent(sectionName);
        }

        // Show new section
        setTimeout(() => {
            sectionElement.classList.remove('prev');
            sectionElement.classList.add('active');
            
            // Clean up prev class from other sections
            setTimeout(() => {
                document.querySelectorAll('.app-section.prev').forEach(section => {
                    section.classList.remove('prev');
                });
            }, 400);
        }, 50);
    }

    async loadSectionContent(sectionName) {
        const sectionElement = document.getElementById(`${sectionName}Section`);
        
        if (!sectionElement) return;

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
        // Load homepage content without the header/footer
        return `
            <!-- Hero Section -->
            <section class="hero">
                <div class="geometric-pattern"></div>
                <div class="hero-content">
                    <div class="hero-text">
                        <h2 class="hero-title">Generate 3D dog assets with ease!</h2>
                        <p class="hero-subtitle">Within a few clicks of a button you can generate, rig and animate your own, ready to use dog model!</p>
                        <button class="cta-button" onclick="window.AppNavigation.navigateToSection('generate')">Generate</button>
                    </div>
                    <div class="hero-3d" id="hero3d">
                        <!-- 3D Dog Model will be rendered here -->
                    </div>
                </div>
            </section>

            <!-- Recent Assets Preview -->
            <section class="assets-section" style="padding: 3rem 1rem;">
                <div class="assets-header">
                    <h2 class="assets-title">Featured Models</h2>
                    <button class="cta-button" onclick="window.AppNavigation.navigateToSection('assets')" 
                            style="padding: 0.6rem 1.2rem; font-size: 0.9rem;">View All</button>
                </div>
                <div class="assets-grid" id="featuredAssetsGrid">
                    <!-- Featured assets will be loaded here -->
                </div>
            </section>
        `;
    }

    async loadGenerateContent() {
        // Load generate page content without the header/footer - using existing generate interface
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
            <div class="assets-section" style="padding: 1rem;">
                <div class="assets-header">
                    <h2 class="assets-title">3D Dog Models</h2>
                    <div class="assets-search">
                        <svg class="assets-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <input type="text" class="assets-search-input" placeholder="Search models..." id="assetSearchInput">
                    </div>
                </div>
                
                <div class="assets-grid" id="allAssetsGrid">
                    <!-- All assets will be loaded here -->
                </div>
            </div>
        `;
    }

    async loadAccountContent() {
        return `
            <div class="account-section" style="padding: 2rem 1rem;">
                <div class="account-header" style="text-align: center; margin-bottom: 2rem;">
                    <h2 style="font-family: 'Sora', sans-serif; color: white; margin-bottom: 0.5rem;">Account</h2>
                    <p style="color: rgba(255,255,255,0.7);">Manage your profile and preferences</p>
                </div>

                <div class="account-stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1.5rem; text-align: center;">
                        <div style="font-size: 2rem; color: #00bcd4; margin-bottom: 0.5rem;" id="accountCreditsCount">0</div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">Credits</div>
                    </div>
                    <div style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1.5rem; text-align: center;">
                        <div style="font-size: 2rem; color: #00bcd4; margin-bottom: 0.5rem;" id="accountModelsCount">0</div>
                        <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">Models Created</div>
                    </div>
                </div>

                <div class="account-menu" style="display: flex; flex-direction: column; gap: 1rem;">
                    <button onclick="window.AppNavigation.navigateToSection('assets')" 
                            style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem; color: white; text-align: left; font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.3s ease;">
                        💖 My Liked Models
                    </button>
                    
                    <button onclick="window.MobileMonetization.showPricingModal()" 
                            style="background: rgba(0,188,212,0.1); border: 1px solid rgba(0,188,212,0.3); border-radius: 12px; padding: 1rem; color: #00bcd4; text-align: left; font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.3s ease;">
                        💳 Buy More Credits
                    </button>
                    
                    <button style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem; color: white; text-align: left; font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.3s ease;">
                        ⚙️ Settings
                    </button>
                    
                    <button onclick="this.handleLogout()" 
                            style="background: rgba(220,53,69,0.1); border: 1px solid rgba(220,53,69,0.3); border-radius: 12px; padding: 1rem; color: #dc3545; text-align: left; font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.3s ease;">
                        🚪 Logout
                    </button>
                </div>
            </div>
        `;
    }

    async loadAboutContent() {
        return `
            <!-- About Hero Section -->
            <section class="about-hero" style="min-height: 60vh; background: linear-gradient(135deg, rgba(0, 188, 212, 0.05) 0%, rgba(0, 0, 0, 0) 100%); position: relative; padding: 4rem 2rem;">
                <div class="hero-bg-animation">
                    <div class="glow-orb orb-1"></div>
                    <div class="glow-orb orb-2"></div>
                    <div class="glow-orb orb-3"></div>
                </div>
                <div class="hero-content about-hero-content">
                    <div class="hero-text-full">
                        <span class="hero-badge">Transforming Ideas into Reality</span>
                        <h1 class="hero-title">Pioneering AI-Driven 3D Creation</h1>
                        <p class="hero-subtitle">At Dalma AI, we're on a mission to democratize 3D content creation. Our cutting-edge technology transforms simple photographs into professional-grade 3D models.</p>
                        <div class="hero-stats">
                            <div class="stat-item">
                                <span class="stat-number">50K+</span>
                                <span class="stat-label">Models Created</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">5 Min</span>
                                <span class="stat-label">Average Generation Time</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">98%</span>
                                <span class="stat-label">Customer Satisfaction</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Features Section -->
            <section class="about-section" style="padding: 3rem 1rem;">
                <div class="section-container">
                    <h2 class="section-title">Why Choose Dalma AI?</h2>
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">⚡</div>
                            <h3>Lightning Fast</h3>
                            <p>From photo to 3D model in under 5 minutes</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🎮</div>
                            <h3>Game Ready</h3>
                            <p>Industry-standard formats (GLB, FBX, OBJ, USDZ)</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🎨</div>
                            <h3>Customizable</h3>
                            <p>Control topology, polycount, textures, and PBR</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🌟</div>
                            <h3>No Experience Required</h3>
                            <p>Intuitive interface for everyone</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- FAQ Section -->
            <section class="faq-section" style="padding: 3rem 1rem; background: rgba(255, 255, 255, 0.02);">
                <div class="section-container">
                    <h2 class="section-title">Frequently Asked Questions</h2>
                    <div class="faq-container">
                        <div class="faq-item">
                            <h3>What image formats does Dalma AI accept?</h3>
                            <p>We support JPG, PNG, and WEBP formats up to 10MB. For best results, use clear, well-lit photos with the dog as the main subject.</p>
                        </div>
                        <div class="faq-item">
                            <h3>Can I use the generated models commercially?</h3>
                            <p>Yes! All models generated with purchased credits include a commercial license for use in games, animations, and other projects.</p>
                        </div>
                        <div class="faq-item">
                            <h3>What 3D formats can I export?</h3>
                            <p>Dalma AI supports GLB, FBX, OBJ, and USDZ formats, compatible with all major 3D software and game engines.</p>
                        </div>
                    </div>
                </div>
            </section>
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
                // About section is mostly static, no special initialization needed
                break;
        }
    }

    async initializeHome() {
        // Initialize 3D viewer if needed
        if (window.init3D && typeof window.init3D === 'function') {
            setTimeout(() => {
                window.init3D();
            }, 100);
        }

        // Load featured assets
        await this.loadFeaturedAssets();
    }

    async initializeGenerate() {
        // Load all the generate page scripts
        if (window.initGenerate && typeof window.initGenerate === 'function') {
            setTimeout(() => {
                window.initGenerate();
            }, 100);
        }
    }

    async initializeAssets() {
        // Load assets from API
        await this.loadAllAssets();
    }

    async initializeAccount() {
        // Update account stats
        this.updateAccountStats();
    }

    async loadFeaturedAssets() {
        const grid = document.getElementById('featuredAssetsGrid');
        if (!grid) return;

        try {
            // This would normally fetch from your API
            // For now, show placeholder
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🐕</div>
                    <p>Featured models will be loaded here</p>
                </div>
            `;
        } catch (error) {
            console.error('Error loading featured assets:', error);
        }
    }

    async loadAllAssets() {
        const grid = document.getElementById('allAssetsGrid');
        if (!grid) return;

        try {
            // This would normally fetch from your API
            // For now, show placeholder
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <p>All assets will be loaded here</p>
                </div>
            `;
        } catch (error) {
            console.error('Error loading assets:', error);
        }
    }

    updateAccountStats() {
        // Update credits count
        const creditsCount = document.getElementById('accountCreditsCount');
        const modelsCount = document.getElementById('accountModelsCount');
        
        if (creditsCount && window.MobileMonetization) {
            creditsCount.textContent = window.MobileMonetization.getUserCredits();
        }
        
        if (modelsCount) {
            // This would normally come from user data
            modelsCount.textContent = '12';
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            // Handle logout
            if (window.authManager && window.authManager.logout) {
                window.authManager.logout();
            } else {
                localStorage.removeItem('user');
                sessionStorage.removeItem('user');
                // Refresh the app
                window.location.reload();
            }
        }
    }

    async reloadSection(sectionName) {
        this.loadedSections.delete(sectionName);
        await this.loadSectionContent(sectionName);
    }
}

// Initialize app navigation
window.AppNavigation = new AppNavigation();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppNavigation;
}