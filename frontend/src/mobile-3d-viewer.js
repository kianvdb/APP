// mobile-3d-viewer.js - Fixed 3D Viewer with better model proportions and restricted controls

(function() {
    'use strict';
    
    console.log('📱 MOBILE 3D VIEWER LOADED - FIXED VERSION');

    // Prevent multiple initializations
    if (window.mobile3DInitialized) {
        console.log('⚠️ Mobile 3D already initialized, skipping...');
        return;
    }
    window.mobile3DInitialized = true;

    // Clean 3D namespace
    const Mobile3D = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        dogModel: null,
        pmremGenerator: null,
        isInitialized: false,
        gridGroup: null,
        animationId: null,
        modelLoadPromise: null, 
    modelLoaded: false 
    };

    // Smart model path detection based on current location
    function getModelPaths() {
        const currentPath = window.location.pathname;
        const isInHtmlFolder = currentPath.includes('/html/');
        
        console.log('📍 Current path:', currentPath);
        console.log('📍 Is in html folder:', isInHtmlFolder);
        
        if (isInHtmlFolder) {
            // From frontend/html/ folder
            return [
                '../models/dog6.glb',
                '../../models/dog6.glb',
                './models/dog6.glb',
                '/models/dog6.glb',
                '../public/models/dog6.glb'
            ];
        } else {
            // From frontend/ root (index.html)
            return [
                'models/dog6.glb',
                './models/dog6.glb',
                '/models/dog6.glb',
                'public/models/dog6.glb',
                '../models/dog6.glb'
            ];
        }
    }

    // Initialize 3D scene
    function initMobile3D(containerId = 'hero3d') {
        if (Mobile3D.isInitialized) {
            console.log('⚠️ Mobile 3D scene already initialized');
            return Mobile3D;
        }
        
        console.log('🎬 ===== INITIALIZING MOBILE 3D SCENE - FIXED VERSION =====');
        Mobile3D.isInitialized = true;
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container #${containerId} not found!`);
            return null;
        }
        
        // Clear container and set proper sizing
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        
        // Scene setup
        Mobile3D.scene = new THREE.Scene();
        Mobile3D.scene.background = null;
        Mobile3D.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);
        
        // Camera setup - Use FULL viewport dimensions
        const width = window.innerWidth; // Full viewport width
        const height = window.innerHeight - 150; // Account for header/nav
        
        console.log(`📐 FULL VIEWPORT: ${width}x${height}`);
        
        // Adjusted camera for better model presentation
        Mobile3D.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        Mobile3D.camera.position.set(2, 5, 4); // Much closer position for zoom effect
        Mobile3D.camera.lookAt(0, 2, 0); // Steeper downward angle
        
        // Renderer setup with better error handling
        try {
            Mobile3D.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                powerPreference: "default",
                precision: "mediump",
                stencil: false,
                depth: true
            });
            
            Mobile3D.renderer.setSize(width, height);
            Mobile3D.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            Mobile3D.renderer.setClearColor(0x0a0a0a, 0);
            Mobile3D.renderer.shadowMap.enabled = true;
            Mobile3D.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            Mobile3D.renderer.outputEncoding = THREE.sRGBEncoding;
            Mobile3D.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            Mobile3D.renderer.toneMappingExposure = 0.8;
            
            Mobile3D.renderer.domElement.style.position = 'absolute';
            Mobile3D.renderer.domElement.style.top = '0';
            Mobile3D.renderer.domElement.style.left = '0';
            Mobile3D.renderer.domElement.style.width = '100%';
            Mobile3D.renderer.domElement.style.height = '100%';
            Mobile3D.renderer.domElement.style.display = 'block';
            Mobile3D.renderer.domElement.style.zIndex = '1';
            Mobile3D.renderer.domElement.style.pointerEvents = 'auto'; // Changed from 'none' to 'auto'
            
            console.log('✅ WebGL renderer created successfully');
            
        } catch (error) {
            console.error('❌ WebGL renderer error:', error);
            createCanvasFallback(container);
            return null;
        }
        
        container.appendChild(Mobile3D.renderer.domElement);
        
        // Environment setup
        Mobile3D.pmremGenerator = new THREE.PMREMGenerator(Mobile3D.renderer);
        
        // Initialize components
        setupRestrictedControls(); // Changed to restricted controls
        createFullScreenGrid();
        setupSimpleLighting();
        loadDogModel();
        startAnimation();
        
        // Handle resize
        window.addEventListener('resize', handleResize, false);
        
        console.log('✅ Mobile 3D Scene initialized successfully');
        return Mobile3D;
    }

    function createCanvasFallback(container) {
        console.log('⚠️ Creating 2D canvas fallback...');
        const canvas = document.createElement('canvas');
        canvas.width = container.offsetWidth || 400;
        canvas.height = container.offsetHeight || 300;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw simple wireframe dog shape
        ctx.strokeStyle = '#00bcd4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Simple dog outline
        ctx.ellipse(canvas.width/2, canvas.height/2, 80, 60, 0, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.fillStyle = '#00bcd4';
        ctx.font = '16px Sora';
        ctx.textAlign = 'center';
        ctx.fillText('3D Viewer Loading...', canvas.width/2, canvas.height/2 + 100);
        
        container.appendChild(canvas);
    }

    // Setup restricted controls - only horizontal rotation
    function setupRestrictedControls() {
        if (!THREE.OrbitControls || !Mobile3D.camera || !Mobile3D.renderer) {
            console.log('⚠️ OrbitControls not available or missing dependencies');
            return;
        }
        
        try {
            // Create controls directly on the renderer's DOM element
            Mobile3D.controls = new THREE.OrbitControls(Mobile3D.camera, Mobile3D.renderer.domElement);
            Mobile3D.controls.enableDamping = true;
            Mobile3D.controls.dampingFactor = 0.05;
            Mobile3D.controls.autoRotate = false;
            Mobile3D.controls.target.set(0, -1, 0); // Steeper tilt target
            
            // Restrict controls - only horizontal rotation
            Mobile3D.controls.enableZoom = false; // Disable zoom
            Mobile3D.controls.enablePan = false; // Disable panning
            Mobile3D.controls.minPolarAngle = Math.PI * 0.5; // Lock vertical rotation
            Mobile3D.controls.maxPolarAngle = Math.PI * 0.5; // Lock vertical rotation
            Mobile3D.controls.minAzimuthAngle = -Infinity; // Allow full horizontal rotation
            Mobile3D.controls.maxAzimuthAngle = Infinity; // Allow full horizontal rotation
            
            console.log('✅ Restricted controls initialized - horizontal rotation only');
        } catch (error) {
            console.error('❌ Error setting up controls:', error);
        }
    }

    function createFullScreenGrid() {
        console.log('🔲 Creating original full-screen grid...');
        
        // Create a group to hold all grid elements
        Mobile3D.gridGroup = new THREE.Group();
        
        try {
            // Much larger grid that extends beyond screen edges - ORIGINAL SIZE
            const gridSize = 200; // Large full-screen grid
            const gridDivisions = 100; // Fine divisions for detail
            
            // Main perspective grid with original shader (fixed)
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
                        // Distance-based opacity
                        float fogFactor = smoothstep(fogNear, fogFar, vDistance);
                        
                        // Grid intensity based on distance from center
                        float centerDistance = length(vWorldPosition.xz);
                        float gridIntensity = 1.0 - smoothstep(0.0, 80.0, centerDistance);
                        
                        // Original cyan color with subtle pulse
                        float pulse = sin(time * 0.5) * 0.1 + 0.9;
                        vec3 gridColor = vec3(0.0, 0.737, 0.831) * gridIntensity * pulse; // #00bcd4
                        vec3 finalColor = mix(gridColor, fogColor, fogFactor);
                        
                        float finalOpacity = (1.0 - fogFactor) * gridIntensity * 0.8;
                        gl_FragColor = vec4(finalColor, finalOpacity);
                    }
                `,
                transparent: true,
                depthWrite: false
            });
            
            // Create main grid geometry - ORIGINAL CLEAN VERSION
            const gridGeometry = new THREE.BufferGeometry();
            const vertices = [];
            const halfSize = gridSize / 2;
            const step = gridSize / gridDivisions;
            
            // Vertical lines (extending much further)
            for (let i = 0; i <= gridDivisions; i++) {
                const x = -halfSize + i * step;
                vertices.push(x, 0, -halfSize);
                vertices.push(x, 0, halfSize);
            }
            
            // Horizontal lines (extending much further)
            for (let i = 0; i <= gridDivisions; i++) {
                const z = -halfSize + i * step;
                vertices.push(-halfSize, 0, z);
                vertices.push(halfSize, 0, z);
            }
            
            gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            
            const mainGrid = new THREE.LineSegments(gridGeometry, gridMaterial);
            mainGrid.position.y = -6; // Moved grid much lower
            Mobile3D.gridGroup.add(mainGrid);
            
            // ONLY add the original subtle secondary grids - NO RADIAL PATTERNS
            const gridLayers = [
                { size: 150, divisions: 75, opacity: 0.6, y: -0.48 },
                { size: 100, divisions: 50, opacity: 0.4, y: -0.46 },
                { size: 60, divisions: 30, opacity: 0.2, y: -0.44 }
            ];
            
            gridLayers.forEach((layer, index) => {
                const layerGrid = new THREE.GridHelper(
                    layer.size, 
                    layer.divisions, 
                    new THREE.Color(0x00bcd4), 
                    new THREE.Color(0x00bcd4)
                );
                layerGrid.material.opacity = layer.opacity;
                layerGrid.material.transparent = true;
                layerGrid.position.y = layer.y - 5.5; // Adjusted for much lower grid position
                Mobile3D.gridGroup.add(layerGrid);
            });
            
            Mobile3D.scene.add(Mobile3D.gridGroup);
            
            console.log('✅ Original full-screen grid created (no radial patterns)');
            
        } catch (error) {
            console.error('❌ Error creating full grid, falling back to simple version:', error);
            // Fallback to simple but full-screen grid
            const simpleGrid = new THREE.GridHelper(200, 100, 0x00bcd4, 0x00bcd4);
            simpleGrid.material.opacity = 0.6;
            simpleGrid.material.transparent = true;
            simpleGrid.position.y = -0.5;
            Mobile3D.scene.add(simpleGrid);
            console.log('✅ Fallback full-screen grid created');
        }
    }

    function setupSimpleLighting() {
        console.log('💡 Setting up simple lighting...');
        
        try {
            // Ambient light
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
            Mobile3D.scene.add(ambientLight);
            
            // Hemisphere light for natural feel
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
            Mobile3D.scene.add(hemiLight);
            
            // Main directional light
            const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
            keyLight.position.set(5, 10, 5);
            keyLight.castShadow = true;
            keyLight.shadow.mapSize.width = 1024; // Reduced for performance
            keyLight.shadow.mapSize.height = 1024;
            keyLight.shadow.camera.near = 0.1;
            keyLight.shadow.camera.far = 50;
            keyLight.shadow.camera.left = -20;
            keyLight.shadow.camera.right = 20;
            keyLight.shadow.camera.top = 20;
            keyLight.shadow.camera.bottom = -20;
            Mobile3D.scene.add(keyLight);
            
            // Fill light
            const fillLight = new THREE.DirectionalLight(0x80e8ff, 0.5);
            fillLight.position.set(-3, 5, -3);
            Mobile3D.scene.add(fillLight);
            
            console.log('✅ Simple lighting setup complete');
            
        } catch (error) {
            console.error('❌ Error setting up lighting:', error);
        }
    }

    function loadDogModel() {
    console.log('🐕 Loading dog model...');
    
    // Create a promise for model loading
    Mobile3D.modelLoadPromise = new Promise((resolve, reject) => {
        const modelPaths = getModelPaths();
        console.log('🔄 Trying paths:', modelPaths);
        
        if (!THREE.GLTFLoader) {
            console.error('❌ GLTFLoader not available');
            createFallbackDog();
            Mobile3D.modelLoaded = true;
            resolve();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        function tryLoadModel(pathIndex = 0) {
            if (pathIndex >= modelPaths.length) {
                console.log('⚠️ All paths failed, creating fallback');
                createFallbackDog();
                Mobile3D.modelLoaded = true;
                resolve();
                return;
            }

            const modelPath = modelPaths[pathIndex];
            console.log(`🔄 Trying: ${modelPath} (${pathIndex + 1}/${modelPaths.length})`);
            
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
                        console.log(`📊 Loading: ${percent}%`);
                        
                        // Update loading screen if it's still visible
                        const loadingText = document.getElementById('loadingText');
                        if (loadingText && loadingText.textContent.includes('3D')) {
                            loadingText.textContent = `Loading 3D environment... ${percent}%`;
                        }
                    }
                },
                (error) => {
                    console.log(`❌ Failed ${modelPath}:`, error.message || 'Unknown error');
                    tryLoadModel(pathIndex + 1);
                }
            );
        }

        tryLoadModel();
    });
    
    return Mobile3D.modelLoadPromise;
}
    function processLoadedModel(model) {
        try {
            Mobile3D.dogModel = model;
            
            // Scale and position - SMALLER MODEL
            const box = new THREE.Box3().setFromObject(Mobile3D.dogModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 7 / maxDim; // Back to original scale from version 12
            Mobile3D.dogModel.scale.multiplyScalar(scale);
            
            // Center the model horizontally
            Mobile3D.dogModel.position.x = -center.x * scale;
            Mobile3D.dogModel.position.z = -center.z * scale;
            
            // Position on grid with adjusted height
            const scaledBox = new THREE.Box3().setFromObject(Mobile3D.dogModel);
            Mobile3D.dogModel.position.y = -6 - scaledBox.min.y; // Model sits on much lower grid
            
            // Convert to wireframe with error handling
            let meshCount = 0;
            Mobile3D.dogModel.traverse((child) => {
                if (child.isMesh) {
                    try {
                        meshCount++;
                        
                        // Simple base material
                        child.material = new THREE.MeshLambertMaterial({ 
                            color: 0x404040,
                            transparent: true,
                            opacity: 0.3
                        });
                        
                        // Simple wireframe overlay
                        const wireframeGeometry = new THREE.WireframeGeometry(child.geometry);
                        const wireframeMaterial = new THREE.LineBasicMaterial({ 
                            color: 0x00bcd4,
                            transparent: true,
                            opacity: 0.8
                        });
                        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                        child.add(wireframe);
                        
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                    } catch (materialError) {
                        console.warn('⚠️ Error processing mesh material:', materialError);
                    }
                }
            });
            
            Mobile3D.scene.add(Mobile3D.dogModel);
            Mobile3D.dogModel.userData.baseY = Mobile3D.dogModel.position.y;
            
            console.log(`✅ Wireframe dog created: ${meshCount} meshes`);
            
        } catch (error) {
            console.error('❌ Error processing loaded model:', error);
            createFallbackDog();
        }
    }

    function createFallbackDog() {
        console.log('⚠️ Creating fallback dog...');
        
        try {
            const group = new THREE.Group();
            const material = new THREE.MeshLambertMaterial({ 
                color: 0x404040,
                transparent: true,
                opacity: 0.3
            });
            const wireframeMaterial = new THREE.LineBasicMaterial({ 
                color: 0x00bcd4,
                transparent: true,
                opacity: 1.0
            });
            
            // Body - smaller proportions
            const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 12); // Reduced from 1.2
            bodyGeometry.scale(1.5, 0.8, 0.9);
            const body = new THREE.Mesh(bodyGeometry, material);
            const bodyWireframe = new THREE.LineSegments(
                new THREE.WireframeGeometry(bodyGeometry), 
                wireframeMaterial
            );
            body.add(bodyWireframe);
            group.add(body);
            
            // Head - smaller
            const headGeometry = new THREE.SphereGeometry(0.5, 12, 10); // Reduced from 0.7
            const head = new THREE.Mesh(headGeometry, material);
            head.position.set(1.2, 0.2, 0); // Adjusted position
            const headWireframe = new THREE.LineSegments(
                new THREE.WireframeGeometry(headGeometry), 
                wireframeMaterial
            );
            head.add(headWireframe);
            group.add(head);
            
            // Legs - smaller
            const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8); // Reduced from 1.2
            const positions = [
                [0.5, -0.7, -0.3], [0.5, -0.7, 0.3],
                [-0.5, -0.7, -0.3], [-0.5, -0.7, 0.3]
            ];
            
            positions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, material);
                leg.position.set(...pos);
                const legWireframe = new THREE.LineSegments(
                    new THREE.WireframeGeometry(legGeometry), 
                    wireframeMaterial
                );
                leg.add(legWireframe);
                group.add(leg);
            });
            
            // Position on grid
            const groupBox = new THREE.Box3().setFromObject(group);
            group.position.y = -6 - groupBox.min.y; // Adjusted for much lower grid
            group.userData.baseY = group.position.y;
            
            Mobile3D.scene.add(group);
            Mobile3D.dogModel = group;
            
            console.log('✅ Fallback dog created');
            
        } catch (error) {
            console.error('❌ Error creating fallback dog:', error);
        }
    }

    function startAnimation() {
        let time = 0;
        
        function animate() {
            Mobile3D.animationId = requestAnimationFrame(animate);
            time += 0.016; // ~60fps
            
            try {
                if (Mobile3D.controls) {
                    Mobile3D.controls.update();
                }
                
                // Update grid shader time uniform for pulse effect
                if (Mobile3D.gridGroup) {
                    Mobile3D.gridGroup.children.forEach(child => {
                        if (child.material && child.material.uniforms) {
                            if (child.material.uniforms.time) {
                                child.material.uniforms.time.value = time;
                            }
                        }
                    });
                }
                
                // Only rotate dog horizontally, no floating
                if (Mobile3D.dogModel) {
                    Mobile3D.dogModel.rotation.y -= 0.003; // Horizontal rotation only
                    // No vertical movement - keeps model grounded
                }
                
                if (Mobile3D.renderer && Mobile3D.scene && Mobile3D.camera) {
                    Mobile3D.renderer.render(Mobile3D.scene, Mobile3D.camera);
                }
                
            } catch (error) {
                console.error('❌ Animation error:', error);
                // Stop animation on repeated errors
                if (Mobile3D.animationId) {
                    cancelAnimationFrame(Mobile3D.animationId);
                }
            }
        }
        
        animate();
        console.log('✅ Enhanced animation started with grid pulse effects');
    }

    function handleResize() {
        const container = Mobile3D.renderer?.domElement?.parentElement;
        if (!container || !Mobile3D.camera || !Mobile3D.renderer) return;
        
        try {
            // Use full viewport dimensions for true edge-to-edge coverage
            let width, height;
            
            if (window.innerWidth <= 768) {
                // Mobile: use full viewport
                width = window.innerWidth;
                height = window.innerHeight - 150; // Account for header and bottom nav
            } else {
                // Desktop: use container bounds but ensure full coverage
                const containerRect = container.getBoundingClientRect();
                width = Math.max(containerRect.width, window.innerWidth);
                height = Math.max(containerRect.height, window.innerHeight - 200);
            }
            
            if (width > 0 && height > 0) {
                Mobile3D.camera.aspect = width / height;
                Mobile3D.camera.updateProjectionMatrix();
                Mobile3D.renderer.setSize(width, height);
                
                // Ensure renderer fills the entire space
                Mobile3D.renderer.domElement.style.width = '100%';
                Mobile3D.renderer.domElement.style.height = '100%';
            }
        } catch (error) {
            console.error('❌ Resize error:', error);
        }
    }

    // Public API
    window.Mobile3D = {
        init: initMobile3D,
        scene: () => Mobile3D,
        dispose: () => {
            try {
                if (Mobile3D.animationId) {
                    cancelAnimationFrame(Mobile3D.animationId);
                }
                if (Mobile3D.renderer) {
                    Mobile3D.renderer.dispose();
                }
                if (Mobile3D.controls) {
                    Mobile3D.controls.dispose();
                }
                Mobile3D.isInitialized = false;
                console.log('🗑️ Mobile 3D disposed');
            } catch (error) {
                console.error('❌ Error during disposal:', error);
            }
        }
    };

    console.log('✅ Mobile 3D Viewer ready - FIXED VERSION');

})();