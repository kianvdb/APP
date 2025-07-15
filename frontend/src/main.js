// main.js - Complete production version with full generate functionality and drag & drop
let scene, camera, renderer, controls, model;
let currentTaskId;
let currentAssetId = null;
let isAssetSaved = false;
let selectedTopology = 'triangle';
let selectedTexture = 'true';
let selectedSymmetry = 'auto';
let enablePBR = false;
let selectedPolycount = 30000;
let dogFactOverlay;
let factInterval;
let factIndex = 0;
let randomizedDogFacts = []; 
let composer, renderPass, bloomPass, ssaoPass;
let pmremGenerator;

// Store original image for auto-save
let currentImageBase64 = null;
let currentGenerationData = null;

// API Configuration - Protocol-aware URL
const getApiBaseUrl = () => {
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
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔧 API Base URL:', API_BASE_URL);

// Three.js initialization to match view-asset style
function initializeThreeJS() {
    console.log('🎯 Initializing Three.js...');
    
    const canvas = document.getElementById('3dCanvas');
    if (!canvas) {
        console.error('❌ Canvas element not found!');
        return false;
    }
    
    console.log('✅ Canvas element found:', canvas);
    console.log('📐 Canvas computed style:', window.getComputedStyle(canvas));
    
    // Check if Three.js is properly loaded
    if (typeof THREE === 'undefined') {
        console.error('❌ THREE.js is not loaded!');
        return false;
    }
    
    if (typeof THREE.OrbitControls === 'undefined') {
        console.warn('⚠️ OrbitControls not loaded, controls will be limited');
    }
    
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.warn('⚠️ GLTFLoader not loaded, model loading may fail');
    }
    
    // Scene setup - EXACT same as view-asset.js
    scene = new THREE.Scene();
    console.log('✅ Scene created');
    
    // High-quality gradient background (EXACT copy from view-asset.js)
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
    console.log('✅ Scene background and fog set');
    
    // Use natural canvas dimensions
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 500;
    
    console.log('📐 Canvas dimensions:', width, 'x', height);
    console.log('📐 Canvas rect:', rect);
    
    // Camera setup with better perspective for depth
    const aspect = width / height;
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    camera.position.set(0, 3, 12);
    console.log('✅ Camera created at position:', camera.position);
    
    // Enhanced high-quality renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        precision: "highp",
        logarithmicDepthBuffer: true
    });
    
    console.log('✅ Renderer created');
    
    renderer.setSize(width, height);
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
    
    console.log('✅ Renderer configured');
    
    // Store the overlays before clearing
    const dogFactOverlay = document.getElementById("dogFactOverlay");
    const generationOverlay = document.getElementById("generationOverlay");
    const likeButtonContainer = document.getElementById("likeButtonContainer");
    
    // Clear any existing canvas
    while (canvas.firstChild) {
        canvas.removeChild(canvas.firstChild);
    }
    
    console.log('✅ Canvas cleared');
    
    // Style the renderer canvas
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.background = 'transparent';
    
    // Append renderer to canvas
    canvas.appendChild(renderer.domElement);
    console.log('✅ Renderer added to canvas');
    console.log('📐 Renderer size:', renderer.getSize(new THREE.Vector2()));
    
    // Ensure overlays stay in place
    if (dogFactOverlay && !canvas.contains(dogFactOverlay)) {
        canvas.appendChild(dogFactOverlay);
        console.log('✅ Dog fact overlay restored');
    }
    if (generationOverlay && !canvas.contains(generationOverlay)) {
        canvas.appendChild(generationOverlay);
        console.log('✅ Generation overlay restored');
    }
    if (likeButtonContainer && !canvas.contains(likeButtonContainer)) {
        canvas.appendChild(likeButtonContainer);
        console.log('✅ Like button container restored');
    }
    
    // Setup environment for reflections
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(scene).texture;
    console.log('✅ Environment setup complete');
    
    // UPDATED lighting to match view-asset darker style
    setupDarkerStudioLighting();
    console.log('✅ Darker studio lighting setup complete');
    
    // UPDATED ground to match view-asset style
    setupDarkerHighQualityGround();
    console.log('✅ Darker ground and grid setup complete');
    
    // Enhanced controls for better depth perception
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.5, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.5;
        controls.minDistance = 3;
        controls.maxDistance = 25;
        controls.maxPolarAngle = Math.PI / 2 - 0.05;
        controls.minPolarAngle = Math.PI / 6;
        controls.update();
        console.log('✅ Enhanced OrbitControls initialized');
    } else {
        console.warn('⚠️ OrbitControls not available');
    }
    
    // Scene is ready for 3D model loading
    console.log('✅ Scene initialized and ready');
    
    // Test render to make sure everything works
    renderer.render(scene, camera);
    console.log('✅ Test render completed');
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        if (controls) {
            controls.update();
        }
        
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }
    
    animate();
    console.log('✅ Animation loop started');
    
    // Handle window resize
    function handleResize() {
        const newRect = canvas.getBoundingClientRect();
        const newWidth = newRect.width || 800;
        const newHeight = newRect.height || 500;
        
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        
        if (composer) {
            composer.setSize(newWidth, newHeight);
        }
        
        console.log('📐 Resized:', newWidth, 'x', newHeight);
    }
    
    window.addEventListener('resize', handleResize);
    
    return true;
}

// DARKER STUDIO LIGHTING to match view-asset
function setupDarkerStudioLighting() {
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
}

// DARKER GROUND to match view-asset exactly
function setupDarkerHighQualityGround() {
    // Remove old ground/grid
    scene.traverse((child) => {
        if (child instanceof THREE.GridHelper || child.userData.isGround) {
            scene.remove(child);
        }
    });

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

    // Subtle grid
    const gridHelper = new THREE.GridHelper(20, 40, 0x444444, 0x222222);
    gridHelper.position.y = -0.94;
    scene.add(gridHelper);
}

// ENHANCED MODEL LOADING
async function loadModel(url) {
    try {
        console.log('🎨 Loading model from:', url);
        
        const response = await fetch(url);
        const contentType = response.headers.get("Content-Type");
        const isGLB = contentType?.includes("model/gltf-binary");

        if (!response.ok || !isGLB) {
            console.error("❌ No valid model:", await response.text());
            return false;
        }

        const arrayBuffer = await response.arrayBuffer();
        const loader = new THREE.GLTFLoader();

        return new Promise((resolve) => {
            loader.parse(arrayBuffer, '', (gltf) => {
                console.log('✅ Model loaded successfully');
                
                // Remove old model groups
                scene.children = scene.children.filter(obj => !(obj instanceof THREE.Group) || obj.userData.isGround);

                const model = gltf.scene;

                // Enhanced material quality
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

                // Start small and animate scale
                model.scale.set(0.01, 0.01, 0.01);
                model.rotation.y = 0;

                scene.add(model);
                
                // Store reference for cleanup
                window.currentModel = model;
                
                // Animate scale and rotation
                animateModelIn(model);
                
                // Position camera to frame model
                setTimeout(() => frameModel(model), 100);

                resolve(true);
            }, (err) => {
                console.error("❌ GLTF parse error:", err);
                resolve(false);
            });
        });
    } catch (e) {
        console.error("❌ Loading failed:", e);
        return false;
    }
}

