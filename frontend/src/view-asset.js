// COMPLETE WORKING VIEW ASSET JAVASCRIPT - FIXED MODEL DISAPPEARING ISSUE
console.log('🚨 =====================================');
console.log('🚨 VIEW ASSET SCRIPT LOADING...');
console.log('🚨 =====================================');

// ===== GLOBAL VARIABLES =====
let scene, camera, renderer, controls, model;
let currentAsset = null;
let currentAssetId = null;
let sourceRef = null;
let pmremGenerator;
let animationId = null; // Track animation frame ID

// Like button functionality variables
let currentUserLikeState = false;
let isLikeButtonLoading = false;

// Make scene globally accessible to prevent duplicate initialization
window.scene = null;
window.currentModel = null;
window.controls = null;

// ===== CORE UTILITY FUNCTIONS =====

// Enhanced API URL function that works with your comprehensive config
function getApiBaseUrl() {
    if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
        console.log('🔗 Using APP_CONFIG API URL:', window.APP_CONFIG.API_BASE_URL);
        return window.APP_CONFIG.API_BASE_URL;
    } else if (window.DALMA_CONFIG && window.DALMA_CONFIG.API_BASE_URL) {
        console.log('🔗 Using DALMA_CONFIG API URL:', window.DALMA_CONFIG.API_BASE_URL);
        return window.DALMA_CONFIG.API_BASE_URL;
    } else {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
        
        let fallbackUrl;
        if (isDev) {
            fallbackUrl = `http://${hostname}:3000/api`;
        } else {
            fallbackUrl = protocol === 'https:' 
                ? `https://${hostname}/api` 
                : `http://${hostname}:3000/api`;
        }
        
        console.warn('⚠️ Config not loaded yet, using fallback API URL:', fallbackUrl);
        return fallbackUrl;
    }
}

console.log('🔗 API Base URL:', getApiBaseUrl());

// Mobile navigation toggle function
function toggleMobileNav() {
    console.log('📱 Toggle mobile nav called');
    const mobileNav = document.getElementById('mobileNav');
    const hamburger = document.querySelector('.hamburger');
    if (mobileNav) mobileNav.classList.toggle('active');
    if (hamburger) hamburger.classList.toggle('active');
}

// ===== 3D SCENE FUNCTIONS =====

// Initialize 3D Scene
function init3DScene() {
    console.log('🎬 ===== INITIALIZING 3D SCENE =====');
    
    // Check if already initialized
    if (window.scene || scene) {
        console.log('⚠️ 3D scene already initialized, skipping duplicate initialization...');
        return true;
    }
    
    try {
        if (typeof THREE === 'undefined') {
            console.error('❌ THREE.js library not loaded');
            return false;
        }

        scene = new THREE.Scene();
        window.scene = scene; // Make globally accessible to prevent duplicate init
        
        // High-quality gradient background
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        const context = canvas.getContext('2d');
        const gradient = context.createLinearGradient(0, 0, 0, 2);
        gradient.addColorStop(0, '#0a0a0a');    
        gradient.addColorStop(0.5, '#0a0c0d');  
        gradient.addColorStop(1, '#000000');   
        context.fillStyle = gradient;
        context.fillRect(0, 0, 2, 2);
        
        scene.background = new THREE.CanvasTexture(canvas);
        scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

        const canvas3d = document.getElementById("3dCanvas");
        if (!canvas3d) {
            console.error('❌ 3dCanvas element not found in DOM');
            return false;
        }

        const canvasRect = canvas3d.getBoundingClientRect();
        const width = canvasRect.width || 600;
        const height = canvasRect.height || 500;
        
        console.log('📐 Canvas dimensions:', { width, height });

        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0.2, 8); // Lower initial camera position
        camera.lookAt(0, 0, 0);

        // Maximum quality renderer
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp",
            logarithmicDepthBuffer: true
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.physicallyCorrectLights = true;

        const existingCanvases = canvas3d.querySelectorAll("canvas");
        existingCanvases.forEach(canvas => canvas.remove());
        
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        canvas3d.appendChild(renderer.domElement);

        // Setup environment for reflections
        pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        
        // Create basic environment
        const envScene = new THREE.Scene();
        const envLight = new THREE.DirectionalLight(0xffffff, 1);
        envLight.position.set(1, 1, 1);
        envScene.add(envLight);
        scene.environment = pmremGenerator.fromScene(envScene).texture;

        // Setup studio lighting and ground
        setupStudioLighting();
        setupHighQualityGround();

        // Initialize controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            window.controls = controls; // Make globally accessible
            controls.target.set(0, 0.2, 0); // Lower initial target point
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.rotateSpeed = 0.5;
            controls.minDistance = 2;
            controls.maxDistance = 20;
            controls.maxPolarAngle = Math.PI / 2 - 0.05;
            controls.update();
            console.log('✅ OrbitControls initialized');
        } else {
            console.error('❌ OrbitControls not available');
        }

        // Start animation loop
        animate();
        
        console.log('✅ 3D scene initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Error initializing 3D scene:', error);
        return false;
    }
}

// Studio lighting setup
function setupStudioLighting() {
    // Clear existing lights first
    const existingLights = [];
    scene.traverse((child) => {
        if (child.isLight) existingLights.push(child);
    });
    existingLights.forEach(light => scene.remove(light));

    // Ambient base
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Hemisphere for natural lighting
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
}

