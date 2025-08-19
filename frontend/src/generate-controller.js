class GenerateController {
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.generateState = {
            currentView: 'form',
            selectedImage: null,
            settings: {
                symmetryMode: 'auto',
                topology: 'triangle',
                targetPolycount: 30000,
                shouldTexture: true,
                enablePBR: false
            },
            taskId: null,
            progress: 0,
            status: null,
            adsWatched: 0,
            generatedModelData: null,
            downloadFormats: ['glb', 'usdz', 'obj', 'fbx']
        };
        
        this.progressInterval = null;
        this.dogFactInterval = null;
        this.dogFacts = [];
        this.startTime = null;
    }

    setupGenerateEventListeners() {
    // Image upload
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    
    if (uploadArea && imageInput) {
        // Remove old listeners to prevent duplicates
        const newUploadArea = uploadArea.cloneNode(true);
        uploadArea.parentNode.replaceChild(newUploadArea, uploadArea);
        
        // Re-get the element after replacement
        const uploadAreaNew = document.getElementById('uploadArea');
        const imageInputNew = document.getElementById('imageInput');
        
        uploadAreaNew.addEventListener('click', (e) => {
            // Don't trigger if clicking on change button
            if (!e.target.closest('.change-image-btn')) {
                // Reset input before clicking to ensure it works
                imageInputNew.value = '';
                imageInputNew.click();
            }
        });
        
        imageInputNew.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // More thorough file type check
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
                if (validTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/')) {
                    this.handleImageUpload(file);
                } else {
                    this.showPremiumError('Please select a valid image file (JPG, PNG, WEBP)');
                    imageInputNew.value = ''; // Clear invalid selection
                }
            }
        });
        
        // Drag and drop (works on desktop, limited on mobile)
        uploadAreaNew.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadAreaNew.classList.add('drag-over');
        });
        
        uploadAreaNew.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadAreaNew.classList.remove('drag-over');
        });
        
        uploadAreaNew.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadAreaNew.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files[0];
                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
                if (validTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/')) {
                    // Reset input and handle upload
                    imageInputNew.value = '';
                    this.handleImageUpload(file);
                } else {
                    this.showPremiumError('Please select a valid image file (JPG, PNG, WEBP)');
                }
            }
        });
    }
    
    // Change image button with improved handling
    setTimeout(() => {
        const changeImageBtn = document.getElementById('changeImageBtn');
        if (changeImageBtn) {
            // Remove old listener if exists
            const newChangeBtn = changeImageBtn.cloneNode(true);
            changeImageBtn.parentNode.replaceChild(newChangeBtn, changeImageBtn);
            
            document.getElementById('changeImageBtn').addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const imageInput = document.getElementById('imageInput');
                if (imageInput) {
                    imageInput.value = ''; // Reset before clicking
                    imageInput.click();
                }
            });
        }
    }, 100);
    
    // Settings toggle
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsSection = settingsToggle?.closest('.settings-section');
    const settingsContent = document.getElementById('settingsContent');
    const settingsSummary = document.getElementById('settingsSummary');

    if (settingsToggle && settingsSection) {
        settingsToggle.addEventListener('click', () => {
            const isExpanded = settingsSection.classList.contains('expanded');
            
            if (isExpanded) {
                settingsSection.classList.remove('expanded');
                settingsContent.style.display = 'none';
            } else {
                settingsSection.classList.add('expanded');
                settingsContent.style.display = 'block';
            }
        });
    }

    this.updateSettingsSummary = () => {
    if (settingsSummary) {
        const polycount = this.generateState.settings.targetPolycount;
        let polycountDisplay;
        
        // Better formatting for different ranges
        if (polycount >= 1000) {
            // Show as "30K" for round thousands, "30.5K" for in-between
            polycountDisplay = (polycount / 1000).toFixed(polycount % 1000 === 0 ? 0 : 1) + 'K';
        } else {
            // Show exact number for values under 1000
            polycountDisplay = polycount.toString();
        }
        
        const texture = this.generateState.settings.shouldTexture ? 'Textured' : 'No Texture';
        const pbr = this.generateState.settings.enablePBR ? ' + PBR' : '';
        settingsSummary.textContent = `${polycountDisplay} polys, ${texture}${pbr}`.trim();
    }
};

    // Initial summary update
    this.updateSettingsSummary();
    
    // Toggle buttons
    document.querySelectorAll('.toggle-group').forEach(group => {
        const buttons = group.querySelectorAll('.toggle-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update settings based on parent control
                const parentSection = btn.closest('.settings-item');
                const label = parentSection?.querySelector('.settings-item-label')?.textContent || 
                             btn.closest('.control-section')?.querySelector('.control-label')?.textContent || '';
                
                if (label.includes('Symmetry')) {
                    this.generateState.settings.symmetryMode = btn.dataset.value;
                } else if (label.includes('Topology')) {
                    this.generateState.settings.topology = btn.dataset.value;
                } else if (label.includes('Texture')) {
                    this.generateState.settings.shouldTexture = btn.dataset.value === 'true';
                    
                    // Show/hide PBR section based on texture setting
                    const pbrSection = document.getElementById('pbrSection');
                    if (pbrSection) {
                        if (this.generateState.settings.shouldTexture) {
                            pbrSection.style.display = 'block';
                            pbrSection.style.opacity = '1';
                            pbrSection.style.transform = 'translateY(0)';
                        } else {
                            pbrSection.style.display = 'none';
                            pbrSection.style.opacity = '0';
                            pbrSection.style.transform = 'translateY(-10px)';
                            // Also uncheck PBR when hiding
                            this.generateState.settings.enablePBR = false;
                            const pbrCheckbox = document.getElementById('pbrCheckbox');
                            if (pbrCheckbox) {
                                pbrCheckbox.checked = false;
                            }
                        }
                    }
                }
                
                // Update summary after any toggle change
                this.updateSettingsSummary();
            });
        });
    });
    
    // Polycount slider
    const polycountSlider = document.getElementById('polycountSlider');
    const polycountValue = document.getElementById('polycountValue');
    
    if (polycountSlider && polycountValue) {
        polycountSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            polycountValue.textContent = value.toLocaleString();
            this.generateState.settings.targetPolycount = value;
            // Update summary after polycount change
            this.updateSettingsSummary();
        });
    }
    
    // PBR checkbox
    const pbrCheckbox = document.getElementById('pbrCheckbox');
    if (pbrCheckbox) {
        pbrCheckbox.addEventListener('change', (e) => {
            this.generateState.settings.enablePBR = e.target.checked;
            // Update summary after PBR change
            this.updateSettingsSummary();
        });
    }
    
    // Generate button
    const generateBtn = document.getElementById('generateModelBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => this.handleGenerate());
    }
    
    // Watch ad button
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn) {
        watchAdBtn.addEventListener('click', () => this.handleWatchAd());
    }
    
    // Viewer state buttons
    const downloadBtn = document.getElementById('downloadBtn');
    const exportBtn = document.getElementById('exportBtn');
    const rigBtn = document.getElementById('rigBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const newModelBtn = document.getElementById('newModelBtn');
    
    if (downloadBtn) downloadBtn.addEventListener('click', () => this.handleDownload());
    if (exportBtn) exportBtn.addEventListener('click', () => this.handleExport());
    if (rigBtn) rigBtn.addEventListener('click', () => this.handleRigAnimate());
    if (favoriteBtn) favoriteBtn.addEventListener('click', () => this.handleSaveToFavorites());
    if (newModelBtn) newModelBtn.addEventListener('click', () => this.resetToForm());
}
// REPLACE the setupViewerEventListeners() method in generate-controller.js (around line 280)