function animateModelIn(model) {
    const startTime = Date.now();
    const duration = 2000;
    
    // Calculate ground position based on final scale
    const tempScale = model.scale.x;
    model.scale.set(1, 1, 1);
    const box = new THREE.Box3().setFromObject(model);
    const groundY = -0.95 - box.min.y;  // ✅ ADD -0.95 for ground plane
    model.scale.set(tempScale, tempScale, tempScale);
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const scale = 0.01 + (1 - 0.01) * eased;
        model.scale.set(scale, scale, scale);
        
        // Keep model on ground throughout animation
        model.position.y = groundY;  // Now correctly positioned on ground
        
        model.rotation.y = (Math.PI * 4 + Math.PI * 0.25) * eased;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// SMART CAMERA FRAMING
function frameModel(model) {
    // Wait a bit for the model to be properly positioned
    setTimeout(() => {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        
        // Calculate optimal camera distance
        let targetDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.5;
        targetDistance = Math.max(targetDistance, 3);

        // Position camera at eye level
        const eyeLevel = center.y + size.y * 0.1;

        const newPos = {
            x: center.x,
            y: eyeLevel,
            z: center.z + targetDistance,
        };

        // Smooth camera animation
        const startTime = Date.now();
        const duration = 2000;
        const startPos = { ...camera.position };
        
        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const eased = 1 - Math.pow(1 - progress, 2);
            
            camera.position.x = startPos.x + (newPos.x - startPos.x) * eased;
            camera.position.y = startPos.y + (newPos.y - startPos.y) * eased;
            camera.position.z = startPos.z + (newPos.z - startPos.z) * eased;
            
            camera.lookAt(center);
            controls.target.copy(center);
            controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        
        animate();
    }, 500); // Give the model time to settle
}

// Initialize image upload handler with drag & drop support
function initImageUploadHandler() {
    const imageInput = document.getElementById("imageInput");
    const uploadArea = document.querySelector('.upload-area');
    
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
        console.log('📸 Image upload handler initialized');
    }
    
    if (uploadArea) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        // Handle dropped files
        uploadArea.addEventListener('drop', handleDrop, false);
        
        console.log('🎯 Drag & drop handler initialized');
    }
}

// Prevent default drag behaviors
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Add highlight class when dragging over
function highlight(e) {
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.classList.add('drag-over');
}

// Remove highlight class
function unhighlight(e) {
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.classList.remove('drag-over');
}

// Handle dropped files
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        const file = files[0];
        
        // Check if it's an image
        if (file.type.startsWith('image/')) {
            console.log('🎯 Image dropped:', file.name);
            
            // Update the file input
            const imageInput = document.getElementById("imageInput");
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            imageInput.files = dataTransfer.files;
            
            // Process the image
            processImageFile(file);
        } else {
            console.warn('⚠️ Dropped file is not an image:', file.type);
            showNotificationToast('Please drop an image file', 'warning');
        }
    }
}

// Process image file (shared between click upload and drag & drop)
function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImageBase64 = e.target.result;
        
        const uploadPreview = document.getElementById('uploadPreview');
        const uploadText = document.querySelector('.upload-text');
        const uploadIcon = document.querySelector('.upload-icon');
        
        if (uploadPreview) {
            uploadPreview.style.backgroundImage = `url(${currentImageBase64})`;
            uploadPreview.classList.add('visible');
        }
        
        // Hide upload text and icon when image is loaded
        if (uploadText) {
            uploadText.style.display = 'none';
        }
        if (uploadIcon) {
            uploadIcon.style.display = 'none';
        }
        
        // Enable controls and generate button
        const controlsSidebar = document.querySelector('.controls-sidebar');
        const generateBtn = document.getElementById('generateBtn');
        
        if (controlsSidebar) {
            // Enable controls with smooth animation (matching flow.js behavior)
            setTimeout(() => {
                controlsSidebar.classList.remove('disabled');
                if (generateBtn) {
                    generateBtn.disabled = false;
                }
                
                // Update dropdown disabled state (if the function exists from flow.js)
                if (typeof updateDropdownDisabledState === 'function') {
                    updateDropdownDisabledState();
                }
                
                // Show PBR controls if texture is set to true
                const textureDropdown = document.getElementById('textureDropdown');
                if (textureDropdown) {
                    const currentTextureValue = textureDropdown.querySelector('.dropdown-value').textContent;
                    if (currentTextureValue === 'Yes') {
                        const pbrButtons = document.getElementById("pbrButtons");
                        if (pbrButtons) {
                            pbrButtons.classList.remove('hidden');
                        }
                    }
                }
            }, 100);
        }
        
        console.log('✅ Image processed and ready for generation');
    };
    
    reader.readAsDataURL(file);
}

// Handle image upload and store base64 for later auto-save
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('📷 Image uploaded:', file.name);
    processImageFile(file);
}

// Auto-save function with complete generation parameters
async function handleGenerationComplete(generationData) {
    try {
        console.log('🎉 Generation complete - Auto-saving to database...');
        
        const {
            taskId,
            modelUrl,
            name,
            breed,
            originalImageBase64,
            previewImageUrl,
            polygons,
            description
        } = generationData;

        // Get current generation parameters
        const currentParams = {
            topology: window.selectedTopology || selectedTopology,
            texture: window.selectedTexture || selectedTexture,
            symmetry: window.selectedSymmetry || selectedSymmetry,
            pbr: window.enablePBR || enablePBR,
            polycount: window.selectedPolycount || selectedPolycount
        };

        console.log('💾 Saving with generation parameters:', currentParams);
        
        // Try to create via from-meshy endpoint first
        try {
            const fromMeshyResponse = await fetch(`${API_BASE_URL}/assets/from-meshy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    taskId: taskId,
                    name: name || getCurrentModelName(),
                    breed: breed || getCurrentBreed(),
                    icon: '🐕',
                    modelUrl: modelUrl,
                    polygons: currentParams.polycount,
                    description: description || getCurrentDescription(),
                    tags: 'generated,meshy,ai,auto-saved',
                    originalImageBase64: originalImageBase64,
                    previewImageUrl: previewImageUrl,
                    isPublic: false,
                    
                    // Include generation parameters
                    topology: currentParams.topology,
                    texture: currentParams.texture === 'true',
                    symmetry: currentParams.symmetry,
                    pbr: currentParams.pbr
                })
            });
            
            if (fromMeshyResponse.ok) {
                const meshyAsset = await fromMeshyResponse.json();
                console.log('✅ Asset created via from-meshy endpoint:', meshyAsset.asset._id);
                
                currentAssetId = meshyAsset.asset._id;
                isAssetSaved = true;
                currentGenerationData = meshyAsset.asset;
                
                return meshyAsset.asset;
            }
        } catch (meshyError) {
            console.log('⚠️ from-meshy endpoint failed, trying saveAsset...');
        }
        
        // Fallback to saveAsset endpoint
        const saveResponse = await fetch(`${API_BASE_URL}/saveAsset/${taskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: name || getCurrentModelName(),
                breed: breed || getCurrentBreed(),
                description: description || getCurrentDescription(),
                isPublic: false,
                isUserGenerated: true,
                autoSaved: true,
                
                // Include all generation parameters
                topology: currentParams.topology,
                texture: currentParams.texture === 'true',
                symmetry: currentParams.symmetry,
                pbr: currentParams.pbr,
                polygons: currentParams.polycount,
                
                generationMetadata: {
                    topology: currentParams.topology,
                    hasTexture: currentParams.texture === 'true',
                    symmetry: currentParams.symmetry,
                    pbrEnabled: currentParams.pbr,
                    targetPolycount: currentParams.polycount,
                    generatedAt: new Date().toISOString(),
                    isMeshyGenerated: true,
                    autoSaved: true
                }
            })
        });
        
        if (saveResponse.ok) {
            const savedAsset = await saveResponse.json();
            console.log('✅ Generation auto-saved with parameters:', savedAsset.asset._id);
            
            currentAssetId = savedAsset.asset._id;
            isAssetSaved = true;
            currentGenerationData = savedAsset.asset;
            
            return savedAsset.asset;
        } else {
            console.error('❌ Failed to auto-save generation:', await saveResponse.text());
        }
        
    } catch (error) {
        console.error('❌ Error auto-saving generation:', error);
    }
}