// High quality ground setup
function setupHighQualityGround() {
    // Remove old ground elements
    const groundElements = [];
    scene.traverse((child) => {
        if (child instanceof THREE.GridHelper || (child.isMesh && child.position.y < -0.9)) {
            groundElements.push(child);
        }
    });
    groundElements.forEach(element => scene.remove(element));

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
    ground.position.y = -0.85; // Match the updated model ground position
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    // Subtle grid
    const gridHelper = new THREE.GridHelper(20, 40, 0x444444, 0x222222);
    gridHelper.position.y = -0.84; // Slightly above ground to prevent z-fighting
    gridHelper.name = 'grid';
    scene.add(gridHelper);
}

// Animation loop
function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (controls) {
        controls.update();
    }
    
    // Ensure model stays visible
    if ((model || window.currentModel) && model && model.parent && model.visible === false) {
        console.warn('⚠️ Model was hidden, making visible again...');
        model.visible = true;
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Handle window resize
function onWindowResize() {
    console.log('📐 Window resized, updating 3D viewport...');
    
    const canvas3d = document.getElementById("3dCanvas");
    if (!canvas3d || !camera || !renderer) {
        console.warn('⚠️ Cannot resize - missing canvas3d, camera, or renderer');
        return;
    }

    const canvasRect = canvas3d.getBoundingClientRect();
    const newWidth = canvasRect.width;
    const newHeight = canvasRect.height;
    
    console.log('📏 New canvas dimensions:', { width: newWidth, height: newHeight });

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
    
    console.log('✅ 3D viewport resized successfully');
}

// ===== FORMAT DETECTION =====

// Enhanced format detection
function detectAvailableFormats(asset) {
    console.log('🔍 ===== DETECTING AVAILABLE FORMATS =====');
    console.log('🔍 Asset name:', asset.name);
    
    let formats = [];
    
    // Method 1: Check availableFormats array
    if (asset.availableFormats && Array.isArray(asset.availableFormats) && asset.availableFormats.length > 0) {
        formats = [...asset.availableFormats];
        console.log('✅ Method 1 - Found formats from availableFormats array:', formats);
        return formats;
    }
    
    // Method 2: Check modelFiles object
    if (asset.modelFiles && typeof asset.modelFiles === 'object') {
        const fileFormats = Object.keys(asset.modelFiles).filter(format => {
            const modelFile = asset.modelFiles[format];
            return modelFile && modelFile.url && !modelFile.url.includes('memory://');
        });
        
        if (fileFormats.length > 0) {
            formats = fileFormats;
            console.log('✅ Method 2 - Found formats from modelFiles:', formats);
            return formats;
        }
    }
    
    // Method 3: Check legacy modelFile
    if (asset.modelFile && asset.modelFile.url && !asset.modelFile.url.includes('memory://')) {
        formats = ['glb'];
        console.log('✅ Method 3 - Found GLB from legacy modelFile');
        return formats;
    }
    
    // Method 4: Meshy generated assets
    if (asset.meshyTaskId) {
        const hasSavedFiles = asset.modelFiles && Object.keys(asset.modelFiles).some(format => 
            asset.modelFiles[format] && 
            asset.modelFiles[format].url && 
            asset.modelFiles[format].url.includes('cloudinary')
        );
        
        if (hasSavedFiles) {
            formats = Object.keys(asset.modelFiles).filter(format => 
                asset.modelFiles[format] && asset.modelFiles[format].url
            );
        } else {
            formats = ['glb', 'fbx', 'obj', 'usdz'];
        }
        
        console.log('🤖 Meshy asset formats:', formats);
        return formats;
    }
    
    // Fallback
    formats = ['glb'];
    console.log('⚠️ Using fallback GLB format');
    return formats;
}

// ===== UI UPDATE FUNCTIONS =====

// Initialize like button
function initializeLikeButton() {
    console.log('💖 Initializing like button...');
    
    const likeButton = document.getElementById('likeButton');
    if (likeButton) {
        likeButton.addEventListener('click', handleLikeButtonClick);
        console.log('✅ Like button event listener attached');
    } else {
        console.warn('⚠️ Like button not found in DOM');
    }
}

// Setup back button
function setupBackButton() {
    console.log('🔙 Setting up back button...');
    
    const backButton = document.getElementById('backToAssetsBtn');
    if (backButton) {
        backButton.addEventListener('click', navigateBack);
        console.log('✅ Back button event listener attached');
    } else {
        console.warn('⚠️ Back button not found in DOM');
    }
}

// Navigate back
function navigateBack() {
    console.log('🔙 Navigating back...');
    console.log('📍 Source reference:', sourceRef);
    
    if (sourceRef === 'library') {
        window.location.href = 'library.html';
    } else if (sourceRef === 'search') {
        window.location.href = 'search.html';
    } else if (sourceRef === 'profile') {
        window.location.href = 'profile.html';
    } else if (document.referrer && document.referrer.includes(window.location.hostname)) {
        window.history.back();
    } else {
        window.location.href = 'homepage.html';
    }
}

// Update asset info overlay
function updateAssetInfoOverlay(asset) {
    console.log('📝 Updating asset info overlay...');
    
    // Helper function to safely update element text
    function safeUpdateElement(id, value, fallback = 'Unknown') {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || fallback;
            return true;
        } else {
            console.warn(`⚠️ Element not found: ${id}`);
            return false;
        }
    }
    
    // Update title
    safeUpdateElement('assetTitle', asset.name, 'Unknown Asset');

    // Update user generated
    let isUserGenerated = 'No';
    if (asset.isUserGenerated || 
        asset.userGenerated === true || 
        asset.meshyTaskId || 
        asset.generatedFromImage || 
        asset.category === 'user_generated' ||
        asset.createdBy === 'user' ||
        asset.wasUserGenerated ||
        (asset.generationMetadata && asset.generationMetadata.isMeshyGenerated)) {
        isUserGenerated = 'Yes';
    }
    safeUpdateElement('assetUserGenerated', isUserGenerated);

    // Update topology
    safeUpdateElement('assetTopology', asset.topology || 'Triangles');

    // Update polygons with formatting
    const polygonCount = asset.polygons || asset.polycount;
    safeUpdateElement('assetPolygons', polygonCount ? polygonCount.toLocaleString() : '0');

    // Update views
    safeUpdateElement('assetViews', asset.views ? asset.views.toLocaleString() : '0');

    // Update downloads
    safeUpdateElement('assetDownloads', asset.downloads ? asset.downloads.toLocaleString() : '0');

    // Update tags AND add available formats
    const tagsContainer = document.getElementById('assetTagsDisplay');
    if (tagsContainer) {
        tagsContainer.innerHTML = '';
        
        // Add regular tags first
        if (asset.tags && Array.isArray(asset.tags) && asset.tags.length > 0) {
            asset.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'asset-tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
            console.log(`✅ Added ${asset.tags.length} regular tags`);
        }
        
        // Add available formats as tags
        if (asset.availableFormats && Array.isArray(asset.availableFormats) && asset.availableFormats.length > 0) {
            const formatsElement = document.createElement('span');
            formatsElement.className = 'asset-tag';
            formatsElement.textContent = `Formats: ${asset.availableFormats.join(', ').toUpperCase()}`;
            formatsElement.style.background = 'rgba(0, 188, 212, 0.2)';
            formatsElement.style.borderColor = '#00bcd4';
            formatsElement.style.color = '#00bcd4';
            tagsContainer.appendChild(formatsElement);
            console.log('📋 Added formats tag:', asset.availableFormats.join(', '));
        }
        
        // If no tags at all, show a message
        if (tagsContainer.children.length === 0) {
            const noTagsElement = document.createElement('span');
            noTagsElement.className = 'asset-tag';
            noTagsElement.textContent = 'No tags available';
            noTagsElement.style.opacity = '0.6';
            tagsContainer.appendChild(noTagsElement);
        }
    }

    // Update page title
    if (asset.name) {
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleElement.textContent = `${asset.name} - 3D Asset Viewer`;
        }
    }

    console.log('✅ Asset info overlay updated');
}