setupViewerEventListeners() {
    console.log('🎮 Setting up viewer event listeners...');
    
    // Options dropdown toggle
    const optionsDropdownBtn = document.getElementById('optionsDropdownBtn');
    const optionsDropdownMenu = document.getElementById('optionsDropdownMenu');
    
    if (optionsDropdownBtn && optionsDropdownMenu) {
        console.log('✅ Found dropdown elements:', {
            button: optionsDropdownBtn,
            menu: optionsDropdownMenu
        });
        
        // Remove old event listeners if they exist
        const newBtn = optionsDropdownBtn.cloneNode(true);
        optionsDropdownBtn.parentNode.replaceChild(newBtn, optionsDropdownBtn);
        
        const dropdownBtn = document.getElementById('optionsDropdownBtn');
        const dropdownMenu = document.getElementById('optionsDropdownMenu');
        
        // Remove inline onclick from HTML and use addEventListener instead
        dropdownBtn.removeAttribute('onclick');
        
        // Toggle dropdown on button click
        dropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Dropdown button clicked');
            
            const isOpen = dropdownMenu.classList.contains('show');
            console.log('📊 Current state - isOpen:', isOpen);
            
            if (isOpen) {
                // Close dropdown
                console.log('📦 Closing dropdown');
                dropdownMenu.classList.remove('show');
                dropdownBtn.classList.remove('active');
            } else {
                // Open dropdown
                console.log('📂 Opening dropdown');
                dropdownMenu.classList.add('show');
                dropdownBtn.classList.add('active');
            }
            
            console.log('✅ Classes after toggle:', {
                menuClasses: dropdownMenu.className,
                buttonClasses: dropdownBtn.className
            });
        });
        
        // Close dropdown when clicking outside
        const closeDropdown = (e) => {
            console.log('🌍 Document clicked, checking if should close dropdown');
            if (!e.target.closest('.options-dropdown-container')) {
                console.log('👆 Clicked outside dropdown, closing');
                dropdownMenu.classList.remove('show');
                dropdownBtn.classList.remove('active');
            }
        };
        
        // Remove old listener if exists and add new one
        document.removeEventListener('click', closeDropdown);
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 100);
        
        // Setup option items
        const optionItems = dropdownMenu.querySelectorAll('.option-item');
        optionItems.forEach(item => {
            // Clone to remove old listeners
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
        });
        
        // Re-query and add listeners
        dropdownMenu.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('📋 Option selected:', item.textContent.trim());
                
                // Get the button id to determine which action to take
                const itemId = item.id;
                console.log('🆔 Item ID:', itemId);
                
                // Close dropdown after action
                setTimeout(() => {
                    dropdownMenu.classList.remove('show');
                    dropdownBtn.classList.remove('active');
                    console.log('✅ Dropdown closed after option selection');
                }, 100);
            });
        });
        
        console.log('✅ Dropdown event listeners setup complete');
    } else {
        console.error('❌ Dropdown elements not found:', {
            button: !!optionsDropdownBtn,
            menu: !!optionsDropdownMenu
        });
    }
    
    // Viewer state buttons (now in dropdown)
    const downloadBtn = document.getElementById('downloadBtn');
    const exportBtn = document.getElementById('exportBtn');
    const rigBtn = document.getElementById('rigBtn');
    const favoriteBtn = document.getElementById('favoriteBtn');
    const newModelBtn = document.getElementById('newModelBtn');
    
    if (downloadBtn) {
        console.log('📥 Setting up download button');
        downloadBtn.addEventListener('click', () => {
            console.log('📥 Download button clicked');
            this.handleDownload();
        });
    }
    
    if (exportBtn) {
        console.log('📤 Setting up export button');
        exportBtn.addEventListener('click', () => {
            console.log('📤 Export button clicked');
            this.handleExport();
        });
    }
    
    if (rigBtn) {
        console.log('🦴 Setting up rig button');
        rigBtn.addEventListener('click', () => {
            console.log('🦴 Rig button clicked');
            this.handleRigAnimate();
        });
    }
    
    if (favoriteBtn) {
        console.log('❤️ Setting up favorite button');
        favoriteBtn.addEventListener('click', () => {
            console.log('❤️ Favorite button clicked');
            this.handleSaveToFavorites();
        });
    }
    
    if (newModelBtn) {
        console.log('➕ Setting up new model button');
        newModelBtn.addEventListener('click', () => {
            console.log('➕ New model button clicked');
            this.resetToForm();
        });
    }
    
    console.log('✅ All viewer event listeners setup complete');
}

