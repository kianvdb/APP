/**
 * mobile-3d-viewer.js
 * 
 * WebGL-based 3D viewer optimized for mobile devices
 * Features restricted controls and performance optimizations
 * Handles dog model loading with wireframe rendering
 */

(function() {
    'use strict';
    
    /* ========================================
       Configuration and Constants
       ======================================== */
    const CONFIG = {
        camera: {
            fov: 75,
            near: 0.1,
            far: 1000,
            position: { x: 2, y: 5, z: 3.5 },
            lookAt: { x: 0, y: 2, z: 0 }
        },
        grid: {
            size: 200,
            divisions: 100,
            position: { y: -6 },
            layers: [
                { size: 150, divisions: 75, opacity: 0.6, y: -0.48 },
                { size: 100, divisions: 50, opacity: 0.4, y: -0.46 },
                { size: 60, divisions: 30, opacity: 0.2, y: -0.44 }
            ]
        },
        model: {
            scale: 7,
            rotationSpeed: 0.003,
            primaryColor: 0x00bcd4,
            secondaryColor: 0x404040
        },
        renderer: {
            antialias: true,
            alpha: true,
            powerPreference: "default",
            precision: "mediump",
            pixelRatioLimit: 2
        },
        animation: {
            fps: 60,
            timeStep: 0.016
        }
    };
    
    const MODEL_FILENAME = 'dog6.glb';
    
    /* ========================================
       Module Initialization Check
       ======================================== */
    if (window.mobile3DInitialized) {
        console.log('⚠️ Mobile 3D already initialized, skipping...');
        return;
    }
    window.mobile3DInitialized = true;
    
    console.log('📱 Mobile 3D Viewer Module Loading...');

    /* ========================================
       Mobile3D Namespace
       ======================================== */
    const Mobile3D = {
        // Core Three.js objects
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        
        // Model and scene objects
        dogModel: null,
        gridGroup: null,
        
        // Utilities
        pmremGenerator: null,
        animationId: null,
        
        // State flags
        isInitialized: false,
        modelLoaded: false,
        modelLoadPromise: null
    };

    /* ========================================
       Path Resolution Functions
       ======================================== */
    
    /**
     * Determines model paths based on current page location
     * @returns {string[]} Array of potential model paths to try
     */
    function getModelPaths() {
        const currentPath = window.location.pathname;
        const isInHtmlFolder = currentPath.includes('/html/');
        
        console.log('📍 Resolving model paths from:', currentPath);
        
        if (isInHtmlFolder) {
            // Paths when loading from frontend/html/ folder
            return [
                `../models/${MODEL_FILENAME}`,
                `../../models/${MODEL_FILENAME}`,
                `./models/${MODEL_FILENAME}`,
                `/models/${MODEL_FILENAME}`,
                `../public/models/${MODEL_FILENAME}`
            ];
        } else {
            // Paths when loading from frontend root
            return [
                `models/${MODEL_FILENAME}`,
                `./models/${MODEL_FILENAME}`,
                `/models/${MODEL_FILENAME}`,
                `public/models/${MODEL_FILENAME}`,
                `../models/${MODEL_FILENAME}`
            ];
        }
    }

    /* ========================================
       Main Initialization Function
       ======================================== */
    
    /**
     * Initializes the 3D scene and all components
     * @param {string} containerId - ID of the container element
     * @returns {Object|null} Mobile3D object or null on failure
     */
    function initMobile3D(containerId = 'hero3d') {
        if (Mobile3D.isInitialized) {
            console.log('⚠️ Mobile 3D scene already initialized');
            return Mobile3D;
        }
        
        console.log('🎬 Initializing Mobile 3D Scene...');
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container #${containerId} not found!`);
            return null;
        }
        
        // Prepare container
        prepareContainer(container);
        
        // Initialize Three.js components
        if (!initializeThreeJS(container)) {
            return null;
        }
        
        // Setup scene components
        setupScene();
        
        // Handle window resize
        window.addEventListener('resize', handleResize, false);
        
        Mobile3D.isInitialized = true;
        console.log('✅ Mobile 3D Scene initialized successfully');
        
        return Mobile3D;
    }
    
    /**
     * Prepares the container element for 3D rendering
     * @param {HTMLElement} container - Container element
     */
    function prepareContainer(container) {
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
    }
    
    /**
     * Initializes Three.js core components
     * @param {HTMLElement} container - Container element
     * @returns {boolean} Success status
     */
    function initializeThreeJS(container) {
        try {
            // Calculate viewport dimensions
            const width = window.innerWidth;
            const height = window.innerHeight - 150; // Account for UI elements
            
            console.log(`📐 Viewport dimensions: ${width}x${height}`);
            
            // Create scene
            Mobile3D.scene = new THREE.Scene();
            Mobile3D.scene.background = null;
            Mobile3D.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);
            
            // Create camera
            Mobile3D.camera = new THREE.PerspectiveCamera(
                CONFIG.camera.fov,
                width / height,
                CONFIG.camera.near,
                CONFIG.camera.far
            );
            Mobile3D.camera.position.set(
                CONFIG.camera.position.x,
                CONFIG.camera.position.y,
                CONFIG.camera.position.z
            );
            Mobile3D.camera.lookAt(
                CONFIG.camera.lookAt.x,
                CONFIG.camera.lookAt.y,
                CONFIG.camera.lookAt.z
            );
            
            // Create renderer
            Mobile3D.renderer = createRenderer(width, height);
            container.appendChild(Mobile3D.renderer.domElement);
            
            // Create PMREM generator for environment mapping
            Mobile3D.pmremGenerator = new THREE.PMREMGenerator(Mobile3D.renderer);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Three.js:', error);
            createCanvasFallback(container);
            return false;
        }
    }
    
    /**
     * Creates and configures the WebGL renderer
     * @param {number} width - Renderer width
     * @param {number} height - Renderer height
     * @returns {THREE.WebGLRenderer} Configured renderer
     */
    function createRenderer(width, height) {
        const renderer = new THREE.WebGLRenderer(CONFIG.renderer);
        
        // Size and pixel ratio
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.renderer.pixelRatioLimit));
        
        // Rendering settings
        renderer.setClearColor(0x0a0a0a, 0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.8;
        
        // DOM element styling
        const domElement = renderer.domElement;
        domElement.style.position = 'absolute';
        domElement.style.top = '0';
        domElement.style.left = '0';
        domElement.style.width = '100%';
        domElement.style.height = '100%';
        domElement.style.display = 'block';
        domElement.style.zIndex = '1';
        domElement.style.pointerEvents = 'auto';
        
        console.log('✅ WebGL renderer created');
        return renderer;
    }
    
    /**
     * Sets up all scene components
     */
    function setupScene() {
        setupRestrictedControls();
        createFullScreenGrid();
        setupLighting();
        loadDogModel();
        startAnimation();
    }

    /* ========================================
       Fallback Rendering
       ======================================== */
    
    /**
     * Creates a 2D canvas fallback when WebGL is unavailable
     * @param {HTMLElement} container - Container element
     */
    function createCanvasFallback(container) {
        console.log('⚠️ Creating 2D canvas fallback...');
        
        const canvas = document.createElement('canvas');
        canvas.width = container.offsetWidth || 400;
        canvas.height = container.offsetHeight || 300;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Simple wireframe shape
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(canvas.width/2, canvas.height/2, 80, 60, 0, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Loading text
        ctx.fillStyle = '#00bcd4';
        ctx.font = '16px Sora, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('3D Viewer Loading...', canvas.width/2, canvas.height/2 + 100);
        
        container.appendChild(canvas);
    }

    /* ========================================
       Camera Controls
       ======================================== */
    
    /**
     * Sets up restricted orbit controls (horizontal rotation only)
     */
    function setupRestrictedControls() {
        if (!THREE.OrbitControls || !Mobile3D.camera || !Mobile3D.renderer) {
            console.log('⚠️ OrbitControls not available or missing dependencies');
            return;
        }
        
        try {
            const controls = new THREE.OrbitControls(Mobile3D.camera, Mobile3D.renderer.domElement);
            
            // Enable smooth damping
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.autoRotate = false;
            controls.target.set(0, -1.8, 0);
            
            // Restrict controls to horizontal rotation only
            controls.enableZoom = false;
            controls.enablePan = false;
            controls.minPolarAngle = Math.PI * 0.5; // Lock vertical angle
            controls.maxPolarAngle = Math.PI * 0.5; // Lock vertical angle
            controls.minAzimuthAngle = -Infinity;   // Allow full horizontal rotation
            controls.maxAzimuthAngle = Infinity;    // Allow full horizontal rotation
            
            Mobile3D.controls = controls;
            console.log('✅ Restricted controls initialized');
            
        } catch (error) {
            console.error('❌ Error setting up controls:', error);
        }
    }

    /* ========================================
       Grid Creation
       ======================================== */
    
    /**
     * Creates the full-screen perspective grid
     */
    function createFullScreenGrid() {
        console.log('🔲 Creating full-screen grid...');
        
        Mobile3D.gridGroup = new THREE.Group();
        
        try {
            // Create main grid with custom shader
            createMainGrid();
            
            // Create layered grids for depth effect
            createLayeredGrids();
            
            Mobile3D.scene.add(Mobile3D.gridGroup);
            console.log('✅ Full-screen grid created');
            
        } catch (error) {
            console.error('❌ Error creating grid:', error);
            createFallbackGrid();
        }
    }
    
    /**
     * Creates the main grid with custom shader material
     */
    function createMainGrid() {
        const gridMaterial = new THREE.ShaderMaterial({
            uniforms: {
                fogColor: { value: new THREE.Color(0x0a0a0a) },
                fogNear: { value: 20.0 },
                fogFar: { value: 100.0 },
                time: { value: 0.0 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying float vDistance;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vDistance = distance(worldPosition.xyz, cameraPosition);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                uniform float time;
                varying vec3 vWorldPosition;
                varying float vDistance;
                
                void main() {
                    // Distance-based fog
                    float fogFactor = smoothstep(fogNear, fogFar, vDistance);
                    
                    // Grid intensity falloff from center
                    float centerDistance = length(vWorldPosition.xz);
                    float gridIntensity = 1.0 - smoothstep(0.0, 80.0, centerDistance);
                    
                    // Subtle pulse effect
                    float pulse = sin(time * 0.5) * 0.1 + 0.9;
                    vec3 gridColor = vec3(0.0, 0.737, 0.831) * gridIntensity * pulse;
                    vec3 finalColor = mix(gridColor, fogColor, fogFactor);
                    
                    float finalOpacity = (1.0 - fogFactor) * gridIntensity * 0.8;
                    gl_FragColor = vec4(finalColor, finalOpacity);
                }
            `,
            transparent: true,
            depthWrite: false
        });
        
        // Generate grid geometry
        const gridGeometry = createGridGeometry(CONFIG.grid.size, CONFIG.grid.divisions);
        const mainGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
        mainGrid.position.y = CONFIG.grid.position.y;
        
        Mobile3D.gridGroup.add(mainGrid);
    }
    
    /**
     * Creates grid geometry
     * @param {number} size - Grid size
     * @param {number} divisions - Number of divisions
     * @returns {THREE.BufferGeometry} Grid geometry
     */
    function createGridGeometry(size, divisions) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const halfSize = size / 2;
        const step = size / divisions;
        
        // Vertical lines
        for (let i = 0; i <= divisions; i++) {
            const x = -halfSize + i * step;
            vertices.push(x, 0, -halfSize);
            vertices.push(x, 0, halfSize);
        }
        
        // Horizontal lines
        for (let i = 0; i <= divisions; i++) {
            const z = -halfSize + i * step;
            vertices.push(-halfSize, 0, z);
            vertices.push(halfSize, 0, z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        return geometry;
    }
    
    /**
     * Creates additional grid layers for depth effect
     */
    function createLayeredGrids() {
        CONFIG.grid.layers.forEach(layer => {
            const layerGrid = new THREE.GridHelper(
                layer.size,
                layer.divisions,
                new THREE.Color(CONFIG.model.primaryColor),
                new THREE.Color(CONFIG.model.primaryColor)
            );
            
            layerGrid.material.opacity = layer.opacity;
            layerGrid.material.transparent = true;
            layerGrid.position.y = layer.y + CONFIG.grid.position.y + 0.5;
            
            Mobile3D.gridGroup.add(layerGrid);
        });
    }
    
    /**
     * Creates a simple fallback grid
     */
    function createFallbackGrid() {
        const simpleGrid = new THREE.GridHelper(
            CONFIG.grid.size,
            CONFIG.grid.divisions,
            CONFIG.model.primaryColor,
            CONFIG.model.primaryColor
        );
        simpleGrid.material.opacity = 0.6;
        simpleGrid.material.transparent = true;
        simpleGrid.position.y = -0.5;
        Mobile3D.scene.add(simpleGrid);
        console.log('✅ Fallback grid created');
    }

    /* ========================================
       Lighting Setup
       ======================================== */
    
    /**
     * Sets up scene lighting
     */
    function setupLighting() {
        console.log('💡 Setting up lighting...');
        
        try {
            // Ambient light for base illumination
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            Mobile3D.scene.add(ambientLight);
            
            // Hemisphere light for natural gradient
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
            Mobile3D.scene.add(hemiLight);
            
            // Key light with shadows
            const keyLight = createDirectionalLight(0xffffff, 1.0, { x: 5, y: 10, z: 5 });
            keyLight.castShadow = true;
            configureShadows(keyLight);
            Mobile3D.scene.add(keyLight);
            
            // Fill light for softer shadows
            const fillLight = createDirectionalLight(0x80e8ff, 0.5, { x: -3, y: 5, z: -3 });
            Mobile3D.scene.add(fillLight);
            
            console.log('✅ Lighting setup complete');
            
        } catch (error) {
            console.error('❌ Error setting up lighting:', error);
        }
    }
    
    /**
     * Creates a directional light
     * @param {number} color - Light color
     * @param {number} intensity - Light intensity
     * @param {Object} position - Light position
     * @returns {THREE.DirectionalLight} Configured light
     */
    function createDirectionalLight(color, intensity, position) {
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(position.x, position.y, position.z);
        return light;
    }
    
    /**
     * Configures shadow settings for a light
     * @param {THREE.DirectionalLight} light - Light to configure
     */
    function configureShadows(light) {
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 50;
        light.shadow.camera.left = -20;
        light.shadow.camera.right = 20;
        light.shadow.camera.top = 20;
        light.shadow.camera.bottom = -20;
    }

    /* ========================================
       Model Loading
       ======================================== */
    
    /**
     * Loads the 3D dog model
     * @returns {Promise} Model loading promise
     */
    function loadDogModel() {
        console.log('🐕 Loading dog model...');
        
        Mobile3D.modelLoadPromise = new Promise((resolve, reject) => {
            if (!THREE.GLTFLoader) {
                console.error('❌ GLTFLoader not available');
                createFallbackDog();
                Mobile3D.modelLoaded = true;
                resolve();
                return;
            }
            
            const loader = new THREE.GLTFLoader();
            const modelPaths = getModelPaths();
            
            tryLoadModel(loader, modelPaths, 0, resolve, reject);
        });
        
        return Mobile3D.modelLoadPromise;
    }
    
    /**
     * Attempts to load model from multiple paths
     * @param {THREE.GLTFLoader} loader - GLTF loader instance
     * @param {string[]} paths - Array of paths to try
     * @param {number} index - Current path index
     * @param {Function} resolve - Promise resolve function
     * @param {Function} reject - Promise reject function
     */
    function tryLoadModel(loader, paths, index, resolve, reject) {
        if (index >= paths.length) {
            console.log('⚠️ All paths failed, creating fallback');
            createFallbackDog();
            Mobile3D.modelLoaded = true;
            resolve();
            return;
        }
        
        const modelPath = paths[index];
        console.log(`🔄 Trying path ${index + 1}/${paths.length}: ${modelPath}`);
        
        loader.load(
            modelPath,
            (gltf) => {
                console.log('✅ Model loaded from:', modelPath);
                processLoadedModel(gltf.scene);
                Mobile3D.modelLoaded = true;
                resolve();
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = (progress.loaded / progress.total * 100).toFixed(1);
                    updateLoadingProgress(percent);
                }
            },
            (error) => {
                console.log(`❌ Failed loading from ${modelPath}`);
                tryLoadModel(loader, paths, index + 1, resolve, reject);
            }
        );
    }
    
    /**
     * Updates loading progress indicator
     * @param {string} percent - Loading percentage
     */
    function updateLoadingProgress(percent) {
        console.log(`📊 Loading: ${percent}%`);
        
        const loadingText = document.getElementById('loadingText');
        if (loadingText && loadingText.textContent.includes('3D')) {
            loadingText.textContent = `Loading 3D environment... ${percent}%`;
        }
    }
    
    /**
     * Processes and configures the loaded model
     * @param {THREE.Object3D} model - Loaded model
     */
    function processLoadedModel(model) {
        try {
            Mobile3D.dogModel = model;
            
            // Calculate bounds and scale
            const bounds = new THREE.Box3().setFromObject(model);
            const center = bounds.getCenter(new THREE.Vector3());
            const size = bounds.getSize(new THREE.Vector3());
            
            // Apply uniform scale
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scale = CONFIG.model.scale / maxDimension;
            model.scale.multiplyScalar(scale);
            
            // Position model
            positionModel(model, center, scale);
            
            // Apply wireframe materials
            applyWireframeMaterials(model);
            
            Mobile3D.scene.add(model);
            console.log('✅ Model processed and added to scene');
            
        } catch (error) {
            console.error('❌ Error processing model:', error);
            createFallbackDog();
        }
    }
    
    /**
     * Positions the model correctly on the grid
     * @param {THREE.Object3D} model - Model to position
     * @param {THREE.Vector3} center - Model center
     * @param {number} scale - Applied scale
     */
    function positionModel(model, center, scale) {
        // Center horizontally
        model.position.x = -center.x * scale;
        model.position.z = -center.z * scale;
        
        // Position on grid
        const scaledBox = new THREE.Box3().setFromObject(model);
        model.position.y = CONFIG.grid.position.y - scaledBox.min.y;
        
        // Store base position for animations
        model.userData.baseY = model.position.y;
    }
    
    /**
     * Applies wireframe materials to model meshes
     * @param {THREE.Object3D} model - Model to process
     */
    function applyWireframeMaterials(model) {
        let meshCount = 0;
        
        model.traverse((child) => {
            if (child.isMesh) {
                try {
                    meshCount++;
                    
                    // Base material
                    child.material = new THREE.MeshLambertMaterial({
                        color: CONFIG.model.secondaryColor,
                        transparent: true,
                        opacity: 0.3
                    });
                    
                    // Wireframe overlay
                    const wireframeGeometry = new THREE.WireframeGeometry(child.geometry);
                    const wireframeMaterial = new THREE.LineBasicMaterial({
                        color: CONFIG.model.primaryColor,
                        transparent: true,
                        opacity: 0.8
                    });
                    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                    child.add(wireframe);
                    
                    // Enable shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                } catch (error) {
                    console.warn('⚠️ Error processing mesh:', error);
                }
            }
        });
        
        console.log(`✅ Wireframe applied to ${meshCount} meshes`);
    }
    
    /**
     * Creates a fallback dog model using primitives
     */
    function createFallbackDog() {
        console.log('⚠️ Creating fallback dog model...');
        
        try {
            const group = new THREE.Group();
            const materials = createFallbackMaterials();
            
            // Create body parts
            createDogBody(group, materials);
            createDogHead(group, materials);
            createDogLegs(group, materials);
            
            // Position on grid
            positionFallbackDog(group);
            
            Mobile3D.scene.add(group);
            Mobile3D.dogModel = group;
            
            console.log('✅ Fallback dog created');
            
        } catch (error) {
            console.error('❌ Error creating fallback dog:', error);
        }
    }
    
    /**
     * Creates materials for fallback dog
     * @returns {Object} Materials object
     */
    function createFallbackMaterials() {
        return {
            base: new THREE.MeshLambertMaterial({
                color: CONFIG.model.secondaryColor,
                transparent: true,
                opacity: 0.3
            }),
            wireframe: new THREE.LineBasicMaterial({
                color: CONFIG.model.primaryColor,
                transparent: true,
                opacity: 1.0
            })
        };
    }
    
    /**
     * Creates dog body for fallback model
     * @param {THREE.Group} group - Parent group
     * @param {Object} materials - Materials object
     */
    function createDogBody(group, materials) {
        const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 12);
        bodyGeometry.scale(1.5, 0.8, 0.9);
        
        const body = new THREE.Mesh(bodyGeometry, materials.base);
        const bodyWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(bodyGeometry),
            materials.wireframe
        );
        body.add(bodyWireframe);
        group.add(body);
    }
    
    /**
     * Creates dog head for fallback model
     * @param {THREE.Group} group - Parent group
     * @param {Object} materials - Materials object
     */
    function createDogHead(group, materials) {
        const headGeometry = new THREE.SphereGeometry(0.5, 12, 10);
        const head = new THREE.Mesh(headGeometry, materials.base);
        head.position.set(1.2, 0.2, 0);
        
        const headWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(headGeometry),
            materials.wireframe
        );
        head.add(headWireframe);
        group.add(head);
    }
    
    /**
     * Creates dog legs for fallback model
     * @param {THREE.Group} group - Parent group
     * @param {Object} materials - Materials object
     */
    function createDogLegs(group, materials) {
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
        const legPositions = [
            [0.5, -0.7, -0.3],
            [0.5, -0.7, 0.3],
            [-0.5, -0.7, -0.3],
            [-0.5, -0.7, 0.3]
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, materials.base);
            leg.position.set(...pos);
            
            const legWireframe = new THREE.LineSegments(
                new THREE.WireframeGeometry(legGeometry),
                materials.wireframe
            );
            leg.add(legWireframe);
            group.add(leg);
        });
    }
    
    /**
     * Positions the fallback dog on the grid
     * @param {THREE.Group} group - Dog group
     */
    function positionFallbackDog(group) {
        const groupBox = new THREE.Box3().setFromObject(group);
        group.position.y = CONFIG.grid.position.y - groupBox.min.y;
        group.userData.baseY = group.position.y;
    }

    /* ========================================
       Animation Loop
       ======================================== */
    
    /**
     * Starts the animation loop
     */
    function startAnimation() {
        let time = 0;
        
        function animate() {
            Mobile3D.animationId = requestAnimationFrame(animate);
            time += CONFIG.animation.timeStep;
            
            try {
                // Update controls
                if (Mobile3D.controls) {
                    Mobile3D.controls.update();
                }
                
                // Update grid shader uniforms
                updateGridShaders(time);
                
                // Animate model
                animateModel();
                
                // Render scene
                if (Mobile3D.renderer && Mobile3D.scene && Mobile3D.camera) {
                    Mobile3D.renderer.render(Mobile3D.scene, Mobile3D.camera);
                }
                
            } catch (error) {
                console.error('❌ Animation error:', error);
                stopAnimation();
            }
        }
        
        animate();
        console.log('✅ Animation loop started');
    }
    
    /**
     * Updates grid shader uniforms
     * @param {number} time - Current time value
     */
    function updateGridShaders(time) {
        if (!Mobile3D.gridGroup) return;
        
        Mobile3D.gridGroup.children.forEach(child => {
            if (child.material?.uniforms?.time) {
                child.material.uniforms.time.value = time;
            }
        });
    }
    
    /**
     * Animates the dog model
     */
    function animateModel() {
        if (!Mobile3D.dogModel) return;
        
        // Horizontal rotation only
        Mobile3D.dogModel.rotation.y -= CONFIG.model.rotationSpeed;
    }
    
    /**
     * Stops the animation loop
     */
    function stopAnimation() {
        if (Mobile3D.animationId) {
            cancelAnimationFrame(Mobile3D.animationId);
            Mobile3D.animationId = null;
        }
    }

    /* ========================================
       Responsive Handling
       ======================================== */
    
    /**
     * Handles window resize events
     */
    function handleResize() {
        const container = Mobile3D.renderer?.domElement?.parentElement;
        if (!container || !Mobile3D.camera || !Mobile3D.renderer) return;
        
        try {
            const dimensions = calculateViewportDimensions();
            
            if (dimensions.width > 0 && dimensions.height > 0) {
                // Update camera
                Mobile3D.camera.aspect = dimensions.width / dimensions.height;
                Mobile3D.camera.updateProjectionMatrix();
                
                // Update renderer
                Mobile3D.renderer.setSize(dimensions.width, dimensions.height);
                
                // Ensure full coverage
                Mobile3D.renderer.domElement.style.width = '100%';
                Mobile3D.renderer.domElement.style.height = '100%';
            }
        } catch (error) {
            console.error('❌ Resize error:', error);
        }
    }
    
    /**
     * Calculates appropriate viewport dimensions
     * @returns {Object} Width and height object
     */
    function calculateViewportDimensions() {
        if (window.innerWidth <= 768) {
            // Mobile viewport
            return {
                width: window.innerWidth,
                height: window.innerHeight - 150
            };
        } else {
            // Desktop viewport
            const container = Mobile3D.renderer.domElement.parentElement;
            const rect = container.getBoundingClientRect();
            return {
                width: Math.max(rect.width, window.innerWidth),
                height: Math.max(rect.height, window.innerHeight - 200)
            };
        }
    }

    /* ========================================
       Cleanup and Disposal
       ======================================== */
    
    /**
     * Disposes of all 3D resources
     */
    function dispose() {
        try {
            stopAnimation();
            
            // Dispose of Three.js objects
            if (Mobile3D.renderer) {
                Mobile3D.renderer.dispose();
            }
            
            if (Mobile3D.controls) {
                Mobile3D.controls.dispose();
            }
            
            if (Mobile3D.pmremGenerator) {
                Mobile3D.pmremGenerator.dispose();
            }
            
            // Clear scene
            if (Mobile3D.scene) {
                Mobile3D.scene.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            
            // Remove event listeners
            window.removeEventListener('resize', handleResize);
            
            // Reset state
            Mobile3D.isInitialized = false;
            Mobile3D.modelLoaded = false;
            
            console.log('🗑️ Mobile 3D disposed');
            
        } catch (error) {
            console.error('❌ Error during disposal:', error);
        }
    }

    /* ========================================
       Public API
       ======================================== */
    window.Mobile3D = {
        init: initMobile3D,
        scene: () => Mobile3D,
        dispose: dispose,
        isInitialized: () => Mobile3D.isInitialized,
        isModelLoaded: () => Mobile3D.modelLoaded
    };

    console.log('✅ Mobile 3D Viewer Module Ready');

})();