// Set preview image
function setPreviewImage(asset) {
    console.log('🖼️ Setting preview image...');
    
    const uploadPreview = document.getElementById('uploadPreview');
    const uploadText = document.querySelector('.upload-text');
    
    if (!uploadPreview) {
        console.warn('⚠️ Upload preview element not found');
        return;
    }
    
    // Enhanced image URL detection
    let imageUrl = null;
    let imageSource = null;
    
    const imageSources = [
        { key: 'thumbnailUrl', name: 'thumbnailUrl (direct)' },
        { key: 'imageUrl', name: 'imageUrl (direct)' },
        { key: 'previewUrl', name: 'previewUrl (direct)' },
        { key: 'originalImage', name: 'originalImage.url', isObject: true },
        { key: 'inputImage', name: 'inputImage.url', isObject: true },
        { key: 'sourceImage', name: 'sourceImage.url', isObject: true },
        { key: 'previewImage', name: 'previewImage.url', isObject: true }
    ];
    
    for (const source of imageSources) {
        let checkValue;
        if (source.isObject) {
            checkValue = asset[source.key] && asset[source.key].url ? asset[source.key].url : null;
        } else {
            checkValue = asset[source.key] || null;
        }
        
        if (checkValue && typeof checkValue === 'string' && checkValue.length > 0) {
            imageUrl = checkValue;
            imageSource = source.name;
            console.log(`✅ Found image from ${imageSource}:`, imageUrl);
            break;
        }
    }
    
    if (!imageUrl) {
        console.warn('⚠️ No thumbnail URL available for asset');
        setIconFallback(asset, uploadPreview, uploadText);
        return;
    }
    
    console.log('🔄 Loading image from:', imageSource, '→', imageUrl);
    
    // Set as background image
    uploadPreview.style.backgroundImage = `url(${imageUrl})`;
    uploadPreview.style.backgroundSize = 'cover';
    uploadPreview.style.backgroundPosition = 'center';
    uploadPreview.style.backgroundRepeat = 'no-repeat';
    uploadPreview.classList.add('visible');
    
    // Hide upload text
    if (uploadText) {
        uploadText.style.display = 'none';
    }
    
    // Add error handling for image loading
    const testImg = new Image();
    testImg.onerror = function() {
        console.warn('⚠️ Failed to load preview image:', imageUrl);
        setIconFallback(asset, uploadPreview, uploadText);
    };
    testImg.onload = function() {
        console.log('✅ Preview image loaded successfully');
    };
    testImg.src = imageUrl;
}

// Helper function for icon fallback
function setIconFallback(asset, uploadPreview, uploadText) {
    console.log('🎭 Setting icon fallback for asset:', asset.name);
    
    uploadPreview.style.backgroundImage = '';
    uploadPreview.style.background = `linear-gradient(135deg, rgba(0, 188, 212, 0.3), rgba(0, 151, 167, 0.3))`;
    uploadPreview.innerHTML = `
        <div style="
            display: flex; 
            align-items: center; 
            justify-content: center; 
            width: 100%; 
            height: 100%; 
            font-size: 2.5rem;
            color: #00bcd4;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        ">${asset.icon || '🐕'}</div>
    `;
    uploadPreview.classList.add('visible');
    
    if (uploadText) {
        uploadText.style.display = 'none';
    }
    
    console.log('✅ Icon fallback set with:', asset.icon || '🐕');
}

// ===== DOWNLOAD FUNCTIONALITY =====

