// homepage.js - Homepage 3D functionality only - CLEANED VERSION
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

    // FIXED: Smart model path detection based on current location
    function getModelPaths() {
        const currentPath = window.location.pathname;
        const isInHtmlFolder = currentPath.includes('/html/');
        
        console.log('📍 Current path:', currentPath);
        console.log('📍 Is in html folder:', isInHtmlFolder);
        
        // Return different path arrays based on location
        if (isInHtmlFolder) {
            // We're in frontend/html/ folder
            return [
                '../models/dog6.glb',        // Go up one level to frontend/models/
                '../../models/dog6.glb',     // In case models is at root level
                './models/dog6.glb',         // Alternative relative
                '/models/dog6.glb',          // Absolute from server root
                '../public/models/dog6.glb'  // If in public folder
            ];
        } else {
            // We're in frontend/ root (index.html)
            return [
                'models/dog6.glb',           // Direct relative path
                './models/dog6.glb',         // Explicit relative
                '/models/dog6.glb',          // Absolute from server root
                'public/models/dog6.glb',    // If in public folder
                '../models/dog6.glb'         // If up one level
            ];
        }
    }

    console.log('🚀 Model Configuration:');
    const modelPaths = getModelPaths();
    console.log('🚀 Will try paths:', modelPaths);

    // Create our own namespace to avoid conflicts
    window.HOMEPAGE_3D_CONFIG = {
        useSingleModel: true,
        modelPaths: modelPaths
    };

    // Override MODEL_PATHS completely
    if (typeof MODEL_PATHS === 'undefined') {
        var MODEL_PATHS = {};
    }
    MODEL_PATHS.main = modelPaths[0]; // Use first path as default

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
        
        const modelPaths = window.HOMEPAGE_3D_CONFIG.modelPaths;
        console.log('🔄 Will try loading model from paths:', modelPaths);
        
        if (!THREE.GLTFLoader) {
            console.error('❌ GLTFLoader not available');
            createFallbackModel();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        // Function to try loading models from different paths
        function tryLoadModel(pathIndex = 0) {
            if (pathIndex >= modelPaths.length) {
                console.log('⚠️ All model paths failed, creating fallback model');
                createFallbackModel();
                return;
            }

            const modelPath = modelPaths[pathIndex];
            console.log(`🔄 Trying to load model from: ${modelPath} (attempt ${pathIndex + 1}/${modelPaths.length})`);
            
            loader.load(
                modelPath,
                (gltf) => {
                    console.log('✅ Model loaded successfully from:', modelPath);
                    
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
                    console.log(`❌ Failed to load ${modelPath}:`, error.message || error);
                    // Try next path
                    tryLoadModel(pathIndex + 1);
                }
            );
        }

        // Start trying to load the model
        tryLoadModel();
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

    // Keep checkAuthentication function in case other parts of the app need it
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
        
        // Notify loading system that page is ready
        if (window.loadingManager) {
            window.loadingManager.setLoaded('page');
        }
        
        console.log('✅ Homepage initialization complete');
    });

    // Make functions globally available
    window.checkAuthentication = checkAuthentication;
    window.Homepage3D = Homepage3D;
    window.init3D = init3D; // Export init3D for external use

    console.log('✅ Homepage.js loaded successfully');

})();