// homepage.js - Homepage specific functionality
(function() {
    'use strict';
    
    console.log('🎯 HOMEPAGE MODULE LOADED');

    // Prevent multiple initializations
    if (window.homepageInitialized) {
        console.log('⚠️ Homepage already initialized, skipping...');
        return;
    }
    window.homepageInitialized = true;

    // Create namespace to avoid variable conflicts
    const Homepage3D = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        greyModel: null,
        pmremGenerator: null,
        isInitialized: false,
        modelLoaded: false
    };

    // FIXED: API Configuration - Use global config with proper protocol handling
    window.DALMA_CONFIG = window.DALMA_CONFIG || {};
    if (!window.DALMA_CONFIG.API_BASE_URL) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isDev) {
            window.DALMA_CONFIG.API_BASE_URL = `http://${hostname}:3000/api`;
        } else {
            // In production, use HTTPS if page is HTTPS
            window.DALMA_CONFIG.API_BASE_URL = protocol === 'https:' 
                ? `https://${hostname}/api`
                : `http://${hostname}:3000/api`;
        }
    }

    console.log('🔧 Homepage API URL:', window.DALMA_CONFIG.API_BASE_URL);

    console.log('🚀 Model Configuration:');
    console.log('🚀 Will load: /models/dog6.glb');
    console.log('🚀 Will create wireframe version with controls');

    // Create our own namespace to avoid conflicts
    window.HOMEPAGE_3D_CONFIG = {
        useSingleModel: true,
        modelPath: '/models/dog6.glb'
    };

    // Override MODEL_PATHS completely
    if (typeof MODEL_PATHS === 'undefined') {
        var MODEL_PATHS = {};
    }
    MODEL_PATHS.main = window.HOMEPAGE_3D_CONFIG.modelPath;

    // Like functionality tracking
    const HomepageAssets = {
        likedAssets: new Set(),
        isLoadingLikes: false,
        allAssets: []
    };

    // 3D Scene initialization
    function init3D() {
        if (Homepage3D.isInitialized) {
            console.log('⚠️ 3D scene already initialized, skipping...');
            return;
        }
        
        console.log('🎬 ===== INITIALIZING 3D SCENE =====');
        Homepage3D.isInitialized = true;
        
        const container = document.getElementById('hero3d');
        if (!container) {
            console.error('❌ hero3d container not found!');
            return;
        }
        
        // Clear any existing content
        container.innerHTML = '';
        
        // Scene
        Homepage3D.scene = new THREE.Scene();
        Homepage3D.scene.background = new THREE.Color(0x0a0a0a);
        Homepage3D.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);
        
        // Camera - restored original position
        const containerRect = container.getBoundingClientRect();
        const width = containerRect.width || 800;
        const height = containerRect.height || 600;
        
        Homepage3D.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        Homepage3D.camera.position.set(6, 3, 8);
        Homepage3D.camera.lookAt(0, 2, 0); // Restored to original
        
        // Renderer - Maximum quality settings restored
        Homepage3D.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp",
            logarithmicDepthBuffer: true
        });
        Homepage3D.renderer.setSize(width, height);
        Homepage3D.renderer.setPixelRatio(window.devicePixelRatio);
        Homepage3D.renderer.setClearColor(0x0a0a0a, 0); // Alpha 0 for transparent
        Homepage3D.renderer.shadowMap.enabled = true;
        Homepage3D.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        Homepage3D.renderer.outputEncoding = THREE.sRGBEncoding;
        Homepage3D.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        Homepage3D.renderer.toneMappingExposure = 0.8; // Reduced from 1.1 for less brightness
        Homepage3D.renderer.physicallyCorrectLights = true;
        
        // Add renderer to container
        container.appendChild(Homepage3D.renderer.domElement);
        
        // Setup environment
        Homepage3D.pmremGenerator = new THREE.PMREMGenerator(Homepage3D.renderer);
        Homepage3D.pmremGenerator.compileEquirectangularShader();
        
        // Controls
        setupControls();
        
        // Create grid
        createStaticGrid();
        
        // Setup lighting
        setupOptimizedLighting();
        
        // Load model
        loadWireframeModel();
        
        // Animation loop
        animate();
        
        // Handle resize
        window.addEventListener('resize', onWindowResize, false);
        
        console.log('✅ 3D Scene initialized successfully');
    }

    function setupControls() {
        if (!THREE.OrbitControls) {
            console.error('❌ OrbitControls not available');
            return;
        }
        
        if (!Homepage3D.camera || !Homepage3D.renderer) {
            console.error('❌ Camera or renderer not available for controls');
            return;
        }
        
        Homepage3D.controls = new THREE.OrbitControls(Homepage3D.camera, Homepage3D.renderer.domElement);
        Homepage3D.controls.enableDamping = true;
        Homepage3D.controls.dampingFactor = 0.05;
        Homepage3D.controls.autoRotate = false;
        Homepage3D.controls.autoRotateSpeed = 0;
        Homepage3D.controls.target.set(0, 2, 0); // Restored to original
        Homepage3D.controls.minPolarAngle = Math.PI * 0.2;
        Homepage3D.controls.maxPolarAngle = Math.PI * 0.7;
        
        console.log('✅ OrbitControls initialized successfully');
    }

    function createStaticGrid() {
        // Create a perspective grid that extends into the distance
        const gridSize = 50;
        const gridDivisions = 50;
        
        // Create a custom shader material for better perspective fade effect
        const gridMaterial = new THREE.ShaderMaterial({
            uniforms: {
                fogColor: { value: new THREE.Color(0x0a0a0a) },
                fogNear: { value: 10 },
                fogFar: { value: 40 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                varying vec3 vWorldPosition;
                
                void main() {
                    float depth = distance(vWorldPosition, cameraPosition);
                    float fogFactor = smoothstep(fogNear, fogFar, depth);
                    
                    vec3 gridColor = vec3(0.0, 0.737, 0.831); // #00bcd4 in RGB
                    vec3 finalColor = mix(gridColor, fogColor, fogFactor);
                    
                    gl_FragColor = vec4(finalColor, 1.0 - fogFactor);
                }
            `,
            transparent: true
        });
        
        // Create grid geometry manually for better control
        const gridGeometry = new THREE.BufferGeometry();
        const vertices = [];
        const halfSize = gridSize / 2;
        const step = gridSize / gridDivisions;
        
        // Vertical lines
        for (let i = 0; i <= gridDivisions; i++) {
            const x = -halfSize + i * step;
            vertices.push(x, 0, -halfSize);
            vertices.push(x, 0, halfSize);
        }
        
        // Horizontal lines
        for (let i = 0; i <= gridDivisions; i++) {
            const z = -halfSize + i * step;
            vertices.push(-halfSize, 0, z);
            vertices.push(halfSize, 0, z);
        }
        
        gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const perspectiveGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
        perspectiveGrid.position.y = -0.5;
        
        Homepage3D.scene.add(perspectiveGrid);
        
        // Add a subtle secondary grid for depth
        const secondaryGrid = new THREE.GridHelper(gridSize * 0.6, gridDivisions * 0.6, 0x00bcd4, 0x00bcd4);
        secondaryGrid.material.opacity = 0.1;
        secondaryGrid.material.transparent = true;
        secondaryGrid.position.y = -0.48;
        Homepage3D.scene.add(secondaryGrid);
    }

    function loadWireframeModel() {
        console.log('🎯 ===== LOADING WIREFRAME MODEL =====');
        
        const modelPath = MODEL_PATHS.main || '/models/dog6.glb';
        console.log('🔄 Loading model from:', modelPath);
        
        if (!THREE.GLTFLoader) {
            console.error('❌ GLTFLoader not available');
            createFallbackModel();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            modelPath,
            (gltf) => {
                console.log('✅ Model loaded successfully');
                
                Homepage3D.greyModel = gltf.scene;
                
                // Center and scale the model - RESTORED ORIGINAL SCALE
                const box = new THREE.Box3().setFromObject(Homepage3D.greyModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // Scale to fit viewport nicely - RESTORED TO 7
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 7 / maxDim;
                Homepage3D.greyModel.scale.multiplyScalar(scale);
                
                // Position model ON THE GRID
                Homepage3D.greyModel.position.x = -center.x * scale;
                Homepage3D.greyModel.position.z = -center.z * scale;
                
                // Calculate Y position so bottom of model sits on grid
                const scaledBox = new THREE.Box3().setFromObject(Homepage3D.greyModel);
                const bottomY = scaledBox.min.y;
                Homepage3D.greyModel.position.y = -0.5 - bottomY; // Grid is at -0.5
                
                console.log('🎨 Converting to wireframe...');
                
                // Convert to wireframe
                let meshCount = 0;
                Homepage3D.greyModel.traverse((child) => {
                    if (child.isMesh) {
                        meshCount++;
                        
                    // Store original geometry reference
                    const geometry = child.geometry;
                    
                    // Create new grey base material
                    child.material = new THREE.MeshStandardMaterial({ 
                        color: 0x404040,  // Darker grey for subtlety
                        metalness: 0.1,
                        roughness: 0.8,
                        transparent: true,
                        opacity: 0.3, // Semi-transparent base
                        envMapIntensity: 0.3
                    });
                    
                    // Add wireframe overlay with enhanced visibility
                    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
                    const wireframeMaterial = new THREE.LineBasicMaterial({ 
                        color: 0x00bcd4,  // Cyan wireframe
                        transparent: true,
                        opacity: 1.0, // Full opacity for wireframe
                        linewidth: 1
                    });
                    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                    
                    // Add subtle emissive glow to wireframe
                    wireframe.material.emissive = new THREE.Color(0x003344);
                    wireframe.material.emissiveIntensity = 0.2;
                    
                    child.add(wireframe);
                        
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                Homepage3D.scene.add(Homepage3D.greyModel);
                
                // Store base Y position for animation
                Homepage3D.greyModel.userData.baseY = Homepage3D.greyModel.position.y;
                Homepage3D.modelLoaded = true;
                
                console.log(`✅ Wireframe model created: ${meshCount} meshes converted`);
                console.log('✅ Model is now visible and ready');
                
                // IMPORTANT: Notify loading system that model is ready
                if (window.loadingManager) {
                    window.loadingManager.setLoaded('model3d');
                }
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(1);
                console.log(`📊 Loading model: ${percent}%`);
            },
            (error) => {
                console.error('❌ Error loading model:', error);
                createFallbackModel();
            }
        );
    }

    function createFallbackModel() {
        console.log('⚠️ Creating fallback model...');
        
        // Create a simple dog-like shape using basic geometries
        const group = new THREE.Group();
        
        // Body (ellipsoid)
        const bodyGeometry = new THREE.SphereGeometry(1.2, 32, 24);
        bodyGeometry.scale(1.5, 0.8, 0.9);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x404040,
            metalness: 0.1,
            roughness: 0.8,
            transparent: true,
            opacity: 0.3,
            envMapIntensity: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0, 0);
        body.castShadow = true;
        
        // Add wireframe overlay
        const bodyWireframe = new THREE.WireframeGeometry(bodyGeometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00bcd4,
            transparent: true,
            opacity: 1.0
        });
        const bodyWireframeLines = new THREE.LineSegments(bodyWireframe, wireframeMaterial);
        body.add(bodyWireframeLines);
        
        group.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.7, 24, 20);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(1.8, 0.3, 0);
        head.castShadow = true;
        
        const headWireframe = new THREE.WireframeGeometry(headGeometry);
        const headWireframeLines = new THREE.LineSegments(headWireframe, wireframeMaterial);
        head.add(headWireframeLines);
        
        group.add(head);
        
        // Snout
        const snoutGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 16);
        snoutGeometry.rotateZ(Math.PI / 2);
        const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
        snout.position.set(2.3, 0.1, 0);
        snout.castShadow = true;
        
        const snoutWireframe = new THREE.WireframeGeometry(snoutGeometry);
        const snoutWireframeLines = new THREE.LineSegments(snoutWireframe, wireframeMaterial);
        snout.add(snoutWireframeLines);
        
        group.add(snout);
        
        // Ears
        const earGeometry = new THREE.ConeGeometry(0.3, 0.6, 12);
        
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(1.5, 0.8, -0.3);
        leftEar.rotation.z = -0.3;
        leftEar.castShadow = true;
        
        const leftEarWireframe = new THREE.WireframeGeometry(earGeometry);
        const leftEarWireframeLines = new THREE.LineSegments(leftEarWireframe, wireframeMaterial);
        leftEar.add(leftEarWireframeLines);
        
        group.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(1.5, 0.8, 0.3);
        rightEar.rotation.z = 0.3;
        rightEar.castShadow = true;
        
        const rightEarWireframe = new THREE.WireframeGeometry(earGeometry);
        const rightEarWireframeLines = new THREE.LineSegments(rightEarWireframe, wireframeMaterial);
        rightEar.add(rightEarWireframeLines);
        
        group.add(rightEar);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
        
        // Front legs
        const frontLeg1 = new THREE.Mesh(legGeometry, bodyMaterial);
        frontLeg1.position.set(0.8, -1, -0.4);
        frontLeg1.castShadow = true;
        
        const frontLeg1Wireframe = new THREE.WireframeGeometry(legGeometry);
        const frontLeg1WireframeLines = new THREE.LineSegments(frontLeg1Wireframe, wireframeMaterial);
        frontLeg1.add(frontLeg1WireframeLines);
        
        group.add(frontLeg1);
        
        const frontLeg2 = new THREE.Mesh(legGeometry, bodyMaterial);
        frontLeg2.position.set(0.8, -1, 0.4);
        frontLeg2.castShadow = true;
        
        const frontLeg2Wireframe = new THREE.WireframeGeometry(legGeometry);
        const frontLeg2WireframeLines = new THREE.LineSegments(frontLeg2Wireframe, wireframeMaterial);
        frontLeg2.add(frontLeg2WireframeLines);
        
        group.add(frontLeg2);
        
        // Back legs
        const backLeg1 = new THREE.Mesh(legGeometry, bodyMaterial);
        backLeg1.position.set(-0.8, -1, -0.4);
        backLeg1.castShadow = true;
        
        const backLeg1Wireframe = new THREE.WireframeGeometry(legGeometry);
        const backLeg1WireframeLines = new THREE.LineSegments(backLeg1Wireframe, wireframeMaterial);
        backLeg1.add(backLeg1WireframeLines);
        
        group.add(backLeg1);
        
        const backLeg2 = new THREE.Mesh(legGeometry, bodyMaterial);
        backLeg2.position.set(-0.8, -1, 0.4);
        backLeg2.castShadow = true;
        
        const backLeg2Wireframe = new THREE.WireframeGeometry(legGeometry);
        const backLeg2WireframeLines = new THREE.LineSegments(backLeg2Wireframe, wireframeMaterial);
        backLeg2.add(backLeg2WireframeLines);
        
        group.add(backLeg2);
        
        // Tail
        const tailGeometry = new THREE.CylinderGeometry(0.1, 0.05, 1, 12);
        tailGeometry.rotateZ(-Math.PI / 4);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(-1.8, 0.5, 0);
        tail.castShadow = true;
        
        const tailWireframe = new THREE.WireframeGeometry(tailGeometry);
        const tailWireframeLines = new THREE.LineSegments(tailWireframe, wireframeMaterial);
        tail.add(tailWireframeLines);
        
        group.add(tail);
        
        // Position the group on the grid
        Homepage3D.scene.add(group);
        
        // Calculate position so model sits on grid
        const groupBox = new THREE.Box3().setFromObject(group);
        const groupBottom = groupBox.min.y;
        group.position.y = -0.5 - groupBottom; // Grid is at -0.5
        
        // Store base Y position for animation
        group.userData.baseY = group.position.y;
        
        Homepage3D.greyModel = group;
        Homepage3D.modelLoaded = true;
        
        console.log('✅ Fallback model created');
        
        // Notify loading system
        if (window.loadingManager) {
            window.loadingManager.setLoaded('model3d');
        }
    }

    function setupOptimizedLighting() {
        // Clear any existing lights
        Homepage3D.scene.traverse((child) => {
            if (child.isLight) Homepage3D.scene.remove(child);
        });
        
        console.log('💡 Setting up optimized lighting for wireframe model...');
        
        // Moderate ambient base - reduced for less brightness
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Reduced from 1.2
        Homepage3D.scene.add(ambientLight);
        
        // Subtle hemisphere lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5); // Reduced intensity
        Homepage3D.scene.add(hemiLight);
        
        // Main key light - significantly reduced
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8); // Reduced from 2.5
        keyLight.position.set(5, 8, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048; // Reduced from 4096 for performance
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 50;
        keyLight.shadow.camera.left = -15;
        keyLight.shadow.camera.right = 15;
        keyLight.shadow.camera.top = 15;
        keyLight.shadow.camera.bottom = -15;
        keyLight.shadow.bias = -0.0005;
        Homepage3D.scene.add(keyLight);
        
        // Subtle fill light with cyan tint
        const fillLight = new THREE.DirectionalLight(0x80e8ff, 0.3); // Reduced from 1.5
        fillLight.position.set(-5, 5, -3);
        Homepage3D.scene.add(fillLight);
        
        // Minimal rim light for wireframe definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4); // Reduced from 1.8
        rimLight.position.set(0, 5, -8);
        Homepage3D.scene.add(rimLight);
        
        // Reduced accent lights for subtle visual interest
        const accentLight1 = new THREE.PointLight(0x00bcd4, 0.3, 20); // Reduced intensity and range
        accentLight1.position.set(-5, 2, 5);
        Homepage3D.scene.add(accentLight1);
        
        const accentLight2 = new THREE.PointLight(0x0097a7, 0.3, 20); // Reduced intensity and range
        accentLight2.position.set(5, 2, -5);
        Homepage3D.scene.add(accentLight2);
        
        // Minimal environment map for subtle reflections
        const envScene = new THREE.Scene();
        const envLight1 = new THREE.DirectionalLight(0xffffff, 0.5); // Reduced from 2
        envLight1.position.set(1, 1, 1);
        envScene.add(envLight1);
        
        const envTexture = Homepage3D.pmremGenerator.fromScene(envScene, 0.04).texture;
        Homepage3D.scene.environment = envTexture;
        Homepage3D.scene.environmentIntensity = 0.3; // Reduced from 1.0
        
        // Clean up env scene
        envScene.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        
        console.log('✅ Optimized lighting setup complete - less bright, wireframe-focused');
    }

    function animate() {
        requestAnimationFrame(animate);
        
        if (Homepage3D.controls) {
            Homepage3D.controls.update();
        }
        
        // Rotate model slowly - RESTORED NEGATIVE ROTATION
        if (Homepage3D.greyModel) {
            Homepage3D.greyModel.rotation.y -= 0.003; // Changed back to negative
            
            // Add subtle floating animation using stored base position
            if (Homepage3D.greyModel.userData.baseY !== undefined) {
                Homepage3D.greyModel.position.y = Homepage3D.greyModel.userData.baseY + Math.sin(Date.now() * 0.001) * 0.03; // Reduced from 0.05
            }
        }
        
        if (Homepage3D.renderer && Homepage3D.scene && Homepage3D.camera) {
            Homepage3D.renderer.render(Homepage3D.scene, Homepage3D.camera);
        }
    }

    function onWindowResize() {
        const container = document.getElementById('hero3d');
        if (!container || !Homepage3D.camera || !Homepage3D.renderer) return;
        
        const containerRect = container.getBoundingClientRect();
        Homepage3D.camera.aspect = containerRect.width / containerRect.height;
        Homepage3D.camera.updateProjectionMatrix();
        Homepage3D.renderer.setSize(containerRect.width, containerRect.height);
    }

    // Asset Management Functions
    async function loadAssetsFromAPI() {
        try {
            console.log('🔄 Loading assets from API...');
            const response = await fetch(`${window.DALMA_CONFIG.API_BASE_URL}/assets?limit=8&sortBy=popularity&sortOrder=desc`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Assets loaded:', data.assets?.length || 0);
            HomepageAssets.allAssets = data.assets || [];
            return HomepageAssets.allAssets;
        } catch (error) {
            console.error('❌ Error loading assets:', error);
            return [];
        }
    }

    async function checkAuthentication() {
        try {
            const response = await fetch(`${window.DALMA_CONFIG.API_BASE_URL}/auth/me`, {
                method: 'GET',
                credentials: 'include'
            });
            
            return response.ok;
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    }

    async function loadUserLikedAssets() {
        if (HomepageAssets.isLoadingLikes) return;
        
        try {
            HomepageAssets.isLoadingLikes = true;
            
            const isAuthenticated = await checkAuthentication();
            if (!isAuthenticated) {
                HomepageAssets.likedAssets.clear();
                return;
            }
            
            const response = await fetch(`${window.DALMA_CONFIG.API_BASE_URL}/auth/liked-assets`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                HomepageAssets.likedAssets.clear();
                return;
            }
            
            const data = await response.json();
            const likedAssetsList = data.assets || [];
            
            HomepageAssets.likedAssets.clear();
            likedAssetsList.forEach(asset => {
                HomepageAssets.likedAssets.add(asset._id);
            });
            
            console.log('💖 Loaded', HomepageAssets.likedAssets.size, 'liked assets');
            updateAllLikeButtons();
            
        } catch (error) {
            console.error('❌ Error loading liked assets:', error);
            HomepageAssets.likedAssets.clear();
        } finally {
            HomepageAssets.isLoadingLikes = false;
        }
    }

    function updateAllLikeButtons() {
        document.querySelectorAll('.asset-like-button').forEach(button => {
            const assetId = button.getAttribute('data-asset-id');
            if (assetId && HomepageAssets.likedAssets.has(assetId)) {
                button.classList.add('liked');
                button.title = 'Remove from liked models';
            } else {
                button.classList.remove('liked');
                button.title = 'Add to liked models';
            }
        });
    }

    async function handleLikeClick(event, assetId, assetName) {
        event.stopPropagation();
        
        const likeButton = event.currentTarget;
        if (likeButton.classList.contains('loading')) return;
        
        const isAuthenticated = await checkAuthentication();
        if (!isAuthenticated) {
            console.log('❌ User not authenticated, showing login modal');
            if (window.authManager) {
                window.authManager.showLoginModal();
            } else {
                window.location.href = 'login.html';
            }
            return;
        }
        
        likeButton.classList.add('loading');
        
        try {
            const response = await fetch(`${window.DALMA_CONFIG.API_BASE_URL}/auth/like-asset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ assetId: assetId })
            });
            
            if (!response.ok) throw new Error('Failed to update like status');
            
            const data = await response.json();
            const isLiked = data.isLiked;
            
            if (isLiked) {
                HomepageAssets.likedAssets.add(assetId);
                likeButton.classList.add('liked');
                likeButton.title = 'Remove from liked models';
            } else {
                HomepageAssets.likedAssets.delete(assetId);
                likeButton.classList.remove('liked');
                likeButton.title = 'Add to liked models';
            }
            
            const message = isLiked 
                ? `Added "${assetName}" to your liked models ❤️` 
                : `Removed "${assetName}" from your liked models`;
            showFeedback(message, 'success');
            
        } catch (error) {
            console.error('❌ Like error:', error);
            showFeedback('Failed to update like status. Please try again.', 'error');
        } finally {
            likeButton.classList.remove('loading');
        }
    }

    function showFeedback(message, type = 'success') {
        const existingFeedback = document.querySelector('.like-feedback-message');
        if (existingFeedback) existingFeedback.remove();
        
        const feedback = document.createElement('div');
        feedback.className = `like-feedback-message ${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: ${type === 'success' ? 'rgba(0, 188, 212, 0.9)' : 'rgba(220, 38, 127, 0.9)'};
            color: white; padding: 1rem 1.5rem; border-radius: 8px;
            font-family: 'Sora', sans-serif; font-weight: 500; z-index: 10000;
            opacity: 0; transform: translateX(100%); transition: all 0.3s ease;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(100%)';
            setTimeout(() => feedback.remove(), 300);
        }, 3000);
    }

    function createAssetCard(asset) {
        const assetCard = document.createElement('div');
        assetCard.classList.add('asset-card');
        assetCard.setAttribute('data-asset-id', asset._id);
        
        let imageUrl = null;
        if (asset.originalImage?.url) imageUrl = asset.originalImage.url;
        else if (asset.inputImage?.url) imageUrl = asset.inputImage.url;
        else if (asset.previewImage?.url) imageUrl = asset.previewImage.url;
        
        const isLiked = HomepageAssets.likedAssets.has(asset._id);
        
        assetCard.innerHTML = `
            ${imageUrl ? `
                <div class="asset-preview">
                    <img src="${imageUrl}" alt="${asset.name}" class="asset-preview-img" 
                         onerror="this.parentElement.innerHTML = '<div class=\\'asset-icon\\'>${asset.icon || '🐕'}</div>';">
                    <button class="asset-like-button ${isLiked ? 'liked' : ''}" data-asset-id="${asset._id}"
                            title="${isLiked ? 'Remove from liked models' : 'Add to liked models'}">
                        <svg class="heart-icon" viewBox="0 0 24 24" width="18" height="18">
                            <path class="heart-outline" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" stroke-width="2"/>
                            <path class="heart-filled" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" opacity="${isLiked ? '1' : '0'}"/>
                        </svg>
                    </button>
                </div>
                <div class="asset-info">
                    <h3 class="asset-name">${asset.name}</h3>
                    <div class="asset-stats">
                        <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
                    </div>
                </div>
            ` : `
                <div class="asset-icon">${asset.icon || '🐕'}</div>
                <h3 class="asset-name">${asset.name}</h3>
                <div class="asset-stats">
                    <small>${asset.views || 0} views • ${asset.downloads || 0} downloads</small>
                </div>
            `}
        `;
        
        // Add click handler for card
        assetCard.addEventListener('click', function(e) {
            if (!e.target.closest('.asset-like-button')) {
                viewAssetFromHomepage(asset._id);
            }
        });
        
        // Add like button handler
        const likeButton = assetCard.querySelector('.asset-like-button');
        if (likeButton) {
            likeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                handleLikeClick(e, asset._id, asset.name);
            });
        }
        
        return assetCard;
    }

    function viewAssetFromHomepage(assetId) {
        console.log('🎯 Viewing asset from homepage:', assetId);
        sessionStorage.setItem('lastAssetsPage', 'homepage');
        window.location.href = `view-asset.html?id=${assetId}&from=homepage`;
    }

    async function renderAssetsSection() {
        const assetsGrid = document.querySelector('.assets-grid');
        if (!assetsGrid) return;
        
        console.log('🔄 Loading assets section...');
        assetsGrid.innerHTML = '<div class="loading-assets">Loading assets...</div>';
        
        try {
            await loadUserLikedAssets();
            const assets = await loadAssetsFromAPI();
            
            assetsGrid.innerHTML = '';
            
            if (assets.length === 0) {
                assetsGrid.innerHTML = '<div class="no-assets"><p>No assets available.</p></div>';
                return;
            }
            
            assets.forEach(asset => {
                const assetCard = createAssetCard(asset);
                assetsGrid.appendChild(assetCard);
            });
            
            console.log('✅ Assets rendered successfully');
            
            // Notify loading system
            if (window.loadingManager) {
                window.loadingManager.setLoaded('assets');
            }
            
        } catch (error) {
            console.error('❌ Error loading assets:', error);
            assetsGrid.innerHTML = '<div class="error-assets"><p>Error loading assets.</p></div>';
            
            // Still notify loading system to prevent hang
            if (window.loadingManager) {
                window.loadingManager.setLoaded('assets');
            }
        }
    }

    function setupSearchFunctionality() {
        const searchInput = document.getElementById('assetSearchInput');
        if (!searchInput) return;
        
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.toLowerCase().trim();
            
            searchTimeout = setTimeout(() => {
                const filteredAssets = searchTerm === '' ? HomepageAssets.allAssets :
                    HomepageAssets.allAssets.filter(asset => 
                        asset.name.toLowerCase().includes(searchTerm) ||
                        (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
                    );
                
                const assetsGrid = document.querySelector('.assets-grid');
                if (assetsGrid) {
                    assetsGrid.innerHTML = '';
                    filteredAssets.forEach(asset => {
                        assetsGrid.appendChild(createAssetCard(asset));
                    });
                }
            }, 300);
        });
    }

    // Mobile navigation toggle
    window.toggleMobileNav = function() {
        const mobileNav = document.getElementById('mobileNav');
        const hamburger = document.querySelector('.hamburger');
        
        if (mobileNav) {
            mobileNav.classList.toggle('active');
        }
        
        if (hamburger) {
            hamburger.classList.toggle('active');
        }
    };

    // Initialize everything when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        if (window.homepageInitializing) {
            console.log('⚠️ Homepage already initializing, skipping...');
            return;
        }
        window.homepageInitializing = true;
        
        console.log('🚀 Homepage initializing...');
        
        // Initialize 3D scene
        init3D();
        
        // Load assets
        renderAssetsSection();
        
        // Setup search
        setupSearchFunctionality();
        
        // Auth state change handler for likes
        window.addEventListener('authStateChange', async () => {
            console.log('🔄 Auth state changed, reloading liked assets...');
            await loadUserLikedAssets();
        });
        
        window.addEventListener('userLoggedOut', () => {
            console.log('🔄 User logged out, clearing liked assets...');
            HomepageAssets.likedAssets.clear();
            updateAllLikeButtons();
        });
        
        // Notify loading system that page is ready
        if (window.loadingManager) {
            window.loadingManager.setLoaded('page');
        }
        
        console.log('✅ Homepage initialization complete');
    });

    // Make functions globally available
    window.viewAssetFromHomepage = viewAssetFromHomepage;
    window.renderAssetsSection = renderAssetsSection;
    window.checkAuthentication = checkAuthentication;
    window.Homepage3D = Homepage3D;
    window.HomepageAssets = HomepageAssets;

    console.log('✅ Homepage.js loaded successfully');

})();