// Setup download handlers
function setupDownloadHandlers() {
    console.log('📥 Setting up download handlers...');
    
    const downloadTrigger = document.getElementById('downloadTrigger');
    const downloadDropdown = document.querySelector('.download-dropdown');
    const downloadOptions = document.querySelectorAll('.download-option');
    
    if (!downloadTrigger || !downloadDropdown) {
        console.error('❌ Critical download elements not found!');
        return;
    }
    
    if (!currentAsset) {
        console.log('⏳ Asset not loaded yet, retrying download setup in 1 second...');
        setTimeout(setupDownloadHandlers, 1000);
        return;
    }

    const availableFormats = currentAsset.availableFormats || ['glb'];
    
    console.log('🎯 Setting up downloads:', {
        assetName: currentAsset.name,
        availableFormats: availableFormats,
        formatCount: availableFormats.length
    });

    // Show/hide download options based on available formats
    downloadOptions.forEach((option) => {
        const format = option.id.replace('download', '').toLowerCase();
        
        if (availableFormats.includes(format)) {
            option.style.display = 'block';
            option.disabled = false;
            option.textContent = format.toUpperCase();
            console.log(`✅ Download option ENABLED: ${format.toUpperCase()}`);
        } else {
            option.style.display = 'none';
            option.disabled = true;
            console.log(`❌ Download option DISABLED: ${format.toUpperCase()}`);
        }
    });

    // Setup dropdown toggle
    downloadTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadDropdown.classList.toggle('open');
        console.log('📋 Download dropdown toggled');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!downloadDropdown.contains(e.target)) {
            downloadDropdown.classList.remove('open');
        }
    });
    
    // Setup individual download options
    downloadOptions.forEach((option) => {
        option.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const format = option.id.replace('download', '').toLowerCase();
            console.log('📥 Download option clicked:', format);
            
            downloadDropdown.classList.remove('open');
            
            try {
                await handleDownload(format);
            } catch (error) {
                console.error('❌ Download option handler error:', error);
                alert('Download failed. Please try again.');
            }
        });
    });
    
    console.log('✅ Download handlers set up successfully');
}