// Helper functions for auto-save
function getCurrentModelName() {
    const nameInput = document.getElementById('modelName') || 
                     document.getElementById('name') || 
                     document.querySelector('input[name="name"]');
    return nameInput ? nameInput.value.trim() || `Generated Model ${Date.now()}` : `Generated Model ${Date.now()}`;
}

function getCurrentBreed() {
    const breedInput = document.getElementById('breed') || 
                      document.getElementById('breedSelect') || 
                      document.querySelector('select[name="breed"]');
    return breedInput ? breedInput.value.trim() || 'Mixed Breed' : 'Mixed Breed';
}

function getCurrentPolygons() {
    return selectedPolycount || 30000;
}

function getCurrentDescription() {
    const descInput = document.getElementById('description') || 
                     document.querySelector('textarea[name="description"]');
    return descInput ? descInput.value.trim() || `AI-generated 3D dog model created on ${new Date().toLocaleDateString()}` 
                     : `AI-generated 3D dog model created on ${new Date().toLocaleDateString()}`;
}

// Initialize like button functionality
function initLikeButton() {
    const likeButton = document.getElementById('likeButton');
    
    if (likeButton) {
        likeButton.addEventListener('click', handleLikeClick);
        console.log('💖 Like button initialized');
    } else {
        console.warn('⚠️ Like button not found');
    }
}

// Handle like button click
async function handleLikeClick() {
    console.log('💖 Like button clicked');
    
    // Check if user is authenticated
    if (!window.authManager || !window.authManager.isAuthenticated()) {
        console.log('❌ User not authenticated, showing login modal');
        if (window.authManager) {
            window.authManager.showLoginModal();
        } else {
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = 'login.html';
        }
        return;
    }
    
    // If no asset exists or not saved, show save modal
    if (!currentAssetId || !isAssetSaved) {
        console.log('💾 No asset saved yet - showing save modal');
        showSaveModelModal();
        return;
    }
    
    // If asset exists and is saved, toggle like status
    try {
        console.log('💖 Toggling like for auto-saved asset:', currentAssetId);
        
        const response = await fetch(`${API_BASE_URL}/auth/like-asset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ assetId: currentAssetId })
        });
        
        if (response.ok) {
            const data = await response.json();
            const isLiked = data.isLiked;
            
            console.log('💖 Like toggled successfully:', isLiked ? 'liked' : 'unliked');
            updateLikeButtonState(isLiked);
            
        } else {
            const errorData = await response.json();
            console.error('❌ Error toggling like:', errorData);
        }
        
    } catch (error) {
        console.error('❌ Error in like functionality:', error);
    }
}

// Update like button visual state
function updateLikeButtonState(isLiked) {
    const likeButton = document.getElementById('likeButton');
    if (!likeButton) return;
    
    if (isLiked) {
        likeButton.classList.add('liked');
        likeButton.title = 'Remove from liked models';
    } else {
        likeButton.classList.remove('liked');
        likeButton.title = 'Add to liked models';
    }
}

// Show like button with animation
function showLikeButton() {
    const likeButtonContainer = document.getElementById('likeButtonContainer');
    if (likeButtonContainer) {
        likeButtonContainer.style.display = 'block';
        likeButtonContainer.offsetHeight;
        
        setTimeout(() => {
            likeButtonContainer.classList.add('visible', 'pulse');
            
            setTimeout(() => {
                likeButtonContainer.classList.remove('pulse');
            }, 800);
        }, 50);
        
        console.log('💖 Like button shown and visible');
    }
}

// Hide like button
function hideLikeButton() {
    const likeButtonContainer = document.getElementById('likeButtonContainer');
    if (likeButtonContainer) {
        likeButtonContainer.classList.remove('visible', 'pulse');
        setTimeout(() => {
            likeButtonContainer.style.display = 'none';
        }, 300);
        
        console.log('💖 Like button hidden');
    }
}

// Show save model modal
function showSaveModelModal() {
    const modal = document.getElementById('saveModelModal');
    const nameInput = document.getElementById('modelNameInput');
    
    if (modal && nameInput) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('visible');
            nameInput.focus();
        }, 10);
        
        console.log('💾 Save model modal shown');
    }
}

// Hide save model modal
function hideSaveModelModal() {
    const modal = document.getElementById('saveModelModal');
    const nameInput = document.getElementById('modelNameInput');
    
    if (modal && nameInput) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            nameInput.value = '';
        }, 300);
        
        console.log('💾 Save model modal hidden');
    }
}

// Handle save model with complete generation parameters
async function handleSaveModel() {
    const nameInput = document.getElementById('modelNameInput');
    const saveBtn = document.getElementById('saveModelBtn');
    
    if (!nameInput || !saveBtn) return;
    
    const modelName = nameInput.value.trim();
    if (!modelName) return;
    
    if (!currentTaskId) return;
    
    try {
        console.log('💾 Saving model with custom name:', modelName);
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // Get current generation parameters
        const currentParams = {
            topology: window.selectedTopology || selectedTopology,
            texture: window.selectedTexture || selectedTexture,
            symmetry: window.selectedSymmetry || selectedSymmetry,
            pbr: window.enablePBR || enablePBR,
            polycount: window.selectedPolycount || selectedPolycount
        };

        const response = await fetch(`${API_BASE_URL}/saveAsset/${currentTaskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: modelName,
                breed: getCurrentBreed(),
                description: `AI-generated 3D dog model: ${modelName}`,
                isPublic: false,
                isUserGenerated: true,
                
                // Include all generation parameters  
                topology: currentParams.topology,
                texture: currentParams.texture === 'true',
                symmetry: currentParams.symmetry,
                pbr: currentParams.pbr,
                polygons: currentParams.polycount,
                
                generationMetadata: {
                    topology: currentParams.topology,
                    hasTexture: currentParams.texture === 'true',
                    symmetry: currentParams.symmetry,
                    pbrEnabled: currentParams.pbr,
                    targetPolycount: currentParams.polycount,
                    generatedAt: new Date().toISOString(),
                    isMeshyGenerated: true,
                    customNamed: true
                }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Model saved with custom name and parameters:', data);
            
            if (data.asset && data.asset._id) {
                currentAssetId = data.asset._id;
                isAssetSaved = true;
                console.log('💖 Current asset ID set:', currentAssetId);
                
                hideSaveModelModal();
                
                // Automatically like the saved model
                try {
                    const likeResponse = await fetch(`${API_BASE_URL}/auth/like-asset`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({ assetId: currentAssetId })
                    });
                    
                    if (likeResponse.ok) {
                        const likeData = await likeResponse.json();
                        console.log('💖 Model automatically liked:', likeData.isLiked);
                        
                        showLikeButton();
                        setTimeout(() => {
                            updateLikeButtonState(true);
                        }, 500);
                        
                    } else {
                        console.error('❌ Error auto-liking model');
                        showLikeButton();
                    }
                } catch (likeError) {
                    console.error('❌ Error auto-liking model:', likeError);
                    showLikeButton();
                }
            }
            
        } else {
            const errorData = await response.json();
            console.error('❌ Error saving model:', errorData);
        }
        
    } catch (error) {
        console.error('❌ Error in save model:', error);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Model';
        }
    }
}