// ADD this method if it doesn't exist (for backwards compatibility)
toggleOptionsDropdown() {
    console.log('🔄 toggleOptionsDropdown called');
    const dropdownBtn = document.getElementById('optionsDropdownBtn');
    const dropdownMenu = document.getElementById('optionsDropdownMenu');
    
    if (dropdownBtn && dropdownMenu) {
        const isOpen = dropdownMenu.classList.contains('show');
        console.log('📊 Toggle state - isOpen:', isOpen);
        
        if (isOpen) {
            dropdownMenu.classList.remove('show');
            dropdownBtn.classList.remove('active');
            console.log('📦 Closed via toggle method');
        } else {
            dropdownMenu.classList.add('show');
            dropdownBtn.classList.add('active');
            console.log('📂 Opened via toggle method');
        }
    } else {
        console.error('❌ Dropdown elements not found in toggle method');
    }
}

// UPDATE the existing switchToViewerState() method (around line 900)
switchToViewerState() {
    console.log('🎬 Switching to viewer state');
    
    const loadingState = document.getElementById('generateLoadingState');
    const viewerState = document.getElementById('generateViewerState');
    
    if (loadingState) {
        loadingState.style.display = 'none';
        console.log('✅ Loading state hidden');
    }
    
    if (viewerState) {
        viewerState.style.display = 'flex';
        console.log('✅ Viewer state shown');
    }
    
    this.generateState.currentView = 'viewer';
    
    // Setup viewer-specific event listeners with a delay to ensure DOM is ready
    setTimeout(() => {
        console.log('⏱️ Setting up viewer event listeners after delay');
        this.setupViewerEventListeners();
    }, 100);
}