// Download regular asset
async function downloadRegularAsset(assetId, format) {
    console.log('📥 Downloading regular asset:', assetId, format);
    
    try {
        const response = await fetch(`${getApiBaseUrl()}/assets/${assetId}/download?format=${format}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAsset.name || 'asset'}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Regular asset download completed');
        showLikeFeedback(`${format.toUpperCase()} downloaded successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Regular download error:', error);
        throw error;
    }
}

// Download Meshy asset
async function downloadMeshyAsset(meshyTaskId, format) {
    console.log('🤖 Downloading Meshy asset:', meshyTaskId, format);
    
    try {
        const response = await fetch(`${getApiBaseUrl()}/assets/meshy/${meshyTaskId}/download?format=${format}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Meshy download failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAsset.name || 'meshy-asset'}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Meshy asset download completed');
        showLikeFeedback(`${format.toUpperCase()} downloaded successfully!`, 'success');
        
    } catch (error) {
        console.error('❌ Meshy download error:', error);
        throw error;
    }
}

// Handle download
async function handleDownload(format) {
    try {
        console.log('🔐 ===== STARTING DOWNLOAD PROCESS =====');
        console.log('📥 Requested format:', format);
        
        if (!currentAssetId || !currentAsset) {
            console.error('❌ CRITICAL: No asset loaded for download');
            alert('No asset loaded. Please try again.');
            return;
        }

        // Check if format is available
        const availableFormats = currentAsset.availableFormats || ['glb'];
        
        if (!availableFormats.includes(format)) {
            console.error('❌ Requested format not available');
            alert(`${format.toUpperCase()} format is not available for this asset. Available formats: ${availableFormats.join(', ').toUpperCase()}`);
            return;
        }
        
        console.log('🔐 Checking user authentication...');
        const isAuthenticated = await checkAuthentication();
        
        if (!isAuthenticated) {
            console.log('❌ User not authenticated, showing login prompt');
            if (window.authManager) {
                window.authManager.showLoginModal();
            } else {
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                window.location.href = 'login.html';
            }
            return;
        }
        
        console.log('✅ User authentication confirmed, proceeding with download');
        
        // Determine download method
        if (currentAsset.isMeshyGenerated && currentAsset.meshyTaskId) {
            const hasSavedFiles = currentAsset.modelFiles && 
                                currentAsset.modelFiles[format] && 
                                currentAsset.modelFiles[format].url &&
                                !currentAsset.modelFiles[format].url.includes('meshy.ai');
            
            if (hasSavedFiles) {
                console.log('📁 Asset is SAVED Meshy-generated with permanent storage');
                await downloadRegularAsset(currentAssetId, format);
            } else {
                console.log('🤖 Asset is UNSAVED Meshy-generated - using proxy download');
                await downloadMeshyAsset(currentAsset.meshyTaskId, format);
            }
        } else {
            console.log('📁 Asset is regular upload - using direct download');
            await downloadRegularAsset(currentAssetId, format);
        }
        
    } catch (error) {
        console.error('❌ CRITICAL DOWNLOAD ERROR:', error);
        alert('Failed to download asset. Please try again.');
    }
}

// ===== 3D MODEL LOADING =====

// Load 3D model into the scene
async function load3DModel(asset) {
    try {
        console.log('🎨 ===== LOADING 3D MODEL =====');
        console.log('🎨 Asset:', asset.name);
        
        if (!scene) {
            console.warn('⚠️ 3D scene not initialized, attempting to initialize now...');
            const sceneInitialized = init3DScene();
            if (!sceneInitialized || !scene) {
                throw new Error('3D scene initialization failed');
            }
        }

        if (typeof THREE === 'undefined') {
            throw new Error('Three.js library not available');
        }

        if (typeof THREE.GLTFLoader === 'undefined') {
            console.warn('⚠️ GLTFLoader not available, attempting to load from CDN...');
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/loaders/GLTFLoader.js');
                if (typeof THREE.GLTFLoader === 'undefined') {
                    throw new Error('GLTFLoader still not available after dynamic loading');
                }
            } catch (loaderError) {
                throw new Error('GLTFLoader not available and could not be loaded dynamically');
            }
        }
        
        // Determine which model URL to use
        let modelUrl = null;
        let modelSource = null;
        let needsProxy = false;
        
        // Check if this is a Meshy-generated asset that needs proxy
        if (asset.isMeshyGenerated && asset.meshyTaskId) {
            if (asset.modelFiles && asset.modelFiles.glb && asset.modelFiles.glb.url) {
                modelUrl = asset.modelFiles.glb.url;
                modelSource = 'modelFiles.glb (saved Meshy asset)';
                needsProxy = false;
                console.log('📁 Using saved GLB from modelFiles');
            } else if (asset.modelFile && asset.modelFile.url && !asset.modelFile.url.includes('meshy.ai')) {
                modelUrl = asset.modelFile.url;
                modelSource = 'modelFile (saved Meshy asset)';
                needsProxy = false;
                console.log('📁 Using saved GLB from modelFile');
            } else {
                modelUrl = `${getApiBaseUrl()}/proxyModel/${asset.meshyTaskId}?format=glb`;
                modelSource = 'Meshy proxy endpoint (temporary)';
                needsProxy = true;
                console.log('🤖 Using proxy for unsaved Meshy asset');
            }
        } else {
            // Regular manually uploaded asset
            if (asset.modelFiles && asset.modelFiles.glb && asset.modelFiles.glb.url) {
                modelUrl = asset.modelFiles.glb.url;
                modelSource = 'modelFiles.glb';
                console.log('📁 Using GLB from modelFiles');
            } else if (asset.modelFile && asset.modelFile.url) {
                modelUrl = asset.modelFile.url;
                modelSource = 'modelFile (legacy)';
                console.log('📁 Using GLB from modelFile (legacy)');
            }
        }
        
        console.log('🔍 Model source determined:', {
            source: modelSource,
            url: modelUrl,
            needsProxy: needsProxy
        });
        
        if (!modelUrl) {
            console.warn('⚠️ No model file URL available for 3D loading');
            return;
        }
        
        console.log('📁 Loading 3D model from:', modelUrl);
        
        const loader = new THREE.GLTFLoader();
        
        return new Promise((resolve, reject) => {
            loader.load(
                modelUrl,
                (gltf) => {
                    console.log('✅ GLTF loaded successfully');
                    
                    // Clear ONLY the old model, not the entire scene
                    if (model) {
                        scene.remove(model);
                        // Dispose of old model resources
                        model.traverse((child) => {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        });
                    }
                    
                    model = gltf.scene;
                    window.currentModel = model; // Store globally
                    
                    // Enhanced material quality
                    let modelBounds = null;
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
                    
                    // Scale and position model
                    model.scale.set(1, 1, 1);
                    model.rotation.y = Math.PI * 0.15; // More rotation to face right (27 degrees) - looks better visually
                    
                    // FIXED: Perfect centering on grid
                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());
                    const bottomY = box.min.y;
                    
                    // Center the model PERFECTLY on the grid at 0,0,0 point
                    model.position.x = -center.x; // Perfect center on X-axis
                    model.position.y = -0.85 - bottomY; // Slightly higher ground position for better framing
                    model.position.z = -center.z; // Perfect center on Z-axis
                    
                    // Ensure model is visible
                    model.visible = true;
                    
                    // Add to scene
                    scene.add(model);
                    
                    // Make model globally accessible to prevent issues
                    window.currentModel = model;
                    
                    // Frame model with perfect centering animation
                    frameModelWithZoom(model);
                    
                    console.log('✅ 3D model loaded and added to scene successfully');
                    resolve(true);
                },
                (progress) => {
                    const percent = progress.total > 0 ? (progress.loaded / progress.total * 100) : 0;
                    console.log(`📊 Loading progress: ${percent.toFixed(1)}%`);
                },
                (error) => {
                    console.error('❌ CRITICAL ERROR loading 3D model:', error);
                    console.error('📍 Model URL that failed:', modelUrl);
                    
                    // Show user-friendly error message
                    const canvas3d = document.getElementById('3dCanvas');
                    if (canvas3d) {
                        canvas3d.innerHTML = `
                            <div style="
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                height: 100%;
                                color: #00bcd4;
                                font-family: 'Inter', sans-serif;
                                text-align: center;
                                padding: 2rem;
                            ">
                                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                                <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">3D Model Unavailable</div>
                                <div style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.7);">
                                    The 3D model file could not be loaded. It may have been removed or is temporarily unavailable.
                                </div>
                                <div style="font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); margin-top: 1rem;">
                                    Error: 404 - File not found
                                </div>
                            </div>
                        `;
                    }
                    
                    reject(error);
                }
            );
        });
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR in load3DModel:', error);
        
        // Show error in 3D canvas
        const canvas3d = document.getElementById('3dCanvas');
        if (canvas3d && !canvas3d.querySelector('div')) {
            canvas3d.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #00bcd4;
                    font-family: 'Inter', sans-serif;
                    text-align: center;
                    padding: 2rem;
                ">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">3D Model Error</div>
                    <div style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.7);">
                        Unable to load the 3D model. Please try again later.
                    </div>
                </div>
            `;
        }
    }
}

