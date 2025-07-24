// app-navigation.js - DALMA AI Mobile App Navigation
// Updated version with properly styled home section and streamlined about content

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
        this.loadSectionContent('home');
        
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

        // Hide all sections first
        document.querySelectorAll('.app-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none'; // Force hide
        });

        // Load content if not already loaded
        if (!this.loadedSections.has(sectionName)) {
            await this.loadSectionContent(sectionName);
        }

        // Show new section
        setTimeout(() => {
            sectionElement.style.display = 'block'; // Force show
            sectionElement.classList.add('active');
            
            // Scroll to top of new section
            sectionElement.scrollTop = 0;
            
            console.log(`✅ Section displayed: ${sectionName}`);
        }, 50);
    }

    async loadSectionContent(sectionName) {
        const sectionElement = document.getElementById(`${sectionName}Section`);
        
        if (!sectionElement) {
            console.error(`❌ Section element not found: ${sectionName}Section`);
            return;
        }

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
            
            // Debug log for about section
            if (sectionName === 'about') {
                console.log('📄 About content loaded, innerHTML length:', sectionElement.innerHTML.length);
                console.log('📏 Section dimensions:', {
                    width: sectionElement.offsetWidth,
                    height: sectionElement.offsetHeight,
                    display: window.getComputedStyle(sectionElement).display
                });
            }
            
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
        // Updated home content with your current layout
        return `
            <!-- Hero Section -->
            <section class="hero">
                <div class="geometric-pattern"></div>
                <div class="hero-3d" id="appHero3d">
                    <!-- 3D Dog Model will be rendered here -->
                </div>
                <div class="hero-content" style="padding: 0.5rem; padding-top: 0.25rem;">
                    <div class="hero-text">
                        <h2 class="hero-title" style="margin-bottom: 0.4rem; line-height: 1.05;">From picture to<br>3D with ease!</h2>
                        <p class="hero-subtitle" style="margin-bottom: 1rem; line-height: 1.1; font-size: 0.8rem;">Within a few clicks of a button you can generate, rig and animate your own, ready to use 3D model!</p>
                        <button class="cta-button" onclick="window.AppNavigation.navigateToSection('generate')">GENERATE</button>
                    </div>
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
        // Check if user is authenticated
        const isAuthenticated = window.authManager?.isAuthenticated();
        
        if (!isAuthenticated) {
            // Show login prompt for non-authenticated users
            return `
                <div class="account-section" style="padding: 2rem 1rem; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1.5rem;">🔒</div>
                    <h2 style="font-family: 'Sora', sans-serif; color: white; margin-bottom: 1rem;">Account Access Required</h2>
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 2rem;">Please log in to access your account settings and view your models.</p>
                    <button onclick="window.authManager.showLoginModal()" 
                            style="background: #00bcd4; color: white; border: none; padding: 1rem 2rem; border-radius: 50px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;">
                        Login
                    </button>
                </div>
            `;
        }
        
        // Original account content for authenticated users
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
                    
                    <button onclick="window.AppNavigation.handleLogout()" 
                            style="background: rgba(220,53,69,0.1); border: 1px solid rgba(220,53,69,0.3); border-radius: 12px; padding: 1rem; color: #dc3545; text-align: left; font-family: 'Sora', sans-serif; cursor: pointer; transition: all 0.3s ease;">
                        🚪 Logout
                    </button>
                </div>
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
                <div style="position: relative; z-index: 1; padding: 1rem; padding-bottom: 6rem; min-height: 100%;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 2rem; padding-top: 1rem;">
                        <h1 style="font-family: 'Sora', sans-serif; font-size: 2.5rem; font-weight: 700; color: white; margin-bottom: 0.5rem; text-shadow: 0 0 30px rgba(0,188,212,0.5);">About Threely</h1>
                        <p style="color: rgba(255,255,255,0.8); font-size: 1rem; line-height: 1.4; max-width: 500px; margin: 0 auto;">Transform any picture into a professional 3D model with cutting-edge AI technology.</p>
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
                                    <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.3;">Take or select a clear picture of any object</p>
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
                                <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; line-height: 1.4;">Let your imagination come to reality. Our AI is trained to generate any model.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Contact -->
                    <div style="text-align: center; padding: 2rem 0;">
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
        // Wait a bit for DOM to be fully ready
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
        // Load all the generate page scripts
        console.log('🎯 Initializing generate section...');
        
        // Wait for DOM to be ready then initialize generate functionality
        setTimeout(() => {
            if (window.initGenerate && typeof window.initGenerate === 'function') {
                window.initGenerate();
            } else {
                console.log('⚠️ initGenerate function not available, setting up basic functionality');
                this.setupBasicGenerate();
            }
        }, 200);
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

    setupBasicGenerate() {
        // Basic generate setup if the main script isn't available
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                alert('Generate functionality will be connected to your existing generate.js system');
            });
        }
    }

    async initializeAssets() {
        // Load assets from API
        console.log('🎯 Initializing assets section...');
        await this.loadAllAssets();
    }

    async initializeAccount() {
        // Update account stats
        console.log('🎯 Initializing account section...');
        this.updateAccountStats();
    }

    async loadAllAssets() {
        const grid = document.getElementById('allAssetsGrid');
        if (!grid) return;

        try {
            // Show loading state
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #00bcd4;">
                    <div class="section-loading-spinner" style="width: 40px; height: 40px; margin: 0 auto 1rem;"></div>
                    <p>Loading your models...</p>
                </div>
            `;

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // This would normally fetch from your API
            // For now, show placeholder content
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 2rem; color: rgba(255,255,255,0.6);">
                    <div style="font-size: 4rem; margin-bottom: 1.5rem;">🔍</div>
                    <h3 style="color: white; margin-bottom: 1rem; font-family: 'Sora', sans-serif;">No Models Yet</h3>
                    <p style="margin-bottom: 2rem; line-height: 1.6;">Start creating your first 3D dog model by uploading a photo!</p>
                    <button onclick="window.AppNavigation.navigateToSection('generate')" 
                            style="background: #00bcd4; color: white; border: none; padding: 1rem 2rem; border-radius: 8px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                        Create First Model
                    </button>
                </div>
            `;
        } catch (error) {
            console.error('Error loading assets:', error);
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc3545;">
                    <p>Error loading models</p>
                </div>
            `;
        }
    }

    updateAccountStats() {
        // Update credits count
        const creditsCount = document.getElementById('accountCreditsCount');
        const modelsCount = document.getElementById('accountModelsCount');
        
        if (creditsCount && window.MobileMonetization) {
            creditsCount.textContent = window.MobileMonetization.getUserCredits();
        } else if (creditsCount) {
            creditsCount.textContent = '10'; // Default value
        }
        
        if (modelsCount) {
            // This would normally come from user data
            modelsCount.textContent = '0';
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