// UPDATE the existing switchToViewerState() method (around line 900)
// Replace the existing method with this updated version:
switchToViewerState() {
    const loadingState = document.getElementById('generateLoadingState');
    const viewerState = document.getElementById('generateViewerState');
    
    if (loadingState) loadingState.style.display = 'none';
    if (viewerState) viewerState.style.display = 'flex';
    
    this.generateState.currentView = 'viewer';
    
    // Setup viewer-specific event listeners
    setTimeout(() => {
        this.setupViewerEventListeners();
    }, 100);
}

    handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        this.generateState.selectedImage = file;
        
        // Get elements
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const uploadPreview = document.getElementById('uploadPreview');
        const previewImage = document.getElementById('previewImage');
        
        console.log('🖼️ Image upload elements:', {
            placeholder: !!uploadPlaceholder,
            preview: !!uploadPreview,
            image: !!previewImage
        });
        
        if (uploadPlaceholder && uploadPreview && previewImage) {
            // Set image source first
            previewImage.src = e.target.result;
            
            // Wait for image to load
            previewImage.onload = () => {
                console.log('✅ Image loaded successfully');
                // Hide placeholder and show preview
                uploadPlaceholder.style.display = 'none';
                uploadPreview.style.display = 'block'; // This will make it visible
                
                // Also ensure the preview is visible (in case CSS has issues)
                uploadPreview.style.visibility = 'visible';
                uploadPreview.style.opacity = '1';
            };
            
            previewImage.onerror = () => {
                console.error('❌ Image failed to load');
                this.showPremiumError('Failed to load image. Please try another.');
                // Reset to placeholder on error
                uploadPlaceholder.style.display = 'flex';
                uploadPreview.style.display = 'none';
                uploadPreview.style.visibility = 'hidden';
                uploadPreview.style.opacity = '0';
            };
        } else {
            console.error('❌ Missing upload elements:', {
                placeholder: !!uploadPlaceholder,
                preview: !!uploadPreview, 
                image: !!previewImage
            });
        }
    };
    
    reader.onerror = () => {
        console.error('❌ Failed to read file');
        this.showPremiumError('Failed to read file. Please try again.');
    };
    
    reader.readAsDataURL(file);
}



    async handleGenerate() {
        if (!this.generateState.selectedImage) {
            this.showPremiumError('Please upload an image first');
            return;
        }
        
        // Check credits with monetization system
        if (!window.MobileMonetization.beforeGenerate()) {
            return;
        }
        
        // Switch to loading state
        this.switchToLoadingState();
        
        // Start actual generation
        await this.startGeneration();
    }

    async startGeneration() {
        try {
            const formData = new FormData();
            formData.append('image', this.generateState.selectedImage);
            
            // Send settings with backend expected field names
            formData.append('symmetryMode', this.generateState.settings.symmetryMode);
            formData.append('topology', this.generateState.settings.topology);
            formData.append('targetPolycount', this.generateState.settings.targetPolycount.toString());
            formData.append('shouldTexture', this.generateState.settings.shouldTexture.toString());
            formData.append('enablePBR', this.generateState.settings.enablePBR.toString());
            
            // Use the correct endpoint from your backend
            const response = await fetch(`${this.apiBaseUrl}/generateModel`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to start generation');
            }
            
            const data = await response.json();
            this.generateState.taskId = data.taskId;
            
            console.log('🚀 Generation started:', data.taskId);
            
            // Start polling for progress
            this.startProgressPolling();
            
        } catch (error) {
            console.error('❌ Generation error:', error);
            this.showPremiumError('Something went wrong. Please try again later.');
            window.MobileMonetization.onGenerationError(error.message);
            this.resetToForm();
        }
    }

  startProgressPolling() {
    // Initial UI update
    this.updateProgressUI(0, 'Initializing...');
    
    this.progressInterval = setInterval(async () => {
        try {
            const response = await fetch(`${this.apiBaseUrl}/status/${this.generateState.taskId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to get status');
            }
            
            const data = await response.json();
            console.log('📊 Status update:', data);
            
            // Extract status and REAL progress from API
            const status = data.status;
            const apiProgress = data.progress || 0;
            
            // Use the actual progress from API
            let actualProgress = apiProgress;
            let statusMessage = 'Processing...';
            
            switch(status) {
                case 'PENDING':
                    actualProgress = Math.max(5, apiProgress);
                    statusMessage = 'Starting generation...';
                    break;
                    
                case 'IN_PROGRESS':
                    actualProgress = apiProgress;
                    
                    // Dynamic status messages based on real progress
                    if (actualProgress < 20) {
                        statusMessage = 'Analyzing your image...';
                    } else if (actualProgress < 40) {
                        statusMessage = 'Building 3D structure...';
                    } else if (actualProgress < 60) {
                        statusMessage = 'Applying textures...';
                    } else if (actualProgress < 80) {
                        statusMessage = 'Optimizing model...';
                    } else if (actualProgress < 95) {
                        statusMessage = 'Finalizing details...';
                    } else {
                        statusMessage = 'Almost ready...';
                    }
                    break;
                    
                case 'SUCCEEDED':
                    actualProgress = 100;
                    statusMessage = 'Complete!';
                    break;
                    
                case 'FAILED':
                case 'EXPIRED':
                    throw new Error('Generation failed');
            }
            
            // Update state with real progress
            this.generateState.progress = actualProgress;
            this.generateState.status = status;
            
            // Update UI with real progress
            this.updateProgressUI(actualProgress, statusMessage);
            
            // Check completion
            if (status === 'SUCCEEDED') {
                this.generateState.generatedModelData = {
                    taskId: this.generateState.taskId,
                    modelId: this.generateState.taskId,
                    modelUrl: `${this.apiBaseUrl}/proxyModel/${this.generateState.taskId}?format=glb`,
                    modelUrls: data.model_urls
                };
                this.handleGenerationComplete();
            }
            
        } catch (error) {
            console.error('❌ Progress polling error:', error);
            clearInterval(this.progressInterval);
            this.showPremiumError('Generation failed. Your credit has been refunded.');
            window.MobileMonetization.onGenerationError(error.message);
            this.resetToForm();
        }
    }, 2000); // Poll every 2 seconds
}

updateProgressUI(progress, statusMessage) {
    console.log(`📈 Updating UI: ${progress}% - ${statusMessage}`);
    
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressStatus = document.getElementById('progressStatus');
    
    if (progressFill) {
    // Fixed radius to match the actual SVG circle radius (85 instead of 90)
    const circumference = 2 * Math.PI * 85;
    const offset = circumference - (circumference * progress / 100);
    progressFill.style.strokeDasharray = `${circumference}`;
    progressFill.style.strokeDashoffset = `${offset}`;
}
    
    if (progressPercent) {
        progressPercent.textContent = Math.floor(progress) + '%';
    }
    
    if (progressStatus) {
        progressStatus.textContent = statusMessage;
    }
}

handleWatchAd() {
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (!watchAdBtn) return;
    
    // Disable button during ad
    watchAdBtn.disabled = true;
    
    // Update text without changing styles
    const adIcon = watchAdBtn.querySelector('.ad-icon');
    const adText = watchAdBtn.querySelector('.ad-text');
    const adBoost = watchAdBtn.querySelector('.ad-boost');
    
    if (adIcon) adIcon.textContent = '⏳';
    if (adText) adText.textContent = 'Loading Ad...';
    if (adBoost) adBoost.style.display = 'none';
    
    // Simulate ad
    setTimeout(() => this.onAdWatched(), 3000);
}

onAdWatched() {
    this.generateState.adsWatched++;
    
    // Show boost animation on progress circle
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.classList.add('progress-boosted');
        setTimeout(() => progressFill.classList.remove('progress-boosted'), 1000);
    }
    
    // Add visual boost indicator
    this.addBoostIndicator();
    
    // Update button for unlimited ads - PRESERVE STYLING
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn) {
        watchAdBtn.disabled = false;
        // Don't replace innerHTML, just update the text content
        const adText = watchAdBtn.querySelector('.ad-text');
        const adBoost = watchAdBtn.querySelector('.ad-boost');
        
        if (adText) adText.textContent = 'Watch Another Ad';
        if (adBoost) adBoost.textContent = `${this.generateState.adsWatched + 1}x Faster`;
    }
    
    // Optional: Call backend to notify about ad watch (for priority processing)
    this.notifyAdWatched();
}

onAdSkipped() {
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn) {
        watchAdBtn.disabled = false;
        // Don't replace innerHTML, preserve the styled elements
        const adText = watchAdBtn.querySelector('.ad-text');
        const adBoost = watchAdBtn.querySelector('.ad-boost');
        
        if (adText) adText.textContent = 'Speed Boost';
        if (adBoost) adBoost.textContent = '2x Faster';
    }
}

addBoostIndicator() {
    const boostContainer = document.getElementById('boostIndicators');
    if (boostContainer) {
        const boostIcon = document.createElement('div');
        boostIcon.className = 'boost-icon';
        boostIcon.innerHTML = '⚡';
        boostIcon.style.animationDelay = `${(this.generateState.adsWatched - 1) % 3}s`;
        
        // Keep max 3 orbiting icons for visual clarity
        if (boostContainer.children.length >= 3) {
            boostContainer.removeChild(boostContainer.firstChild);
        }
        
        boostContainer.appendChild(boostIcon);
    }
}

// Optional: Notify backend about ad watch for priority processing
async notifyAdWatched() {
    try {
        // This is optional - only if your backend supports priority processing
        await fetch(`${this.apiBaseUrl}/generate/boost/${this.generateState.taskId}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                adWatched: true,
                adCount: this.generateState.adsWatched 
            })
        });
    } catch (error) {
        // Silently fail - don't interrupt the user experience
        console.log('📺 Ad boost notification failed, continuing normally');
    }
}