// Randomize dog facts array
function randomizeDogFacts() {
    if (!window.dogFacts || !window.dogFacts.length) {
        console.warn("⚠️ dogFacts array is empty or not defined.");
        return [];
    }
    
    randomizedDogFacts = [...window.dogFacts];
    for (let i = randomizedDogFacts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [randomizedDogFacts[i], randomizedDogFacts[j]] = [randomizedDogFacts[j], randomizedDogFacts[i]];
    }
    console.log("🔀 Dog facts randomized");
    return randomizedDogFacts;
}

// Clear previous model from scene
function clearPreviousModel() {
    const objectsToRemove = [];
    scene.traverse((child) => {
        if (child instanceof THREE.Group && child !== scene) {
            objectsToRemove.push(child);
        }
    });
    
    objectsToRemove.forEach((object) => {
        scene.remove(object);
    });
    
    console.log('🧹 Previous model cleared from scene');
}

// Show generation overlay
function showGenerationOverlay() {
    const generationOverlay = document.getElementById('generationOverlay');
    if (generationOverlay) {
        generationOverlay.style.display = 'flex';
        generationOverlay.classList.add('visible');
    }
}

// Hide generation overlay
function hideGenerationOverlay() {
    const generationOverlay = document.getElementById('generationOverlay');
    if (generationOverlay) {
        generationOverlay.classList.remove('visible');
        setTimeout(() => {
            generationOverlay.style.display = 'none';
        }, 500);
    }
}

// Show scanning overlay
function showScanningOverlay() {
    const scanningOverlay = document.getElementById('scanningOverlay');
    if (scanningOverlay) {
        scanningOverlay.classList.add('visible');
        console.log('🔍 Scanning overlay shown');
    }
}

// Hide scanning overlay
function hideScanningOverlay() {
    const scanningOverlay = document.getElementById('scanningOverlay');
    if (scanningOverlay) {
        scanningOverlay.classList.remove('visible');
        console.log('🔍 Scanning overlay hidden');
    }
}

