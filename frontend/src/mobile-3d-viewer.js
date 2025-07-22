// mobile-3d-viewer.js - Clean 3D Viewer for Mobile App
// Enhanced version with full-screen grid that extends to screen edges

(function() {
    'use strict';
    
    console.log('📱 MOBILE 3D VIEWER LOADED - FULL SCREEN VERSION');

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
        gridGroup: null
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
        
        console.log('🎬 ===== INITIALIZING MOBILE 3D SCENE - FULL SCREEN =====');
        Mobile3D.isInitialized = true;
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Container #${containerId} not found!`);
            return null;
        }
        
        // Clear container and make it full viewport
        container.innerHTML = '';
        
        // Force container to be full screen on mobile
        if (window.innerWidth <= 768) {
            container.style.position = 'fixed';
            container.style.top = '70px'; // Below header
            container.style.left = '0';
            container.style.right = '0';
            container.style.bottom = '80px'; // Above bottom nav
            container.style.width = '100vw';
            container.style.height = 'calc(100vh - 150px)';
            container.style.zIndex = '1';
            container.style.background = 'transparent';
            container.style.overflow = 'hidden';
        }
        
        // Add controls toggle for generate section
        if (containerId === '3dCanvas' && window.innerWidth <= 768) {
            addControlsToggle();
        }
        
        // Scene setup
        Mobile3D.scene = new THREE.Scene();
        Mobile3D.scene.background = null;
        Mobile3D.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.015); // Reduced fog for larger view
        
        // Camera setup
        const width = container.offsetWidth || window.innerWidth;
        const height = container.offsetHeight || (window.innerHeight - 150);
        
        Mobile3D.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 2000); // Increased FOV and far distance
        Mobile3D.camera.position.set(8, 4, 10);
        Mobile3D.camera.lookAt(0, 2, 0);
        
        // Renderer setup
        Mobile3D.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp"
        });
        Mobile3D.renderer.setSize(width, height);
        Mobile3D.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        Mobile3D.renderer.setClearColor(0x0a0a0a, 0);
        Mobile3D.renderer.shadowMap.enabled = true;
        Mobile3D.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        Mobile3D.renderer.outputEncoding = THREE.sRGBEncoding;
        Mobile3D.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        Mobile3D.renderer.toneMappingExposure = 0.8;
        
        // Make renderer canvas fill container completely
        Mobile3D.renderer.domElement.style.width = '100%';
        Mobile3D.renderer.domElement.style.height = '100%';
        
        container.appendChild(Mobile3D.renderer.domElement);
        
        // Environment setup
        Mobile3D.pmremGenerator = new THREE.PMREMGenerator(Mobile3D.renderer);
        
        // Initialize components
        setupControls();
        createFullScreenGrid();
        setupLighting();
        loadDogModel();
        startAnimation();
        
        // Handle resize
        window.addEventListener('resize', handleResize, false);
        
        console.log('✅ Mobile 3D Scene initialized successfully - FULL SCREEN');
        return Mobile3D;
    }

    function setupControls() {
        if (!THREE.OrbitControls || !Mobile3D.camera || !Mobile3D.renderer) {
            console.log('⚠️ OrbitControls not available or missing dependencies');
            return;
        }
        
        Mobile3D.controls = new THREE.OrbitControls(Mobile3D.camera, Mobile3D.renderer.domElement);
        Mobile3D.controls.enableDamping = true;
        Mobile3D.controls.dampingFactor = 0.05;
        Mobile3D.controls.autoRotate = false;
        Mobile3D.controls.target.set(0, 2, 0);
        Mobile3D.controls.minPolarAngle = Math.PI * 0.1; // Allow more vertical movement
        Mobile3D.controls.maxPolarAngle = Math.PI * 0.8;
        Mobile3D.controls.minDistance = 5;
        Mobile3D.controls.maxDistance = 50;
        
        console.log('✅ Controls initialized');
    }

    function createFullScreenGrid() {
        console.log('🔲 Creating full-screen grid...');
        
        // Create a group to hold all grid elements
        Mobile3D.gridGroup = new THREE.Group();
        
        // Much larger grid that extends beyond screen edges
        const gridSize = 200; // Increased from 50
        const gridDivisions = 100; // Increased divisions for finer detail
        
        // Main perspective grid with enhanced shader
        const gridMaterial = new THREE.ShaderMaterial({
            uniforms: {
                fogColor: { value: new THREE.Color(0x0a0a0a) },
                fogNear: { value: 20 },
                fogFar: { value: 100 },
                cameraPosition: { value: new THREE.Vector3() },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying float vDistance;
                uniform vec3 cameraPosition;
                
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
                    
                    // Subtle pulse effect
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
        
        // Create main grid geometry
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
        mainGrid.position.y = -0.5;
        Mobile3D.gridGroup.add(mainGrid);
        
        // Add multiple grid layers for depth
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
            layerGrid.position.y = layer.y;
            Mobile3D.gridGroup.add(layerGrid);
        });
        
        // Add radial grid pattern from center
        const radialGeometry = new THREE.BufferGeometry();
        const radialVertices = [];
        const rings = 20;
        const spokes = 24;
        
        // Create concentric circles
        for (let ring = 1; ring <= rings; ring++) {
            const radius = ring * 4;
            for (let spoke = 0; spoke < spokes; spoke++) {
                const angle1 = (spoke / spokes) * Math.PI * 2;
                const angle2 = ((spoke + 1) / spokes) * Math.PI * 2;
                
                radialVertices.push(
                    Math.cos(angle1) * radius, 0, Math.sin(angle1) * radius,
                    Math.cos(angle2) * radius, 0, Math.sin(angle2) * radius
                );
            }
        }
        
        // Create spokes from center
        for (let spoke = 0; spoke < spokes; spoke++) {
            const angle = (spoke / spokes) * Math.PI * 2;
            radialVertices.push(0, 0, 0);
            radialVertices.push(Math.cos(angle) * 80, 0, Math.sin(angle) * 80);
        }
        
        radialGeometry.setAttribute('position', new THREE.Float32BufferAttribute(radialVertices, 3));
        
        const radialMaterial = new THREE.LineBasicMaterial({
            color: 0x00bcd4,
            opacity: 0.15,
            transparent: true
        });
        
        const radialGrid = new THREE.LineSegments(radialGeometry, radialMaterial);
        radialGrid.position.y = -0.42;
        Mobile3D.gridGroup.add(radialGrid);
        
        Mobile3D.scene.add(Mobile3D.gridGroup);
        
        console.log('✅ Full-screen grid created with multiple layers');
    }

    function setupLighting() {
        // Enhanced lighting for larger space
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        Mobile3D.scene.add(ambientLight);
        
        // Hemisphere light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        Mobile3D.scene.add(hemiLight);
        
        // Key light with larger shadow area
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(10, 15, 10);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 100;
        keyLight.shadow.camera.left = -30;
        keyLight.shadow.camera.right = 30;
        keyLight.shadow.camera.top = 30;
        keyLight.shadow.camera.bottom = -30;
        keyLight.shadow.bias = -0.0005;
        Mobile3D.scene.add(keyLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0x80e8ff, 0.3);
        fillLight.position.set(-8, 8, -5);
        Mobile3D.scene.add(fillLight);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 8, -15);
        Mobile3D.scene.add(rimLight);
        
        // Enhanced accent lights for larger space
        const accentLight1 = new THREE.PointLight(0x00bcd4, 0.4, 40);
        accentLight1.position.set(-10, 3, 10);
        Mobile3D.scene.add(accentLight1);
        
        const accentLight2 = new THREE.PointLight(0x0097a7, 0.4, 40);
        accentLight2.position.set(10, 3, -10);
        Mobile3D.scene.add(accentLight2);
        
        // Grid-following lights that move with camera
        const followLight1 = new THREE.PointLight(0x00bcd4, 0.2, 20);
        followLight1.position.set(5, 2, 5);
        Mobile3D.scene.add(followLight1);
        
        const followLight2 = new THREE.PointLight(0x006064, 0.2, 20);
        followLight2.position.set(-5, 2, -5);
        Mobile3D.scene.add(followLight2);
        
        // Environment map
        const envScene = new THREE.Scene();
        const envLight = new THREE.DirectionalLight(0xffffff, 0.5);
        envLight.position.set(1, 1, 1);
        envScene.add(envLight);
        
        const envTexture = Mobile3D.pmremGenerator.fromScene(envScene, 0.04).texture;
        Mobile3D.scene.environment = envTexture;
        Mobile3D.scene.environmentIntensity = 0.3;
        
        console.log('✅ Enhanced lighting setup complete');
    }

    function loadDogModel() {
        console.log('🐕 Loading dog model...');
        
        const modelPaths = getModelPaths();
        console.log('🔄 Trying paths:', modelPaths);
        
        if (!THREE.GLTFLoader) {
            console.error('❌ GLTFLoader not available');
            createFallbackDog();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        function tryLoadModel(pathIndex = 0) {
            if (pathIndex >= modelPaths.length) {
                console.log('⚠️ All paths failed, creating fallback');
                createFallbackDog();
                return;
            }

            const modelPath = modelPaths[pathIndex];
            console.log(`🔄 Trying: ${modelPath} (${pathIndex + 1}/${modelPaths.length})`);
            
            loader.load(
                modelPath,
                (gltf) => {
                    console.log('✅ Model loaded from:', modelPath);
                    processLoadedModel(gltf.scene);
                },
                (progress) => {
                    const percent = (progress.loaded / progress.total * 100).toFixed(1);
                    console.log(`📊 Loading: ${percent}%`);
                },
                (error) => {
                    console.log(`❌ Failed ${modelPath}:`, error.message || 'Unknown error');
                    tryLoadModel(pathIndex + 1);
                }
            );
        }

        tryLoadModel();
    }

    function processLoadedModel(model) {
        Mobile3D.dogModel = model;
        
        // Scale and position
        const box = new THREE.Box3().setFromObject(Mobile3D.dogModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 7 / maxDim;
        Mobile3D.dogModel.scale.multiplyScalar(scale);
        
        Mobile3D.dogModel.position.x = -center.x * scale;
        Mobile3D.dogModel.position.z = -center.z * scale;
        
        // Position on grid
        const scaledBox = new THREE.Box3().setFromObject(Mobile3D.dogModel);
        Mobile3D.dogModel.position.y = -0.5 - scaledBox.min.y;
        
        // Convert to wireframe
        let meshCount = 0;
        Mobile3D.dogModel.traverse((child) => {
            if (child.isMesh) {
                meshCount++;
                
                // Base material
                child.material = new THREE.MeshStandardMaterial({ 
                    color: 0x404040,
                    metalness: 0.1,
                    roughness: 0.8,
                    transparent: true,
                    opacity: 0.3,
                    envMapIntensity: 0.3
                });
                
                // Wireframe overlay
                const wireframeGeometry = new THREE.WireframeGeometry(child.geometry);
                const wireframeMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x00bcd4,
                    transparent: true,
                    opacity: 1.0
                });
                const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                
                wireframe.material.emissive = new THREE.Color(0x003344);
                wireframe.material.emissiveIntensity = 0.2;
                
                child.add(wireframe);
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        Mobile3D.scene.add(Mobile3D.dogModel);
        Mobile3D.dogModel.userData.baseY = Mobile3D.dogModel.position.y;
        
        console.log(`✅ Wireframe dog created: ${meshCount} meshes`);
    }

    function createFallbackDog() {
        console.log('⚠️ Creating fallback dog...');
        
        const group = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x404040,
            transparent: true,
            opacity: 0.3
        });
        const wireframeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00bcd4,
            transparent: true,
            opacity: 1.0
        });
        
        // Body
        const bodyGeometry = new THREE.SphereGeometry(1.2, 32, 24);
        bodyGeometry.scale(1.5, 0.8, 0.9);
        const body = new THREE.Mesh(bodyGeometry, material);
        const bodyWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(bodyGeometry), 
            wireframeMaterial
        );
        body.add(bodyWireframe);
        group.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.7, 24, 20);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(1.8, 0.3, 0);
        const headWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(headGeometry), 
            wireframeMaterial
        );
        head.add(headWireframe);
        group.add(head);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16);
        const positions = [
            [0.8, -1, -0.4], [0.8, -1, 0.4],
            [-0.8, -1, -0.4], [-0.8, -1, 0.4]
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
        group.position.y = -0.5 - groupBox.min.y;
        group.userData.baseY = group.position.y;
        
        Mobile3D.scene.add(group);
        Mobile3D.dogModel = group;
        
        console.log('✅ Fallback dog created');
    }

    function startAnimation() {
        let time = 0;
        
        function animate() {
            requestAnimationFrame(animate);
            time += 0.016; // ~60fps
            
            if (Mobile3D.controls) {
                Mobile3D.controls.update();
            }
            
            // Update grid shader time uniform
            if (Mobile3D.gridGroup) {
                Mobile3D.gridGroup.children.forEach(child => {
                    if (child.material && child.material.uniforms) {
                        if (child.material.uniforms.time) {
                            child.material.uniforms.time.value = time;
                        }
                        if (child.material.uniforms.cameraPosition) {
                            child.material.uniforms.cameraPosition.value.copy(Mobile3D.camera.position);
                        }
                    }
                });
            }
            
            // Rotate and float dog
            if (Mobile3D.dogModel) {
                Mobile3D.dogModel.rotation.y -= 0.003;
                
                if (Mobile3D.dogModel.userData.baseY !== undefined) {
                    Mobile3D.dogModel.position.y = Mobile3D.dogModel.userData.baseY + 
                        Math.sin(time * 0.6) * 0.03;
                }
            }
            
            if (Mobile3D.renderer && Mobile3D.scene && Mobile3D.camera) {
                Mobile3D.renderer.render(Mobile3D.scene, Mobile3D.camera);
            }
        }
        
        animate();
        console.log('✅ Enhanced animation started');
    }

    function addControlsToggle() {
        // Add toggle button for mobile controls
        const toggleButton = document.createElement('button');
        toggleButton.className = 'controls-toggle';
        toggleButton.innerHTML = '⚙️';
        toggleButton.title = 'Toggle Controls';
        
        toggleButton.addEventListener('click', () => {
            const sidebar = document.querySelector('.controls-sidebar');
            if (sidebar) {
                sidebar.classList.toggle('show');
                toggleButton.innerHTML = sidebar.classList.contains('show') ? '✕' : '⚙️';
            }
        });
        
        document.body.appendChild(toggleButton);
        console.log('✅ Controls toggle added');
    }

    function handleResize() {
        const container = Mobile3D.renderer?.domElement?.parentElement;
        if (!container || !Mobile3D.camera || !Mobile3D.renderer) return;
        
        let width, height;
        
        if (window.innerWidth <= 768) {
            // Mobile: use full viewport
            width = window.innerWidth;
            height = window.innerHeight - 150; // Account for header and bottom nav
            
            // Update container size
            container.style.width = '100vw';
            container.style.height = `${height}px`;
        } else {
            // Desktop: use container bounds
            const containerRect = container.getBoundingClientRect();
            width = containerRect.width;
            height = containerRect.height;
        }
        
        if (width > 0 && height > 0) {
            Mobile3D.camera.aspect = width / height;
            Mobile3D.camera.updateProjectionMatrix();
            Mobile3D.renderer.setSize(width, height);
        }
    }

    // Public API
    window.Mobile3D = {
        init: initMobile3D,
        scene: () => Mobile3D,
        dispose: () => {
            if (Mobile3D.renderer) {
                Mobile3D.renderer.dispose();
            }
            // Remove controls toggle if it exists
            const toggleButton = document.querySelector('.controls-toggle');
            if (toggleButton) {
                toggleButton.remove();
            }
            Mobile3D.isInitialized = false;
            console.log('🗑️ Mobile 3D disposed');
        }
    };

    console.log('✅ Mobile 3D Viewer ready - FULL SCREEN VERSION');

})();