initializeDogFacts() {
    this.dogFacts = [
        "3D modeling transforms flat images into immersive experiences",
        "Professional 3D models can contain millions of polygons",
        "The first 3D animation was created in 1972",
        "Modern games use real-time 3D rendering at 60+ FPS",
        "3D printing requires watertight models with no gaps",
        "Photogrammetry can create 3D models from multiple photos",
        "A single 3D character can take weeks to model by hand",
        "AI can now generate 3D models in minutes instead of hours",
        "Virtual reality relies entirely on 3D graphics technology",
        "3D models are used in medicine, architecture, and engineering"
    ];
}

startDogFactsRotation() {
    let factIndex = 0;
    
    const rotateFact = () => {
        if (this.generateState.currentView !== 'loading') return;
        
        const dogFactText = document.getElementById('dogFactText');
        if (dogFactText) {
            dogFactText.style.opacity = '0';
            dogFactText.style.transform = 'translateY(10px)';
            setTimeout(() => {
                dogFactText.textContent = this.dogFacts[factIndex];
                dogFactText.style.opacity = '1';
                dogFactText.style.transform = 'translateY(0)';
                factIndex = (factIndex + 1) % this.dogFacts.length;
            }, 500);
        }
    };
    
    // Start rotation
    rotateFact();
    this.dogFactInterval = setInterval(rotateFact, 4000);
}

switchToLoadingState() {
    const formState = document.getElementById('generateFormState');
    const loadingState = document.getElementById('generateLoadingState');
    
    if (formState) formState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'flex';
    
    this.generateState.currentView = 'loading';
    this.generateState.progress = 0;
    this.generateState.adsWatched = 0;
    
    // Start dog facts rotation
    this.startDogFactsRotation();
}

async handleGenerationComplete() {
    clearInterval(this.progressInterval);
    clearInterval(this.dogFactInterval);
    
    console.log('✅ Generation complete!', this.generateState.generatedModelData);
    
    // Switch to viewer state
    this.switchToViewerState();
    
    // Initialize 3D viewer with the generated model
    await this.initialize3DViewer();
    
    // Notify monetization system
    window.MobileMonetization.onGenerationComplete();
}

switchToViewerState() {
    const loadingState = document.getElementById('generateLoadingState');
    const viewerState = document.getElementById('generateViewerState');
    
    if (loadingState) loadingState.style.display = 'none';
    if (viewerState) viewerState.style.display = 'flex';
    
    this.generateState.currentView = 'viewer';
}

// Replace the entire initialize3DViewer() method in generate-controller.js with this:

async initialize3DViewer() {
    const viewerContainer = document.getElementById('viewer3d');
    if (!viewerContainer) return;
    
    // Clear existing content
    viewerContainer.innerHTML = '';
    
    // Create Three.js scene matching main.js EXACTLY
    const scene = new THREE.Scene();
    
    // High-quality gradient background (EXACT copy from main.js)
    const canvasBg = document.createElement('canvas');
    canvasBg.width = 2;
    canvasBg.height = 2;
    const context = canvasBg.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 2);
    gradient.addColorStop(0, '#0a0a0a');    // Top: very dark gray
    gradient.addColorStop(0.5, '#0a0c0d');  // Middle: slightly blue-tinted dark
    gradient.addColorStop(1, '#000000');    // Bottom: pure black
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2, 2);
    
    scene.background = new THREE.CanvasTexture(canvasBg);
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);
    
    // Camera - Start further back
    const camera = new THREE.PerspectiveCamera(
        50,
        viewerContainer.offsetWidth / viewerContainer.offsetHeight,
        0.1,
        200
    );
    camera.position.set(0, 3, 18); // Further initial position
    
    // Enhanced high-quality renderer - EXACT same as main.js
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        precision: "highp",
        logarithmicDepthBuffer: true
    });
    
    renderer.setSize(viewerContainer.offsetWidth, viewerContainer.offsetHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.physicallyCorrectLights = true;
    
    renderer.setClearColor(0x000000, 0);
    renderer.sortObjects = true;
    renderer.shadowMap.autoUpdate = true;
    
    viewerContainer.appendChild(renderer.domElement);
    
    // Setup environment for reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(scene).texture;
    
    // Enhanced controls - Start with temporary limits
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 3;   // Temporary - will update after model loads
    controls.maxDistance = 50;  // Temporary - will update after model loads
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minPolarAngle = Math.PI / 6;
    controls.update();
    
    // DARKER STUDIO LIGHTING - EXACT copy from main.js
    // Clear existing lights
    scene.traverse((child) => {
        if (child.isLight) scene.remove(child);
    });

    // Darker ambient light for more atmospheric feel
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Hemisphere light for natural feel
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.4);
    scene.add(hemiLight);

    // Key light with high-res shadows
    const keyLight = new THREE.DirectionalLight(0xfff5f0, 1.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 4096;
    keyLight.shadow.mapSize.height = 4096;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xb3d0ff, 0.6);
    fillLight.position.set(-5, 5, -3);
    scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);

    // Accent lights
    const accentLight1 = new THREE.PointLight(0xff9500, 0.2, 20);
    accentLight1.position.set(-5, 2, 5);
    scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0x00d4ff, 0.2, 20);
    accentLight2.position.set(5, 2, -5);
    scene.add(accentLight2);
    
    // DARKER GROUND - EXACT copy from main.js
    // Reflective ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.9,
        roughness: 0.8,
        envMapIntensity: 0.5
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.95;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);

    // Subtle grid - EXACT copy from main.js
    const gridHelper = new THREE.GridHelper(20, 40, 0x444444, 0x222222);
    gridHelper.position.y = -0.94;
    scene.add(gridHelper);
    
    // Load the generated model
    const loader = new THREE.GLTFLoader();
    
    try {
        // Show loading state
        this.show3DLoadingState();
        
        const modelUrl = this.generateState.generatedModelData.modelUrl;
        
        loader.load(
            modelUrl,
            (gltf) => {
                const model = gltf.scene;
                
                // Enhanced material quality - matching main.js
                model.traverse((child) => {
                    if (child.isMesh) {
                        // Enable shadows
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Enhance material quality
                        if (child.material) {
                            child.material.envMapIntensity = 1.0;
                            child.material.needsUpdate = true;
                            
                            // Maximize texture quality
                            const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
                            
                            ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach(mapName => {
                                if (child.material[mapName]) {
                                    child.material[mapName].anisotropy = maxAnisotropy;
                                    if (mapName === 'map' || mapName === 'emissiveMap') {
                                        child.material[mapName].encoding = THREE.sRGBEncoding;
                                    }
                                }
                            });
                        }
                    }
                });
                
                // Start small and animate scale (matching main.js animateModelIn)
                model.scale.set(0.01, 0.01, 0.01);
                model.rotation.y = 0;
                
                scene.add(model);
                
                // Calculate ground position
                const tempScale = model.scale.x;
                model.scale.set(1, 1, 1);
                const box = new THREE.Box3().setFromObject(model);
                const groundY = -0.95 - box.min.y;
                model.scale.set(tempScale, tempScale, tempScale);
                
                // Animate model in (matching main.js)
                const startTime = Date.now();
                const duration = 2000;
                
                const animateIn = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    const eased = 1 - Math.pow(1 - progress, 3);
                    
                    const scale = 0.01 + (1 - 0.01) * eased;
                    model.scale.set(scale, scale, scale);
                    
                    // Keep model on ground throughout animation
                    model.position.y = groundY;
                    
                    model.rotation.y = (Math.PI * 4 + Math.PI * 0.25) * eased;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateIn);
                    }
                };
                
                animateIn();
                
                // Frame model after animation - THIS IS THE KEY PART
               // In the initialize3DViewer() method, update the frame model section:

// Frame model after animation - THIS IS THE KEY PART
setTimeout(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    
    // Calculate optimal camera distance - SLIGHTLY FURTHER
    let optimalDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.7; // Increased from 1.5 to 1.7
    optimalDistance = Math.max(optimalDistance, 5); // Increased minimum from 4 to 5
    
    // NOW SET THE ZOOM LIMITS
    // Users can zoom in closer (to 60% of optimal) and zoom out further (to 300% of optimal)
    controls.minDistance = optimalDistance * 0.6;  // Can zoom in to 60% of the distance
    controls.maxDistance = optimalDistance * 3.0;  // Can zoom out to 3x the distance
    controls.update();
    
    console.log('📏 Camera distances configured:', {
        optimal: optimalDistance.toFixed(2),
        minZoom: controls.minDistance.toFixed(2),
        maxZoom: controls.maxDistance.toFixed(2)
    });

    // Position camera at eye level at the OPTIMAL distance
    const eyeLevel = center.y + size.y * 0.1;

    const newPos = {
        x: center.x,
        y: eyeLevel,
        z: center.z + optimalDistance, // Start at the optimal position
    };

    // Smooth camera animation - MATCH MODEL ROTATION TIMING
    const camStartTime = Date.now();
    const camDuration = 1400; // Synced with model rotation
    const startPos = { ...camera.position };
    
    const animateCamera = () => {
        const elapsed = Date.now() - camStartTime;
        const progress = Math.min(elapsed / camDuration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 2);
        
        camera.position.x = startPos.x + (newPos.x - startPos.x) * eased;
        camera.position.y = startPos.y + (newPos.y - startPos.y) * eased;
        camera.position.z = startPos.z + (newPos.z - startPos.z) * eased;
        
        camera.lookAt(center);
        controls.target.copy(center);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        }
    };
    
    animateCamera();
}, 600);
                
                this.hide3DLoadingState();
                
                // Store model reference
                this.generatedModel = model;
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(1);
                this.update3DLoadingProgress(percent);
            },
            (error) => {
                console.error('❌ Error loading model:', error);
                this.show3DErrorState();
            }
        );
    } catch (error) {
        console.error('❌ Failed to load model:', error);
        this.show3DErrorState();
    }
    
    // Animation loop
    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
        camera.aspect = viewerContainer.offsetWidth / viewerContainer.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewerContainer.offsetWidth, viewerContainer.offsetHeight);
    };
    window.addEventListener('resize', handleResize);
    
    // Store references for cleanup
    this.viewer3D = { scene, camera, renderer, controls, pmremGenerator };
}