// FIXED: Frame model with perfect centering - grid split evenly left/right
function frameModelWithZoom(model) {
    console.log('📐 Framing model with perfect center positioning...');
    console.log('📐 Model visible:', model.visible);
    console.log('📐 Model in scene:', scene.children.includes(model));
    
    // Use global controls if local not available
    controls = controls || window.controls;
    
    if (!model || !camera || !controls) {
        console.error('❌ Missing required objects for framing');
        console.error('Model:', !!model, 'Camera:', !!camera, 'Controls:', !!controls);
        
        // If controls are missing, try to initialize them now
        if (!controls && camera && renderer) {
            console.log('🔧 Attempting to initialize controls...');
            if (typeof THREE.OrbitControls !== 'undefined') {
                controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                controls.update();
                console.log('✅ Controls initialized in frameModelWithZoom');
            }
        }
        
        if (!controls) {
            console.error('❌ Still no controls, cannot proceed with framing');
            return;
        }
    }
    
    // Ensure model is visible
    model.visible = true;
    
    // Store reference to prevent closure issues
    const modelRef = model;
    const sceneRef = scene;
    
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    
    // Calculate target camera distance
    let targetDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.4; // Slightly closer for better framing
    targetDistance = Math.max(targetDistance, 3); // Minimum distance

    // FIXED: Lower camera positioning for full model visibility
    const cameraHeight = targetDistance * 0.05; // Much lower camera height
    const cameraDepth = targetDistance * 0.85; // Slightly more frontal

    // FIXED: Set controls target lower to show full model
    const targetY = center.y + 0.2; // Lower target to show full model including feet
    controls.target.set(0, targetY, 0); // PERFECT CENTER: 0,0,0 target

    // FIXED: Final camera position - PERFECTLY CENTERED and LOWER
    const finalPos = {
        x: 0, // PERFECT CENTER - no offset at all
        y: center.y + cameraHeight, // Much lower camera height for full model view
        z: center.z + cameraDepth
    };
    
    // Start camera further away for zoom effect
    const startDistance = targetDistance * 1.8; // Bit further for better zoom effect
    const startHeight = cameraHeight * 2.0; // Higher start for dramatic zoom
    const startDepth = cameraDepth * 1.4;
    
    camera.position.set(
        0, // PERFECT CENTER - no X offset
        center.y + startHeight, 
        center.z + startDepth
    );
    camera.lookAt(0, targetY, 0); // Look at perfect center
    controls.update();

    // Animate zoom in with proper easing
    const startTime = Date.now();
    const duration = 1500;
    let animationFrameId = null;
    
    function animateFrame() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use a smoother easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        
        // FIXED: Interpolate camera position - PERFECT CENTER
        camera.position.x = 0; // Always center - no interpolation needed for X
        camera.position.y = (center.y + startHeight) + ((finalPos.y - (center.y + startHeight)) * eased);
        camera.position.z = (center.z + startDepth) + ((finalPos.z - (center.z + startDepth)) * eased);
        
        camera.lookAt(0, targetY, 0); // Always look at perfect center
        controls.update();
        
        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animateFrame);
        } else {
            console.log('✅ Model framing animation complete - PERFECTLY CENTERED WITH FULL MODEL VISIBILITY');
            // Ensure final position and visibility
            camera.position.set(finalPos.x, finalPos.y, finalPos.z);
            camera.lookAt(0, targetY, 0); // Final look at perfect center
            controls.update();
            
            // Double-check model is still visible and in scene
            if (!sceneRef.children.includes(modelRef)) {
                console.warn('⚠️ Model was removed from scene, re-adding...');
                sceneRef.add(modelRef);
            }
            modelRef.visible = true;
            
            // Final check that model is still the active model
            model = modelRef;
            window.currentModel = modelRef;
            
            // Force a render to ensure everything is visible
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        }
    }
    
    animateFrame();
}

// Helper function to dynamically load scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ===== LIKE FUNCTIONALITY =====

// Update like button state
function updateLikeButtonState(isLiked) {
    console.log('💖 Updating like button state:', isLiked ? 'LIKED' : 'NOT LIKED');
    
    const likeButton = document.getElementById('likeButton');
    if (!likeButton) {
        console.warn('⚠️ Like button not found');
        return;
    }

    if (isLiked) {
        likeButton.classList.add('liked');
    } else {
        likeButton.classList.remove('liked');
    }
}

