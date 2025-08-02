// frontend/src/generate-controller.js
// Premium Generate Controller for DALMA AI Mobile App
// Handles image upload, generation API, progress tracking, and 3D viewer

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
            uploadArea.addEventListener('click', (e) => {
                // Don't trigger if clicking on change button
                if (!e.target.closest('.change-image-btn')) {
                    imageInput.click();
                }
            });
            
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.handleImageUpload(file);
                }
            });
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.handleImageUpload(file);
                }
            });
        }
        
        // Change image button
        const changeImageBtn = document.getElementById('changeImageBtn');
        if (changeImageBtn) {
            changeImageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                imageInput.click();
            });
        }
        
        // Toggle buttons
        document.querySelectorAll('.toggle-group').forEach(group => {
            const buttons = group.querySelectorAll('.toggle-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Update settings based on parent control
                    const parentSection = btn.closest('.control-section');
                    const label = parentSection.querySelector('.control-label').textContent;
                    
                    if (label.includes('Symmetry')) {
                        this.generateState.settings.symmetryMode = btn.dataset.value;
                    } else if (label.includes('Topology')) {
                        this.generateState.settings.topology = btn.dataset.value;
                    } else if (label.includes('Texture')) {
                        this.generateState.settings.shouldTexture = btn.dataset.value === 'true';
                        // Show/hide PBR section
                        const pbrSection = document.getElementById('pbrSection');
                        if (pbrSection) {
                            pbrSection.style.display = this.generateState.settings.shouldTexture ? 'block' : 'none';
                        }
                    }
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
            });
        }
        
        // PBR checkbox
        const pbrCheckbox = document.getElementById('pbrCheckbox');
        if (pbrCheckbox) {
            pbrCheckbox.addEventListener('change', (e) => {
                this.generateState.settings.enablePBR = e.target.checked;
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

    handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.generateState.selectedImage = file;
            
            // Get elements
            const uploadPlaceholder = document.getElementById('uploadPlaceholder');
            const uploadPreview = document.getElementById('uploadPreview');
            const previewImage = document.getElementById('previewImage');
            
            console.log('🖼️ Image upload:', {
                placeholder: uploadPlaceholder,
                preview: uploadPreview,
                image: previewImage
            });
            
            if (uploadPlaceholder && uploadPreview && previewImage) {
                // Set image source first
                previewImage.src = e.target.result;
                
                // Wait for image to load
                previewImage.onload = () => {
                    console.log('✅ Image loaded successfully');
                    uploadPlaceholder.style.display = 'none';
                    uploadPreview.style.display = 'block';
                };
                
                previewImage.onerror = () => {
                    console.error('❌ Image failed to load');
                    this.showPremiumError('Failed to load image. Please try another.');
                };
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
        const circumference = 2 * Math.PI * 90;
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
    watchAdBtn.innerHTML = `
        <div class="ad-btn-bg"></div>
        <span class="ad-icon">⏳</span>
        <span class="ad-text">Loading Ad...</span>
    `;
    
    // Here you would integrate with Unity Ads or your ad network
    if (window.UnityAds && window.UnityAds.isReady('rewardedVideo')) {
        window.UnityAds.show('rewardedVideo', {
            onComplete: () => this.onAdWatched(),
            onSkipped: () => this.onAdSkipped()
        });
    } else {
        // Fallback for testing - simulate 3 second ad
        setTimeout(() => this.onAdWatched(), 3000);
    }
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
    
    // Update button for unlimited ads
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn) {
        watchAdBtn.disabled = false;
        watchAdBtn.innerHTML = `
            <div class="ad-btn-bg"></div>
            <span class="ad-icon">📺</span>
            <span class="ad-text">Watch Another Ad</span>
            <span class="ad-boost">⚡ Speed Boost ${this.generateState.adsWatched}x</span>
        `;
    }
    
    // Show feedback with boost count
    this.showFeedback(`Speed Boost ${this.generateState.adsWatched}x activated! 🚀`, 'success');
    
    // Optional: Call backend to notify about ad watch (for priority processing)
    this.notifyAdWatched();
}

onAdSkipped() {
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn) {
        watchAdBtn.disabled = false;
        watchAdBtn.innerHTML = `
            <div class="ad-btn-bg"></div>
            <span class="ad-icon">📺</span>
            <span class="ad-text">Watch Ad for Speed Boost</span>
            <span class="ad-boost">⚡ Instant Boost</span>
        `;
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
        "Dogs have been human companions for over 15,000 years!",
        "A dog's sense of smell is 10,000 to 100,000 times stronger than humans.",
        "Dogs can learn over 150 words and can count up to four or five.",
        "The average dog lives 10-13 years, depending on size and breed.",
        "Dogs dream just like humans and can have nightmares too!",
        "A dog's nose print is unique, just like a human's fingerprint.",
        "Dogs can see in color, but not as vividly as humans.",
        "Puppies are born deaf and blind but develop these senses quickly.",
        "Dogs have three eyelids: upper, lower, and a third for protection.",
        "The smallest dog breed is the Chihuahua, the largest is the Great Dane."
    ];
}

startDogFactsRotation() {
    let factIndex = 0;
    
    const rotateFact = () => {
        if (this.generateState.currentView !== 'loading') return;
        
        const dogFactText = document.getElementById('dogFactText');
        if (dogFactText) {
            dogFactText.style.opacity = '0';
            setTimeout(() => {
                dogFactText.textContent = this.dogFacts[factIndex];
                dogFactText.style.opacity = '1';
                factIndex = (factIndex + 1) % this.dogFacts.length;
            }, 300);
        }
    };
    
    // Start rotation
    rotateFact();
    this.dogFactInterval = setInterval(rotateFact, 5000);
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

async initialize3DViewer() {
    const viewerContainer = document.getElementById('viewer3d');
    if (!viewerContainer) return;
    
    // Clear existing content
    viewerContainer.innerHTML = '';
    
    // Create Three.js scene matching website style
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
        50,
        viewerContainer.offsetWidth / viewerContainer.offsetHeight,
        0.1,
        1000
    );
    camera.position.set(5, 5, 5);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(viewerContainer.offsetWidth, viewerContainer.offsetHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    
    viewerContainer.appendChild(renderer.domElement);
    
    // Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.update();
    
    // Lighting - Premium setup matching website
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xffffff, 1);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0x80e8ff, 0.5);
    fillLight.position.set(-3, 5, -3);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 0, -5);
    scene.add(rimLight);
    
    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x00bcd4, 0x00bcd4);
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
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
                
                // Center and scale model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 4 / maxDim;
                model.scale.multiplyScalar(scale);
                
                model.position.x = -center.x * scale;
                model.position.y = -box.min.y * scale;
                model.position.z = -center.z * scale;
                
                // Enable shadows
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Enhance materials for premium look
                        if (child.material) {
                            child.material.envMapIntensity = 0.8;
                        }
                    }
                });
                
                scene.add(model);
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
    this.viewer3D = { scene, camera, renderer, controls };
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
        a.download = `dalma-model.${format}`;
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
        // Prepare save data with proper field names for backend
        const saveData = {
            name: `Generated Model ${new Date().toISOString().split('T')[0]}`,
            breed: 'AI Generated',
            description: 'Generated from uploaded image',
            isPublic: false,
            isUserGenerated: true,
            category: 'user_generated',
            
            // Generation parameters with correct field names
            topology: this.generateState.settings.topology,
            texture: this.generateState.settings.shouldTexture,
            symmetry: this.generateState.settings.symmetryMode,
            pbr: this.generateState.settings.enablePBR,
            polygons: this.generateState.settings.targetPolycount
        };
        
        const response = await fetch(`${this.apiBaseUrl}/saveAsset/${this.generateState.taskId}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save to favorites');
        }
        
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
        
        this.showFeedback('Added to favorites!', 'success');
        
    } catch (error) {
        console.error('❌ Failed to save to favorites:', error);
        this.showFeedback('Failed to save to favorites', 'error');
    }
}

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
    
    // Reset UI
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadPreview = document.getElementById('uploadPreview');
    
    if (uploadPlaceholder && uploadPreview) {
        uploadPlaceholder.style.display = 'flex';
        uploadPreview.style.display = 'none';
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