show3DLoadingState() {
    const viewerContainer = document.getElementById('viewer3d');
    if (!viewerContainer) return;
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'viewer-loading-overlay';
    loadingOverlay.id = 'viewer3dLoading';
    loadingOverlay.innerHTML = `
        <div class="viewer-loading-spinner"></div>
        <div class="viewer-loading-text">Loading 3D Model...</div>
        <div class="viewer-loading-progress" id="viewer3dProgress">0%</div>
    `;
    viewerContainer.appendChild(loadingOverlay);
}

update3DLoadingProgress(percent) {
    const progressElement = document.getElementById('viewer3dProgress');
    if (progressElement) {
        progressElement.textContent = `${percent}%`;
    }
}

hide3DLoadingState() {
    const loadingOverlay = document.getElementById('viewer3dLoading');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

show3DErrorState() {
    const viewerContainer = document.getElementById('viewer3d');
    if (!viewerContainer) return;
    
    viewerContainer.innerHTML = `
        <div class="viewer-error-state">
            <div class="error-icon">⚠️</div>
            <div class="error-text">Failed to load 3D model</div>
            <button class="retry-btn" onclick="window.generateController.initialize3DViewer()">
                Retry
            </button>
        </div>
    `;
}

async handleDownload() {
    const downloadModal = document.createElement('div');
    downloadModal.className = 'download-modal';
    downloadModal.innerHTML = `
        <div class="download-modal-content">
            <div class="download-header">
                <h3>Download 3D Model</h3>
                <button class="close-btn" onclick="this.closest('.download-modal').remove()">×</button>
            </div>
            <div class="download-formats">
                ${this.generateState.downloadFormats.map(format => `
                    <button class="format-btn" data-format="${format}">
                        <div class="format-icon">${this.getFormatIcon(format)}</div>
                        <div class="format-name">${format.toUpperCase()}</div>
                        <div class="format-desc">${this.getFormatDescription(format)}</div>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(downloadModal);
    
    // Add click handlers
    downloadModal.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => this.downloadModel(btn.dataset.format));
    });
    
    // Close on backdrop click
    downloadModal.addEventListener('click', (e) => {
        if (e.target === downloadModal) {
            downloadModal.remove();
        }
    });
}

async downloadModel(format) {
    try {
        // Show loading state
        this.showFeedback(`Preparing ${format.toUpperCase()} download...`, 'info');
        
        // Use proxy endpoint for download
        const downloadUrl = `${this.apiBaseUrl}/proxyModel/${this.generateState.taskId}?format=${format}`;
        
        // Create a temporary link and click it
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Threely-model.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Close modal
        document.querySelector('.download-modal')?.remove();
        
        this.showFeedback('Download started!', 'success');
        
    } catch (error) {
        console.error('❌ Download error:', error);
        this.showFeedback('Download failed. Please try again.', 'error');
    }
}

getFormatIcon(format) {
    const icons = {
        glb: '📦',
        usdz: '🍎',
        obj: '🔷',
        fbx: '🎮'
    };
    return icons[format] || '📄';
}

getFormatDescription(format) {
    const descriptions = {
        glb: 'Universal 3D format',
        usdz: 'iOS AR Ready',
        obj: 'Wide compatibility',
        fbx: 'Animation ready'
    };
    return descriptions[format] || 'Standard format';
}

async handleExport() {
    console.log('📤 Export functionality');
    this.showFeedback('Export feature coming soon!', 'info');
}

async handleRigAnimate() {
    console.log('🦴 Rig & Animate');
    this.showFeedback('Rigging & Animation feature coming soon!', 'info');
}

async handleSaveToFavorites() {
    try {
        // Show immediate feedback
        this.showFeedback('Saving model...', 'info');
        
        // Get all format blobs
        const modelBlobs = await this.getAllModelFormatBlobs();
        const thumbnail = await this.captureModelThumbnail();
        
        // Prepare model data with ALL formats
        const modelData = {
            taskId: this.generateState.taskId,
            name: `Generated Model ${new Date().toISOString().split('T')[0]}`,
            modelBlobs: modelBlobs, // Now contains all formats
            thumbnail: thumbnail,
            settings: this.generateState.settings,
            polygons: this.generateState.settings.targetPolycount,
            textured: this.generateState.settings.shouldTexture,
            formats: this.generateState.downloadFormats // ['glb', 'fbx', 'obj', 'usdz']
        };
        
        // Save locally first (instant!)
        const savedModel = await window.LocalStorageManager.saveModelLocally(modelData);
        
        // Update UI immediately
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <span>Saved!</span>
            `;
            favoriteBtn.disabled = true;
        }
        
        this.showFeedback('Model saved to favorites! ⚡', 'success');
        
        // Update liked models count
        if (window.AppNavigation) {
            window.AppNavigation.updateLikedModelsCount();
        }
        
    } catch (error) {
        console.error('❌ Failed to save to favorites:', error);
        this.showFeedback('Failed to save model', 'error');
    }
}

// Add this NEW helper method to get ALL format blobs
async getAllModelFormatBlobs() {
    const blobs = {};
    const formats = this.generateState.downloadFormats || ['glb', 'fbx', 'obj', 'usdz'];
    
    // Fetch all format blobs in parallel
    const fetchPromises = formats.map(async (format) => {
        try {
            const modelUrl = `${this.apiBaseUrl}/proxyModel/${this.generateState.taskId}?format=${format}`;
            const response = await fetch(modelUrl);
            if (response.ok) {
                const blob = await response.blob();
                blobs[format] = blob;
                console.log(`✅ Fetched ${format} format: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
            }
        } catch (error) {
            console.warn(`Failed to fetch ${format} format:`, error);
        }
    });
    
    await Promise.all(fetchPromises);
    return blobs;
}