// Show like feedback
function showLikeFeedback(message, type = 'info', duration = 3000) {
    console.log('📢 Showing feedback:', message, type);
    
    // Create or update feedback element
    let feedback = document.getElementById('feedbackMessage');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'feedbackMessage';
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
        `;
        document.body.appendChild(feedback);
    }

    // Set colors based on type
    switch (type) {
        case 'success':
            feedback.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            feedback.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            feedback.style.backgroundColor = '#ff9800';
            break;
        default:
            feedback.style.backgroundColor = '#2196F3';
    }

    feedback.textContent = message;
    feedback.style.display = 'block';

    // Auto-hide after duration
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
    }, duration);
}

// Check if user has liked the current asset
async function checkUserLikeState() {
    if (!currentAssetId || !currentAsset) {
        console.log('⚠️ No asset loaded, skipping like state check');
        return;
    }
    
    try {
        console.log('💖 Checking user like state for asset:', currentAssetId);
        
        // Check if user is authenticated first
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) {
            console.log('❌ User not authenticated, like state unknown');
            updateLikeButtonState(false);
            return;
        }
        
        // Get user's liked assets
        const response = await fetch(`${getApiBaseUrl()}/auth/liked-assets`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.warn('⚠️ Could not fetch user liked assets:', response.status);
            updateLikeButtonState(false);
            return;
        }
        
        const data = await response.json();
        const likedAssets = data.assets || [];
        
        // Check if current asset is in liked assets
        const isLiked = likedAssets.some(asset => asset._id === currentAssetId);
        currentUserLikeState = isLiked;
        
        console.log('💖 User like state determined:', isLiked ? 'LIKED' : 'NOT LIKED');
        console.log('📊 User has', likedAssets.length, 'liked assets total');
        
        updateLikeButtonState(isLiked);
        
    } catch (error) {
        console.error('❌ Error checking user like state:', error);
        updateLikeButtonState(false);
    }
}

// Handle like button click
async function handleLikeButtonClick() {
    console.log('💖 ===== LIKE BUTTON CLICKED =====');
    console.log('💖 Current asset:', currentAsset?.name);
    console.log('💖 Current like state:', currentUserLikeState);
    
    if (isLikeButtonLoading) {
        console.log('⏳ Like button action already in progress, ignoring click');
        return;
    }
    
    if (!currentAssetId || !currentAsset) {
        console.error('❌ No asset loaded for liking');
        showLikeFeedback('No asset loaded', 'error');
        return;
    }
    
    // Check authentication
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        console.log('❌ User not authenticated, showing login modal');
        if (window.authManager) {
            window.authManager.showLoginModal();
        } else {
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = 'login.html';
        }
        return;
    }
    
    console.log('✅ User authenticated, proceeding with like action');
    
    // Set loading state
    isLikeButtonLoading = true;
    const likeButton = document.getElementById('likeButton');
    if (likeButton) {
        likeButton.classList.add('loading');
    }
    
    try {
        console.log('📡 Making like/unlike API request...');
        
        const response = await fetch(`${getApiBaseUrl()}/auth/like-asset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ assetId: currentAssetId })
        });
        
        console.log('📡 Like API response:', {
            status: response.status,
            ok: response.ok
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Like API error:', errorData);
            throw new Error(errorData.error || 'Failed to update like status');
        }
        
        const data = await response.json();
        const newLikeState = data.isLiked;
        
        console.log('✅ Like action successful:', newLikeState ? 'LIKED' : 'UNLIKED');
        console.log('📊 API response data:', data);
        
        // Update local state and UI
        currentUserLikeState = newLikeState;
        updateLikeButtonState(newLikeState);
        
        // Show user feedback
        const feedbackMessage = newLikeState 
            ? `Added "${currentAsset.name}" to your liked models ❤️` 
            : `Removed "${currentAsset.name}" from your liked models`;
        showLikeFeedback(feedbackMessage, 'success');
        
    } catch (error) {
        console.error('❌ CRITICAL LIKE ERROR:', error);
        console.error('📍 Stack trace:', error.stack);
        
        showLikeFeedback('Failed to update like status. Please try again.', 'error');
        
    } finally {
        // Remove loading state
        isLikeButtonLoading = false;
        if (likeButton) {
            likeButton.classList.remove('loading');
        }
    }
}

// ===== DATA LOADING =====

// Check authentication status
async function checkAuthentication() {
    try {
        console.log('🔐 Checking authentication status...');
        
        const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('📡 Auth check response:', {
            status: response.status,
            ok: response.ok
        });
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ User authenticated:', userData.user.username);
            return true;
        } else {
            console.log('❌ User not authenticated - status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Auth check error:', error);
        return false;
    }
}