// Add dark overlay to 3D canvas
function addDarkOverlay() {
    let darkOverlay = document.getElementById('canvasDarkOverlay');
    if (!darkOverlay) {
        darkOverlay = document.createElement('div');
        darkOverlay.id = 'canvasDarkOverlay';
        darkOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9995;
            opacity: 0;
            transition: opacity 0.5s ease;
            pointer-events: none;
        `;
        document.getElementById('3dCanvas').appendChild(darkOverlay);
    }
    
    setTimeout(() => {
        darkOverlay.style.opacity = '1';
    }, 10);
}

// Remove dark overlay
function removeDarkOverlay() {
    const darkOverlay = document.getElementById('canvasDarkOverlay');
    if (darkOverlay) {
        darkOverlay.style.opacity = '0';
        setTimeout(() => {
            if (darkOverlay.parentNode) {
                darkOverlay.parentNode.removeChild(darkOverlay);
            }
        }, 500);
    }
}

// Show error overlay when no dog is detected
function showNoDogFoundOverlay() {
    let errorOverlay = document.getElementById('noDogErrorOverlay');
    if (!errorOverlay) {
        errorOverlay = document.createElement('div');
        errorOverlay.id = 'noDogErrorOverlay';
        errorOverlay.style.cssText = `
            display: flex;
            background-color: transparent;
            color: white;
            font-size: 1rem;
            font-weight: 600;
            text-align: center;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9998;
            transition: opacity 0.5s ease;
            opacity: 0;
            visibility: hidden;
            padding: 15px;
            box-sizing: border-box;
            pointer-events: none;
            max-width: 100%;
            max-height: 100%;
        `;
        
        errorOverlay.innerHTML = `
            <div class="error-content" style="
                background: radial-gradient(circle, rgba(220, 38, 127, 0.15) 0%, transparent 70%);
                color: #dc267f;
                padding: 20px 24px;
                border-radius: 12px;
                max-width: 90%;
                margin: 0 auto;
                line-height: 1.6;
                word-wrap: break-word;
                box-sizing: border-box;
                font-family: 'Sora', sans-serif;
                text-shadow: 0 0 20px rgba(220, 38, 127, 0.8), 0 0 40px rgba(220, 38, 127, 0.4);
                font-weight: 700;
                animation: redGlow 2s ease-in-out infinite alternate;
            ">
                <div class="error-title" style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">
                    ❌ No Dog Detected
                </div>
                <div class="error-subtitle" style="font-size: 0.95rem; font-weight: 500; opacity: 0.9;">
                    Please upload a clearer image with a dog
                </div>
            </div>
        `;
        
        document.getElementById('3dCanvas').appendChild(errorOverlay);
        
        // Add red glow animation keyframes
        if (!document.getElementById('redGlowKeyframes')) {
            const style = document.createElement('style');
            style.id = 'redGlowKeyframes';
            style.textContent = `
                @keyframes redGlow {
                    0% { 
                        text-shadow: 0 0 20px rgba(220, 38, 127, 0.8), 0 0 40px rgba(220, 38, 127, 0.4);
                        transform: scale(1);
                    }
                    100% { 
                        text-shadow: 0 0 30px rgba(220, 38, 127, 1), 0 0 60px rgba(220, 38, 127, 0.6);
                        transform: scale(1.02);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    errorOverlay.style.opacity = '1';
    errorOverlay.style.visibility = 'visible';
    
    console.log('❌ No dog found overlay shown');
}

// Hide error overlay
function hideNoDogFoundOverlay() {
    const errorOverlay = document.getElementById('noDogErrorOverlay');
    if (errorOverlay) {
        errorOverlay.style.opacity = '0';
        errorOverlay.style.visibility = 'hidden';
        console.log('❌ No dog found overlay hidden');
    }
}

// Show general error overlay 
function showErrorOverlay(message) {
    let errorOverlay = document.getElementById('generalErrorOverlay');
    if (!errorOverlay) {
        errorOverlay = document.createElement('div');
        errorOverlay.id = 'generalErrorOverlay';
        errorOverlay.style.cssText = `
            display: flex;
            background-color: transparent;
            color: white;
            font-size: 1rem;
            font-weight: 600;
            text-align: center;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9998;
            transition: opacity 0.5s ease;
            opacity: 0;
            visibility: hidden;
            padding: 15px;
            box-sizing: border-box;
            pointer-events: none;
            max-width: 100%;
            max-height: 100%;
        `;
        
        document.getElementById('3dCanvas').appendChild(errorOverlay);
    }
    
    errorOverlay.innerHTML = `
        <div class="error-content" style="
            background: radial-gradient(circle, rgba(220, 38, 127, 0.15) 0%, transparent 70%);
            color: #dc267f;
            padding: 20px 24px;
            border-radius: 12px;
            max-width: 90%;
            margin: 0 auto;
            line-height: 1.6;
            word-wrap: break-word;
            box-sizing: border-box;
            font-family: 'Sora', sans-serif;
            text-shadow: 0 0 20px rgba(220, 38, 127, 0.8), 0 0 40px rgba(220, 38, 127, 0.4);
            font-weight: 700;
            animation: redGlow 2s ease-in-out infinite alternate;
        ">
            <div class="error-title" style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">
                ❌ ${message}
            </div>
            <div class="error-subtitle" style="font-size: 0.95rem; font-weight: 500; opacity: 0.9;">
                Please try again
            </div>
        </div>
    `;
    
    errorOverlay.style.opacity = '1';
    errorOverlay.style.visibility = 'visible';
    
    console.log('❌ Error overlay shown:', message);
}

// Hide general error overlay
function hideErrorOverlay() {
    const errorOverlay = document.getElementById('generalErrorOverlay');
    if (errorOverlay) {
        errorOverlay.style.opacity = '0';
        errorOverlay.style.visibility = 'hidden';
        console.log('❌ Error overlay hidden');
    }
}

// Start dog facts display
function startDogFacts() {
    // Check if dogFacts is available, if not use fallback facts
    if (!window.dogFacts || !window.dogFacts.length) {
        console.warn("⚠️ dogFacts array is empty or not defined. Using fallback facts.");
        // Fallback dog facts if the external file isn't loaded
        window.dogFacts = [
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
    
    clearPreviousModel();
    randomizeDogFacts();
    
    let dogFactOverlay = document.getElementById('dogFactOverlay');
    if (!dogFactOverlay) {
        console.log("🐾 dogFactOverlay not found, creating...");
        dogFactOverlay = document.createElement('div');
        dogFactOverlay.id = 'dogFactOverlay';
        document.getElementById('3dCanvas').appendChild(dogFactOverlay);
    }

    console.log("▶️ startDogFacts() started.");
    
    // Show generation message first
    showGenerationOverlay();
    addDarkOverlay();
    
    // Add blue styling to generation overlay
    const generationOverlay = document.getElementById('generationOverlay');
    if (generationOverlay) {
        generationOverlay.innerHTML = `
            <div class="generation-content" style="
                background: radial-gradient(circle, rgba(0, 188, 212, 0.15) 0%, transparent 70%);
                color: #00bcd4 !important;
                padding: 20px 24px;
                border-radius: 12px;
                max-width: 90%;
                margin: 0 auto;
                line-height: 1.6;
                word-wrap: break-word;
                box-sizing: border-box;
                font-family: 'Sora', sans-serif;
                text-shadow: 0 0 20px rgba(0, 188, 212, 0.8), 0 0 40px rgba(0, 188, 212, 0.4);
                font-weight: 700;
                animation: blueGlow 2s ease-in-out infinite alternate;
                text-align: center;
                position: relative;
            ">
                <div class="generation-title" style="
                    font-size: 1.2rem; 
                    font-weight: 700; 
                    margin-bottom: 0.5rem;
                    color: #00bcd4;
                ">
                    Generation Started!
                </div>
                <div class="generation-subtitle" style="
                    font-size: 0.95rem; 
                    font-weight: 500; 
                    opacity: 0.9;
                    color: #00bcd4;
                ">
                    Here are some dogfacts while you wait..
                </div>
            </div>
        `;
        
        // Add glowing animation keyframes
        if (!document.getElementById('blueGlowKeyframes')) {
            const style = document.createElement('style');
            style.id = 'blueGlowKeyframes';
            style.textContent = `
                @keyframes blueGlow {
                    0% { 
                        text-shadow: 0 0 20px rgba(0, 188, 212, 0.8), 0 0 40px rgba(0, 188, 212, 0.4);
                        transform: scale(1);
                    }
                    100% { 
                        text-shadow: 0 0 30px rgba(0, 188, 212, 1), 0 0 60px rgba(0, 188, 212, 0.6);
                        transform: scale(1.02);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // After showing generation message, wait 3 seconds then start dog facts
    setTimeout(() => {
        const genOverlay = document.getElementById('generationOverlay');
        if (genOverlay) {
            genOverlay.style.opacity = '0';
            setTimeout(() => {
                hideGenerationOverlay();
            }, 500);
        }
        
        factIndex = 0;
        
        // Set content and make visible
        dogFactOverlay.innerHTML = `<p>${randomizedDogFacts[factIndex]}</p>`;
        dogFactOverlay.style.display = 'flex';
        
        setTimeout(() => {
            dogFactOverlay.classList.add('visible');
            console.log("🐾 Overlay made visible with first fact:", randomizedDogFacts[factIndex]);
        }, 10);

        // Start interval to cycle through facts
        if (factInterval) {
            clearInterval(factInterval);
        }
        
        factInterval = setInterval(() => {
            factIndex = (factIndex + 1) % randomizedDogFacts.length;
            dogFactOverlay.innerHTML = `<p>${randomizedDogFacts[factIndex]}</p>`;
            console.log(`🐾 New dog fact shown: ${randomizedDogFacts[factIndex]}`);
        }, 5000);
    }, 3000);
}

// Stop dog facts display
function stopDogFacts() {
    console.log("⏹️ stopDogFacts() started.");
    
    if (factInterval) {
        clearInterval(factInterval);
        factInterval = null;
        console.log("⏹️ Interval stopped.");
    }
    
    hideGenerationOverlay();
    
    const dogFactOverlay = document.getElementById('dogFactOverlay');
    if (dogFactOverlay) {
        dogFactOverlay.classList.remove('visible');
        
        setTimeout(() => {
            if (dogFactOverlay) {
                dogFactOverlay.style.display = 'none';
                dogFactOverlay.innerHTML = '';
            }
        }, 600);
        
        console.log("🐾 Overlay hidden.");
    } else {
        console.warn("⚠️ dogFactOverlay not available in stopDogFacts.");
    }
    
    removeDarkOverlay();
}

// Show progress section
function showProgressSection() {
    const progressSection = document.querySelector('.progress-section');
    if (progressSection) {
        progressSection.classList.add('visible');
    }
}

// Hide progress section
function hideProgressSection() {
    const progressSection = document.querySelector('.progress-section');
    if (progressSection) {
        progressSection.classList.remove('visible');
    }
}

// Show spinner
function showSpinner(show = true) {
    if (show) {
        const spinnerContainer = document.getElementById('spinnerContainer');
        const progressBar = document.getElementById('progressBar');
        if (spinnerContainer) spinnerContainer.style.display = 'flex';
        if (progressBar) progressBar.style.display = 'block';
        
        showProgressSection();
    } else {
        hideProgressSection();
    }
}

// Update progress
function updateProgress(percent) {
    const progressText = document.getElementById("progressText");
    const progressBar = document.getElementById("progressBar");

    console.log(`🔄 Progress updated: ${percent}%`);

    if (progressText) {
        progressText.textContent = `${percent}%`;
    }

    if (progressBar) {
        progressBar.value = percent;
    }
}

// Show big centered spinner for final loading phase
function showBigSpinner(message = "Loading...") {
    const progressContainer = document.querySelector('.progress-section-container');
    const progressSection = document.querySelector('.progress-section');
    
    if (progressContainer && progressSection) {
        progressSection.classList.add('visible');
        
        const spinnerContainer = document.getElementById('spinnerContainer');
        const progressBar = document.getElementById('progressBar');
        
        if (spinnerContainer) spinnerContainer.style.display = 'none';
        if (progressBar) progressBar.style.display = 'none';
        
        let bigSpinner = document.getElementById('bigSpinnerInPlace');
        if (!bigSpinner) {
            bigSpinner = document.createElement('div');
            bigSpinner.id = 'bigSpinnerInPlace';
            bigSpinner.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.8rem;
                width: 100%;
                height: 26px;
                justify-content: center;
            `;
            
            bigSpinner.innerHTML = `
                <div class="big-spinner-local"></div>
                <div class="big-spinner-text-local">${message}</div>
            `;
            
            const style = document.createElement('style');
            style.id = 'bigSpinnerLocalStyles';
            style.textContent = `
                .big-spinner-local {
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(0, 188, 212, 0.3);
                    border-top: 3px solid #00bcd4;
                    border-radius: 50%;
                    animation: bigSpinLocalAnimation 1s linear infinite;
                    flex-shrink: 0;
                }
                .big-spinner-text-local {
                    font-family: 'Sora', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: #00bcd4;
                    text-align: center;
                    line-height: 1;
                }
                @keyframes bigSpinLocalAnimation {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            if (!document.getElementById('bigSpinnerLocalStyles')) {
                document.head.appendChild(style);
            }
            
            progressSection.appendChild(bigSpinner);
        } else {
            const textElement = bigSpinner.querySelector('.big-spinner-text-local');
            if (textElement) textElement.textContent = message;
            bigSpinner.style.display = 'flex';
        }
    }
    
    console.log('🔄 Small spinner shown in progress area:', message);
}

// Hide big centered spinner
function hideBigSpinner() {
    const bigSpinner = document.getElementById('bigSpinnerInPlace');
    if (bigSpinner) {
        bigSpinner.style.display = 'none';
    }
    
    const progressSection = document.querySelector('.progress-section');
    if (progressSection) {
        progressSection.classList.remove('visible');
    }
    
    console.log('🔄 Big spinner hidden from progress area');
}

// Show download buttons
function showDownloadButtons() {
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
        actionButtons.classList.add('downloads-ready');
        console.log('📥 Download buttons are now ready');
    }
}

// THE MAIN GENERATE FUNCTION - Complete implementation from paste.txt
async function generateModel() {
    const imageInput = document.getElementById("imageInput");
    const file = imageInput?.files[0];
    if (!file) {
        console.warn("⚠️ No image selected.");
        return showNotificationToast("Please select an image.", 'warning');
    }

    const minPoly = 100;
    const maxPoly = 300000;

    // Use global variables (updated by dropdowns)
    const currentPolycount = window.selectedPolycount || selectedPolycount;
    const currentTopology = window.selectedTopology || selectedTopology;
    const currentTexture = window.selectedTexture || selectedTexture;
    const currentSymmetry = window.selectedSymmetry || selectedSymmetry;
    const currentPBR = window.enablePBR || enablePBR;

    console.log("🔧 Current settings:", {
        polycount: currentPolycount,
        topology: currentTopology,
        texture: currentTexture,
        symmetry: currentSymmetry,
        pbr: currentPBR
    });

    if (currentPolycount < minPoly || currentPolycount > maxPoly) {
        const adjustedValue = currentPolycount < minPoly ? minPoly : maxPoly;
        console.warn(`⚠️ Polycount ${currentPolycount} invalid. Adjusted to ${adjustedValue}.`);

        selectedPolycount = adjustedValue;
        window.selectedPolycount = adjustedValue;
        const polycountInput = document.getElementById("polycountInput");
        const polycountSlider = document.getElementById("polycountSlider");
        if (polycountInput) polycountInput.value = selectedPolycount;
        if (polycountSlider) polycountSlider.value = selectedPolycount;

        return showNotificationToast(`Polycount adjusted to ${adjustedValue}`, 'warning');
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
        console.log("🖼️ Image loaded");

        try {
            // Reset states for new generation
            currentAssetId = null;
            isAssetSaved = false;
            hideLikeButton();
            
            // Reset download button state
            const actionButtons = document.querySelector('.action-buttons');
            if (actionButtons) {
                actionButtons.classList.remove('downloads-ready');
            }
            
            // Hide any previous error overlays
            hideNoDogFoundOverlay();
            hideErrorOverlay();
            
            // Show scanning overlay
            console.log("🔍 STARTING scanning overlay...");
            showScanningOverlay();
            await new Promise(resolve => setTimeout(resolve, 2000));

            if ((typeof enableDetection !== 'undefined' && enableDetection) && window.detectRelevantObjects) {
                console.log("📤 Detection started...");
                const detection = await window.detectRelevantObjects(file);
                console.log("🔍 Object detection result:", detection);

                if (!detection.relevant) {
                    hideScanningOverlay();
                    showNoDogFoundOverlay();
                    
                    setTimeout(() => {
                        hideNoDogFoundOverlay();
                    }, 4000);
                    
                    console.warn("🚫 No dog detected.");
                    showSpinner(false);
                    return;
                }

                console.log("✅ Dog detected.");
            } else {
                console.log("🚫 Detection disabled or not available.");
            }

            hideScanningOverlay();
            startDogFacts();

            hideScanningOverlay();
            startDogFacts();

            showSpinner(true);
            updateProgress(0);
            console.log("📤 Model request sent...");

            // Check if createModel function is available
            if (typeof window.createModel !== 'function') {
                throw new Error('createModel function not available. Please check if api.js is loaded properly.');
            }

            // Call your createModel function from api.js
            const taskId = await window.createModel(file, currentTopology, currentTexture, currentPBR, currentSymmetry, currentPolycount);

            if (taskId) {
                console.log(`📬 Task-ID received: ${taskId}`);
                currentTaskId = taskId;
                startPolling(taskId);
            } else {
                console.error("❌ No taskId received from backend.");
                throw new Error('No task ID received from server. Generation failed to start.');
            }
        } catch (err) {
            console.error("❌ Error in model generation:", err);
            hideScanningOverlay();
            stopDogFacts();
            showSpinner(false);
            
            // Show diagnostic info
            console.log('🔧 Diagnostic check after error:', {
                createModel: typeof window.createModel !== 'undefined' ? 'available' : 'MISSING',
                getModelStatus: typeof window.getModelStatus !== 'undefined' ? 'available' : 'MISSING',
                API_BASE_URL: API_BASE_URL,
                errorDetails: err
            });
            
            // Provide more specific error messages
            let errorMessage = "Error while processing image";
            if (err.message) {
                if (err.message.includes('createModel')) {
                    errorMessage = "API not available - please check server connection";
                } else if (err.message.includes('task ID')) {
                    errorMessage = "Failed to start generation - server error";
                } else {
                    errorMessage = err.message;
                }
            }
            
            showErrorOverlay(errorMessage);
            setTimeout(() => hideErrorOverlay(), 6000);
        }
    };

    img.onerror = () => {
        console.error("❌ Error loading image.");
        hideScanningOverlay();
        showErrorOverlay("Error loading image");
        setTimeout(() => hideErrorOverlay(), 4000);
        showSpinner(false);
    };
}

// Start polling with auto-save integration
function startPolling(taskId) {
    console.log(`🚀 Polling started for taskId: ${taskId}`);
    
    // Check if getModelStatus function is available
    if (typeof window.getModelStatus !== 'function') {
        console.error('❌ getModelStatus function not available');
        showErrorOverlay('API functions not loaded properly');
        setTimeout(() => hideErrorOverlay(), 4000);
        return;
    }
    
    let fakeProgress = 0;

    const interval = setInterval(async () => {
        try {
            const res = await window.getModelStatus(taskId);
            console.log(`📡 Polling taskId ${taskId}:`, res);

            if (!res) {
                console.warn("⚠️ No result received from backend during polling.");
                return;
            }

            let progress = res.progress;

            if (progress === undefined || isNaN(progress)) {
                fakeProgress = Math.min(fakeProgress + 10, 99);
                progress = fakeProgress;
                console.log(`⚠️ No progress from backend, simulation at ${progress}%`);
            }

            updateProgress(progress);

            if (progress >= 100) {
                showSpinner(false);
            }

            if (res.status === "SUCCEEDED") {
                console.log("✅ Model generation completed.");
                clearInterval(interval);
                
                // Switch to big centered spinner for auto-save and model loading
                showBigSpinner("Finalizing your model...");
                
                // Auto-save the model immediately when generation completes
                if (res.model_urls && res.model_urls.glb) {
                    console.log('💾 Auto-saving generation...');
                    await handleGenerationComplete({
                        taskId: taskId,
                        modelUrl: res.model_urls.glb,
                        name: getCurrentModelName(),
                        breed: getCurrentBreed(),
                        originalImageBase64: currentImageBase64,
                        previewImageUrl: res.thumbnail_url,
                        polygons: getCurrentPolygons(),
                        description: getCurrentDescription()
                    });
                }
                
                const success = await loadModel(`${API_BASE_URL}/proxyModel/${taskId}?format=glb`);
                
                // Hide the big spinner now that everything is complete
                hideBigSpinner();
                
                // Stop dog facts after everything is complete
                stopDogFacts();
                
                if (success) {
                    // Show download buttons AFTER model is loaded and visible
                    showDownloadButtons();
                    
                    // Show like button after model loads and is auto-saved
                    console.log('✅ Model loaded and auto-saved. Showing download buttons and like button.');
                    setTimeout(() => {
                        showLikeButton();
                    }, 2000);
                } else {
                    showErrorOverlay('Failed to load 3D model');
                    setTimeout(() => hideErrorOverlay(), 4000);
                }
                return;
            }

            if (res.status === "FAILED" || res.status === "ERROR") {
                console.error(`❌ Error status received from backend: ${res.status}`);
                clearInterval(interval);
                showSpinner(false);
                hideBigSpinner();
                stopDogFacts();
                showErrorOverlay("Model generation failed");
                setTimeout(() => hideErrorOverlay(), 4000);
            }
        } catch (e) {
            console.error("❌ Polling error:", e);
            clearInterval(interval);
            showSpinner(false);
            hideBigSpinner();
            stopDogFacts();
            showErrorOverlay(`Polling error: ${e.message}`);
            setTimeout(() => hideErrorOverlay(), 4000);
        }
    }, 5000);
}

// Download model function
async function downloadModel(format = 'glb') {
    try {
        console.log(`📥 Starting download: ${format.toUpperCase()}`);
        
        const downloadUrl = `${API_BASE_URL}/proxyModel/${currentTaskId}?format=${format}`;
        
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dalma-model.${format}`;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Downloaded: dalma-model.${format}`);
        showNotificationToast(`Downloaded ${format.toUpperCase()} successfully!`, 'success');
        
    } catch (error) {
        console.error(`❌ Download failed for ${format}:`, error);
        showNotificationToast(`Download failed: ${error.message}`, 'error');
    }
}

// Utility functions
function showNotificationToast(message, type = 'info', duration = 4000) {
    const existingToast = document.getElementById('notificationToast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'notificationToast';
    
    let backgroundColor, borderColor;
    switch (type) {
        case 'success':
            backgroundColor = 'rgba(76, 175, 80, 0.9)';
            borderColor = '#4CAF50';
            break;
        case 'error':
            backgroundColor = 'rgba(244, 67, 54, 0.9)';
            borderColor = '#f44336';
            break;
        case 'warning':
            backgroundColor = 'rgba(255, 193, 7, 0.9)';
            borderColor = '#ffc107';
            break;
        default:
            backgroundColor = 'rgba(0, 188, 212, 0.9)';
            borderColor = '#00bcd4';
    }
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        border: 1px solid ${borderColor};
        font-family: 'Sora', sans-serif;
        font-weight: 500;
        font-size: 0.9rem;
        z-index: 10001;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
    
    console.log(`🔔 ${type.toUpperCase()} toast shown:`, message);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Main.js DOM loaded, initializing...');
    
    // Add a small delay to ensure other scripts have loaded
    setTimeout(() => {
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error('❌ THREE.js not loaded!');
            return;
        }
        
        // Check if scene is already initialized (avoid conflicts)
        if (typeof window.scene !== 'undefined' && window.scene) {
            console.log('⚠️ Scene already exists, skipping Three.js initialization');
            // Just setup other components
            setupEventListeners();
            setupControlBindings();
            initImageUploadHandler();
            initLikeButton();
            initSaveModalHandlers();
            return;
        }
        
        // Initialize Three.js with a small delay to ensure CSS is applied
        setTimeout(() => {
            console.log('🎯 Starting Three.js initialization...');
            const result = initializeThreeJS();
            if (result) {
                console.log('🎉 Three.js initialization complete!');
                // Store globally for other scripts
                window.scene = scene;
                window.camera = camera;
                window.renderer = renderer;
                window.controls = controls;
            } else {
                console.error('💥 Three.js initialization failed!');
            }
        }, 200);
        
        // Initialize other components
        setupEventListeners();
        setupControlBindings();
        initImageUploadHandler();
        initLikeButton();
        
        // Initialize save model modal handlers
        initSaveModalHandlers();
        
        // Set initial values
        selectedTexture = "true";
        window.selectedTexture = selectedTexture;
        window.selectedTopology = selectedTopology;
        window.selectedSymmetry = selectedSymmetry;
        window.enablePBR = enablePBR;
        window.selectedPolycount = selectedPolycount;
        
        console.log('✅ Main.js initialization complete');
        console.log('🔧 Available globals check:', {
            enableDetection: typeof enableDetection !== 'undefined' ? enableDetection : 'not defined',
            dogFacts: typeof window.dogFacts !== 'undefined' ? `${window.dogFacts?.length} facts` : 'not loaded',
            detectRelevantObjects: typeof window.detectRelevantObjects !== 'undefined' ? 'available' : 'not loaded',
            createModel: typeof window.createModel !== 'undefined' ? 'available' : 'not loaded',
            getModelStatus: typeof window.getModelStatus !== 'undefined' ? 'available' : 'not loaded',
            authManager: typeof window.authManager !== 'undefined' ? 'available' : 'not loaded'
        });
    }, 300); // Give other scripts time to load
});

// Event listeners setup
function setupEventListeners() {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }
    
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }
}

// Control bindings
function setupControlBindings() {
    // Polycount controls
    const polycountSlider = document.getElementById('polycountSlider');
    const polycountInput = document.getElementById('polycountInput');
    
    if (polycountSlider && polycountInput) {
        polycountSlider.addEventListener('input', (e) => {
            polycountInput.value = e.target.value;
            selectedPolycount = parseInt(e.target.value);
            window.selectedPolycount = selectedPolycount;
        });
        
        polycountInput.addEventListener('input', (e) => {
            polycountSlider.value = e.target.value;
            selectedPolycount = parseInt(e.target.value);
            window.selectedPolycount = selectedPolycount;
        });
    }
    
    // PBR checkbox
    const pbrCheckbox = document.getElementById('pbrCheckbox');
    if (pbrCheckbox) {
        pbrCheckbox.addEventListener('change', (e) => {
            enablePBR = e.target.checked;
            window.enablePBR = enablePBR;
            console.log(`🔘 PBR enabled: ${enablePBR}`);
        });
    }
    
    // Setup dropdown controls
    setupDropdownControls();
}

// Dropdown controls setup
function setupDropdownControls() {
    setupDropdown('topologyDropdown', 'topology-btn', (value) => {
        selectedTopology = value;
        window.selectedTopology = value;
        console.log(`🔘 Selected topology: ${value}`);
    });
    
    setupDropdown('textureDropdown', 'texture-btn', (value) => {
        selectedTexture = value;
        window.selectedTexture = value;
        
        const pbrButtons = document.getElementById("pbrButtons");
        if (value === "true") {
            if (pbrButtons) pbrButtons.classList.remove('hidden');
        } else {
            if (pbrButtons) pbrButtons.classList.add('hidden');
            const pbrCheckbox = document.getElementById("pbrCheckbox");
            if (pbrCheckbox) pbrCheckbox.checked = false;
            enablePBR = false;
            window.enablePBR = false;
        }
        
        console.log(`🔘 Selected texture: ${value}`);
    });
    
    setupDropdown('symmetryDropdown', 'symmetry-btn', (value) => {
        selectedSymmetry = value;
        window.selectedSymmetry = value;
        console.log(`🔘 Selected symmetry: ${value}`);
    });
}

// Generic dropdown setup
function setupDropdown(dropdownId, buttonClass, callback) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    const display = dropdown.querySelector('.dropdown-display');
    const valueSpan = dropdown.querySelector('.dropdown-value');
    const options = dropdown.querySelectorAll('.dropdown-option');
    
    if (!display || !valueSpan) return;
    
    display.addEventListener('click', () => {
        const currentValue = valueSpan.textContent;
        const optionValues = Array.from(options).map(opt => opt.textContent);
        const currentIndex = optionValues.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % optionValues.length;
        const nextOption = options[nextIndex];
        
        if (nextOption) {
            valueSpan.textContent = nextOption.textContent;
            const dataValue = nextOption.dataset.value;
            
            const hiddenButton = document.querySelector(`.${buttonClass}[data-${buttonClass.split('-')[0]}="${dataValue}"]`);
            if (hiddenButton) {
                const event = new Event('click');
                event.fromDropdown = true;
                hiddenButton.dispatchEvent(event);
            }
            
            if (callback) callback(dataValue);
        }
    });
}

// Initialize save model modal handlers
function initSaveModalHandlers() {
    const saveModalClose = document.getElementById('saveModalClose');
    const cancelSaveBtn = document.getElementById('cancelSaveBtn');
    const saveModelBtn = document.getElementById('saveModelBtn');
    const modelNameInput = document.getElementById('modelNameInput');
    
    // Close modal handlers
    if (saveModalClose) {
        saveModalClose.addEventListener('click', hideSaveModelModal);
    }
    
    if (cancelSaveBtn) {
        cancelSaveBtn.addEventListener('click', hideSaveModelModal);
    }
    
    // Save model handler
    if (saveModelBtn) {
        saveModelBtn.addEventListener('click', handleSaveModel);
    }
    
    // Enter key to save
    if (modelNameInput) {
        modelNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSaveModel();
            }
        });
        
        // Auto-enable/disable save button based on input
        modelNameInput.addEventListener('input', () => {
            const saveBtn = document.getElementById('saveModelBtn');
            if (saveBtn) {
                saveBtn.disabled = !modelNameInput.value.trim();
            }
        });
    }
    
    // Close modal when clicking overlay
    const saveModal = document.getElementById('saveModelModal');
    if (saveModal) {
        saveModal.addEventListener('click', (e) => {
            if (e.target === saveModal) {
                hideSaveModelModal();
            }
        });
    }
}

// Updated main function that calls generateModel
async function handleGenerate() {
    console.log('🚀 Generate button clicked - starting generation...');
    
    // Quick API health check before attempting generation
    try {
        console.log('🔍 Checking API connectivity...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const healthCheck = await fetch(`${API_BASE_URL}/health`, { 
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!healthCheck.ok) {
            throw new Error(`API health check failed: ${healthCheck.status}`);
        }
        
        console.log('✅ API is reachable');
    } catch (healthError) {
        console.error('❌ API health check failed:', healthError);
        
        let errorMsg = `API server is not reachable at ${API_BASE_URL}`;
        if (healthError.name === 'AbortError') {
            errorMsg += ' (connection timeout)';
        }
        errorMsg += '. Please check if the server is running.';
        
        showNotificationToast(errorMsg, 'error', 8000);
        return;
    }
    
    await generateModel();
}

// Make functions globally available
window.loadModel = loadModel;
window.downloadModel = downloadModel;
window.showNotificationToast = showNotificationToast;
window.generateModel = generateModel;

console.log('📋 Complete Main.js loaded successfully with full generate functionality and drag & drop');