// Update the existing captureModelThumbnail method
async captureModelThumbnail() {
    try {
        if (this.viewer3D && this.viewer3D.renderer) {
            const renderer = this.viewer3D.renderer;
            const canvas = renderer.domElement;
            
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            });
        }
    } catch (error) {
        console.error('Failed to capture thumbnail:', error);
        return null;
    }
}

// REPLACE the resetToForm function around line 976 (after handleSaveToFavorites) with this:

resetToForm() {
    const viewerState = document.getElementById('generateViewerState');
    const formState = document.getElementById('generateFormState');
    const loadingState = document.getElementById('generateLoadingState');
    
    if (viewerState) viewerState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (formState) formState.style.display = 'block';
    
    this.generateState.currentView = 'form';
    
    // Reset form
    this.generateState.selectedImage = null;
    this.generateState.progress = 0;
    
    // CRITICAL: Reset the file input element
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.value = ''; // Clear the file input
        imageInput.files = null; // Clear files property
    }
    
    // Reset UI
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');

    if (uploadPlaceholder && uploadPreview) {
        uploadPlaceholder.style.display = 'flex'; // Show placeholder
        uploadPreview.style.display = 'none'; // Hide preview
        uploadPreview.style.visibility = 'hidden'; // Added for extra safety
        uploadPreview.style.opacity = '0'; // Added for extra safety
    }

    // Clear preview image source
    if (previewImage) {
        previewImage.src = '';
        previewImage.onload = null;
        previewImage.onerror = null;
    }
    
    // Clear intervals
    if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
    }
    if (this.dogFactInterval) {
        clearInterval(this.dogFactInterval);
        this.dogFactInterval = null;
    }
    
    // Clean up 3D viewer if exists
    if (this.viewer3D) {
        if (this.viewer3D.renderer) {
            this.viewer3D.renderer.dispose();
        }
        if (this.viewer3D.pmremGenerator) {
            this.viewer3D.pmremGenerator.dispose();
        }
        this.viewer3D = null;
    }
    
    // Clear the generated model data
    this.generateState.generatedModelData = null;
    this.generateState.taskId = null;
}

// REPLACE the handleImageUpload function around line 194 with this:

handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        this.generateState.selectedImage = file;
        
        // Get elements
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');
        const uploadPreview = document.getElementById('uploadPreview');
        const previewImage = document.getElementById('previewImage');
        
        console.log('🖼️ Image upload elements:', {
            placeholder: !!uploadPlaceholder,
            preview: !!uploadPreview,
            image: !!previewImage
        });
        
        if (uploadPlaceholder && uploadPreview && previewImage) {
            // Set image source first
            previewImage.src = e.target.result;
            
            // Wait for image to load
            previewImage.onload = () => {
                console.log('✅ Image loaded successfully');
                // Hide placeholder and show preview
                uploadPlaceholder.style.display = 'none';
                uploadPreview.style.display = 'block'; // This will make it visible
                
                // Also ensure the preview is visible (in case CSS has issues)
                uploadPreview.style.visibility = 'visible';
                uploadPreview.style.opacity = '1';
            };
            
            previewImage.onerror = () => {
                console.error('❌ Image failed to load');
                this.showPremiumError('Failed to load image. Please try another.');
                // Reset to placeholder on error
                uploadPlaceholder.style.display = 'flex';
                uploadPreview.style.display = 'none';
                uploadPreview.style.visibility = 'hidden';
                uploadPreview.style.opacity = '0';
            };
        } else {
            console.error('❌ Missing upload elements:', {
                placeholder: !!uploadPlaceholder,
                preview: !!uploadPreview, 
                image: !!previewImage
            });
        }
    };
    
    reader.onerror = () => {
        console.error('❌ Failed to read file');
        this.showPremiumError('Failed to read file. Please try again.');
    };
    
    reader.readAsDataURL(file);
}

showPremiumError(message) {
    // Remove any existing error modals
    const existingModal = document.querySelector('.premium-error-modal');
    if (existingModal) existingModal.remove();
    
    const errorModal = document.createElement('div');
    errorModal.className = 'premium-error-modal';
    errorModal.innerHTML = `
        <div class="error-modal-overlay"></div>
        <div class="error-modal-content">
            <div class="error-icon-wrapper">
                <svg class="error-icon" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h3 class="error-title">Oops!</h3>
            <p class="error-message">${message}</p>
            <button class="error-btn" onclick="this.closest('.premium-error-modal').remove()">
                Got it
            </button>
        </div>
    `;
    
    document.body.appendChild(errorModal);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        errorModal.classList.add('fade-out');
        setTimeout(() => errorModal.remove(), 300);
    }, 5000);
}

showFeedback(message, type = 'success') {
    const existingFeedback = document.querySelector('.premium-feedback');
    if (existingFeedback) existingFeedback.remove();
    
    const feedback = document.createElement('div');
    feedback.className = 'premium-feedback';
    feedback.innerHTML = `
        <div class="feedback-icon">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
        </div>
        <div class="feedback-message">${message}</div>
    `;
    
    // Add type-specific styling
    feedback.classList.add(`feedback-${type}`);
    
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => {
        feedback.classList.add('show');
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => feedback.remove(), 300);
    }, 3000);
}

cleanup() {
    // Clean up intervals
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.dogFactInterval) clearInterval(this.dogFactInterval);
    
    // Clean up Three.js
    if (this.viewer3D) {
        this.viewer3D.renderer.dispose();
        this.viewer3D.controls.dispose();
    }
}
}

// Make it globally available
window.GenerateController = GenerateController;