// COMPREHENSIVE load asset data
async function loadAssetData() {
    try {
        console.log('📥 ===== LOADING ASSET DATA =====');
        console.log('🔍 Asset ID to load:', currentAssetId);
        
        // Show loading state
        updateAssetInfoOverlay({
            name: 'Loading...',
            userGenerated: 'Loading...',
            topology: 'Loading...',
            polygons: 'Loading...',
            views: 'Loading...',
            downloads: 'Loading...',
            tags: []
        });
        
        // Fetch asset data
        const requestUrl = `${getApiBaseUrl()}/assets/${currentAssetId}`;
        console.log('📡 Making request to:', requestUrl);
        
        const response = await fetch(requestUrl, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('📡 Asset API response status:', response.status);
        console.log('📡 Asset API response ok:', response.ok);
        
        // Handle different response statuses
        if (response.status === 403) {
            console.log('❌ Access forbidden - asset is private');
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                alert('This asset is private. Please log in to view it.');
                if (window.authManager) {
                    window.authManager.showLoginModal();
                } else {
                    sessionStorage.setItem('redirectAfterLogin', window.location.href);
                    window.location.href = 'login.html';
                }
            } else {
                alert('You don\'t have permission to view this private asset.');
                navigateBack();
            }
            return;
        }
        
        if (response.status === 404) {
            console.log('❌ Asset not found');
            alert('Asset not found or has been removed.');
            navigateBack();
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📦 Raw API response:', data);
        
        currentAsset = data.asset;
        
        console.log('✅ Asset data loaded successfully:', currentAsset.name);
        
        // COMPREHENSIVE format detection
        currentAsset.availableFormats = detectAvailableFormats(currentAsset);
        currentAsset.isMeshyGenerated = !!currentAsset.meshyTaskId;
        
        console.log('🎯 Detected available formats:', currentAsset.availableFormats);
        console.log('🤖 Is Meshy generated:', currentAsset.isMeshyGenerated);
        
        // Try to fetch additional format information from server
        try {
            console.log('📡 Fetching server format data...');
            const formatsResponse = await fetch(`${getApiBaseUrl()}/assets/${currentAssetId}/formats`, {
                method: 'GET',
                credentials: 'include'
            });
            
            console.log('📡 Formats API response status:', formatsResponse.status);
            
            if (formatsResponse.ok) {
                const formatsData = await formatsResponse.json();
                console.log('📋 Server format data:', formatsData);
                
                // Use server data if it has more formats than our detection
                if (formatsData.availableFormats && formatsData.availableFormats.length > 0) {
                    if (formatsData.availableFormats.length >= currentAsset.availableFormats.length) {
                        console.log('🔄 Updating formats from server:', 
                            currentAsset.availableFormats, '→', formatsData.availableFormats);
                        currentAsset.availableFormats = formatsData.availableFormats;
                    }
                }
                
                if (formatsData.isMeshyGenerated !== undefined) {
                    currentAsset.isMeshyGenerated = formatsData.isMeshyGenerated;
                }
            } else {
                const errorText = await formatsResponse.text();
                console.warn('⚠️ Could not fetch server format data:', formatsResponse.status, errorText);
            }
        } catch (formatsError) {
            console.warn('⚠️ Error fetching server format data:', formatsError);
        }
        
        console.log('🎯 Final available formats:', currentAsset.availableFormats);
        console.log('📊 Format count:', currentAsset.availableFormats.length);
        
        // Update the asset info overlay
        updateAssetInfoOverlay(currentAsset);
        
        // Set preview image
        setPreviewImage(currentAsset);
        
        // Set up download functionality AFTER asset data is loaded
        setupDownloadHandlers();
        
        // Load the 3D model
        try {
            await load3DModel(currentAsset);
        } catch (modelError) {
            console.error('⚠️ 3D model loading failed, but continuing with asset display:', modelError);
            
            // Show a small warning if downloads are still available
            if (currentAsset.availableFormats && currentAsset.availableFormats.length > 0) {
                showLikeFeedback('3D preview unavailable, but downloads may still work', 'warning', 5000);
            }
        }
        
        // Check user's like state for this asset
        console.log('💖 Checking user like state...');
        await checkUserLikeState();
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR loading asset data:', error);
        console.error('📍 Stack trace:', error.stack);
        alert('Failed to load asset. Please try again.');
        navigateBack();
    }
}

// ===== CLEANUP =====

function cleanup() {
    console.log('🧹 Cleaning up view-asset resources...');
    
    // Cancel animation frame
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Dispose of Three.js resources
    if (renderer) {
        renderer.dispose();
    }
    
    if (pmremGenerator) {
        pmremGenerator.dispose();
    }
    
    if (scene) {
        scene.traverse((child) => {
            // Don't dispose the current model if it's still being viewed
            if (child === model || child === window.currentModel) {
                return;
            }
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
    
    // Clear global variables
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    model = null;
    pmremGenerator = null;
}

// ===== INITIALIZATION =====

// Make toggleMobileNav globally available
window.toggleMobileNav = toggleMobileNav;

// Make init3DScene globally available to prevent duplicate initialization
window.init3DScene = init3DScene;

// Add window resize listener
window.addEventListener('resize', onWindowResize);

// Add cleanup on page unload - but not on navigation
window.addEventListener('beforeunload', (event) => {
    // Only cleanup if actually leaving the site
    if (event.type === 'beforeunload') {
        console.log('🧹 Page unloading, running cleanup...');
        cleanup();
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 ===== VIEW ASSET PAGE INITIALIZING =====');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📡 API Base URL:', getApiBaseUrl());
    console.log('🔍 Three.js available:', typeof THREE !== 'undefined');
    
    const urlParams = new URLSearchParams(window.location.search);
    currentAssetId = urlParams.get('id');
    sourceRef = urlParams.get('from');
    
    console.log('📋 URL Parameters:');
    console.log('  - Asset ID:', currentAssetId);
    console.log('  - Source reference:', sourceRef);
    console.log('  - Full URL:', window.location.href);
    console.log('  - Search params:', window.location.search);
    
    if (!currentAssetId) {
        console.error('❌ CRITICAL: No asset ID provided in URL');
        alert('No asset specified. Redirecting to homepage.');
        window.location.href = 'homepage.html';
        return;
    }
    
    console.log('🎬 Initializing 3D scene...');
    const sceneInitialized = init3DScene();
    if (!sceneInitialized) {
        console.warn('⚠️ 3D scene initialization failed, continuing without 3D preview');
        showLikeFeedback('3D preview unavailable - Three.js library may be missing', 'warning', 5000);
    }
    
    console.log('💖 Initializing like button...');
    initializeLikeButton();
    
    console.log('📥 Loading asset data...');
    await loadAssetData();
    
    console.log('🔙 Setting up back button...');
    setupBackButton();
    
    console.log('✅ VIEW ASSET PAGE INITIALIZATION COMPLETE');
    console.log('📊 Initialization status:', {
        sceneInitialized: !!scene,
        assetLoaded: !!currentAsset,
        threeJsAvailable: typeof THREE !== 'undefined'
    });
});

// Make functions globally available for debugging
window.debugCurrentAsset = () => currentAsset;
window.debugCurrentAssetId = () => currentAssetId;
window.debugDetectFormats = detectAvailableFormats;
window.debugDownloadRegular = downloadRegularAsset;
window.debugDownloadMeshy = downloadMeshyAsset;
window.debugNavigateBack = navigateBack;
window.debugCheckAuth = checkAuthentication;
window.debugLikeState = () => currentUserLikeState;
window.debugCheckLikeState = checkUserLikeState;
window.debugHandleLike = handleLikeButtonClick;
window.debugApiUrl = getApiBaseUrl;
window.debugScene = () => scene;
window.debugModel = () => model;

console.log('🚨 =====================================');
console.log('🚨 VIEW ASSET SCRIPT LOADED COMPLETELY');
console.log('🚨 =====================================');