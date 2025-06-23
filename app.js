// Scene setup
let scene, camera, renderer, controls;
let ground, buildings = [], trees = [];
let isDrawingStreet = false;
let isDrawingGreen = false;
let isPlantingTree = false; // New variable to track tree planting mode
let currentDrawing = null;
let northDirection = new THREE.Vector3(0, 0, -1); // Global -Z axis direction
let viewCube = null;
let viewCubeCamera = null;
let viewCubeRenderer = null;
let globalAxisVisible = true;
let gridVisible = true;
let plantingMode = 'single'; // Track planting mode (single or brush)
let brushDistance = 5; // Brush distance in meters
let isDragging = false; // Track if user is dragging
let lastMousePosition = new THREE.Vector2(); // Store last mouse position

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.002); // Add fog for depth

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(50, 50, 50);

    // Create renderer with enhanced settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Enhanced shadow settings
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    document.getElementById('scene-container').appendChild(renderer.domElement);

    // Add orbit controls with damping
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below ground
    controls.minDistance = 1;
    controls.maxDistance = 1000;
    controls.zoomSpeed = 1; // Increase zoom sensitivity
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE
    };
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.PAN
    };

    // Add lights with enhanced settings
    const ambientLight = new THREE.AmbientLight(0x404040, 1.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    
    // Enhanced shadow settings for directional light
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.02;
    directionalLight.shadow.radius = 1.5;
    
    scene.add(directionalLight);

    // Create ground with enhanced material
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 32, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7CFC00,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.2
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add infinite grid
    const gridHelper = new THREE.GridHelper(500, 100, 0x444444, 0x888888);
    gridHelper.position.y = 0.1; // Slightly above ground to avoid z-fighting
    scene.add(gridHelper);

    // Add global axes helper
    createArrowAxes();

    // Create random buildings with enhanced materials
    createRandomBuildings();

    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onSceneClick);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('contextmenu', onRightClick); // Add right-click handler
    //renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Initialize UI controls
    initUIControls();
    
    // Set tree tool as default
    switchTool('tree-tool');

    // Set initial sun position based on default parameters
    updateSunPosition();

    // Start animation loop
    animate();
}

// Create random buildings with enhanced materials
function createRandomBuildings() {
    for (let i = 0; i < 10; i++) {
        const width = 5 + Math.random() * 10;
        const height = 10 + Math.random() * 30;
        const depth = 5 + Math.random() * 10;
        
        const geometry = new THREE.BoxGeometry(width, height, depth, 2, 2, 2);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.7,
            metalness: 0.2,
            flatShading: false
        });
        
        const building = new THREE.Mesh(geometry, material);
        building.position.x = Math.random() * 180 - 90;
        building.position.z = Math.random() * 180 - 90;
        building.position.y = height / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        
        scene.add(building);
        buildings.push(building);
    }
}

// Create a tree with enhanced materials
function createTree(position, properties) {
    const { height, color } = properties;
    
    // Create trunk with enhanced geometry
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, height * 0.3, 8, 4);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 0.9,
        metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    
    // Create foliage with enhanced geometry
    const foliageGeometry = new THREE.ConeGeometry(height * 0.4, height * 0.7, 8, 4);
    const foliageMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.8,
        metalness: 0.1
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = height * 0.5;
    
    // Create tree group
    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(foliage);
    
    // Position tree
    tree.position.copy(position);
    tree.position.y = height * 0.15;
    
    // Add properties
    tree.userData = { height, color };
    
    // Add shadows
    trunk.castShadow = true;
    foliage.castShadow = true;
    
    scene.add(tree);
    trees.push(tree);
    return tree;
}

// Create arrow axes
function createArrowAxes() {
    const arrowLength = 20;
    const arrowHeadLength = 5;
    const arrowHeadWidth = 2;
    const shaftWidth = 1;
    
    // Create arrow geometries
    const arrowGeometry = new THREE.CylinderGeometry(shaftWidth, shaftWidth, arrowLength, 8);
    const arrowHeadGeometry = new THREE.ConeGeometry(arrowHeadWidth, arrowHeadLength, 8);
    
    // Create arrow materials
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red for X
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green for Y
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Blue for Z
    
    // Create X axis arrow (red)
    const xShaft = new THREE.Mesh(arrowGeometry, xMaterial);
    const xHead = new THREE.Mesh(arrowHeadGeometry, xMaterial);
    xShaft.rotation.z = -Math.PI / 2;
    xHead.rotation.z = -Math.PI / 2;
    xShaft.position.x = arrowLength / 2;
    xHead.position.x = arrowLength + arrowHeadLength / 2;
    
    const xArrow = new THREE.Group();
    xArrow.add(xShaft);
    xArrow.add(xHead);
    xArrow.userData = { type: 'axes' };
    scene.add(xArrow);
    
    // Create Y axis arrow (green)
    const yShaft = new THREE.Mesh(arrowGeometry, yMaterial);
    const yHead = new THREE.Mesh(arrowHeadGeometry, yMaterial);
    yShaft.position.y = arrowLength / 2;
    yHead.position.y = arrowLength + arrowHeadLength / 2;
    
    const yArrow = new THREE.Group();
    yArrow.add(yShaft);
    yArrow.add(yHead);
    yArrow.userData = { type: 'axes' };
    scene.add(yArrow);
    
    // Create Z axis arrow (blue)
    const zShaft = new THREE.Mesh(arrowGeometry, zMaterial);
    const zHead = new THREE.Mesh(arrowHeadGeometry, zMaterial);
    zShaft.rotation.x = Math.PI / 2;
    zHead.rotation.x = Math.PI / 2;
    zShaft.position.z = arrowLength / 2;
    zHead.position.z = arrowLength + arrowHeadLength / 2;
    
    const zArrow = new THREE.Group();
    zArrow.add(zShaft);
    zArrow.add(zHead);
    zArrow.userData = { type: 'axes' };
    scene.add(zArrow);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle scene click
function onSceneClick(event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check for tree selection/deletion
    const treeIntersects = raycaster.intersectObjects(trees, true);
    if (treeIntersects.length > 0) {
        const selectedObject = treeIntersects[0].object;
        const tree = selectedObject.parent;
        
        // Right click to delete tree when planting is active
        if (event.button === 2 && isPlantingTree) {
            console.log('🗑️ Deleting tree');
            scene.remove(tree);
            trees = trees.filter(t => t !== tree);
            return;
        }
        
        // Left click to select tree (for future functionality if needed)
        if (event.button === 0) {
            console.log('🌳 Tree selected');
            // Tree selection functionality removed
        }
        return;
    }
    
    // Check for ground intersection for planting or drawing
    const groundIntersects = raycaster.intersectObject(ground);
    if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        
        if (isDrawingStreet) {
            drawStreet(point);
        } else if (isDrawingGreen) {
            drawGreenSpace(point);
        } else if (isPlantingTree && plantingMode === 'single') {
            // Only plant single trees on click, brush tool uses drag
            plantTree(point);
        }
    }
}

// Plant a tree
function plantTree(position) {
    const heightMin = parseFloat(document.getElementById('tree-height-min').value);
    const heightMax = parseFloat(document.getElementById('tree-height-max').value);
    const color = document.getElementById('tree-color').value;
    
    // Generate random height within the range
    const baseHeight = Math.random() * (heightMax - heightMin) + heightMin;
    
    if (plantingMode === 'single') {
        // Plant single tree
        createTree(position, { height: baseHeight, color });
    } else if (plantingMode === 'brush') {
        // Plant multiple trees with avoidance radius
        const numTrees = Math.floor(brushDistance * 2); // Number of trees based on distance
        let plantedCount = 0;
        let attempts = 0;
        const maxAttempts = numTrees * 10; // Prevent infinite loops
        
        while (plantedCount < numTrees && attempts < maxAttempts) {
            // Generate random position within brush radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * brushDistance;
            const offsetX = Math.cos(angle) * distance;
            const offsetZ = Math.sin(angle) * distance;
            
            const brushPosition = new THREE.Vector3(
                position.x + offsetX,
                position.y,
                position.z + offsetZ
            );
            
            // Check if position is far enough from existing trees
            if (isPositionValid(brushPosition)) {
                // Generate random height within the range
                const heightVariation = Math.random() * (heightMax - heightMin) + heightMin;
                const colorVariation = adjustColor(color, Math.random() * 0.2 - 0.1); // ±10% color variation
                
                createTree(brushPosition, { height: heightVariation, color: colorVariation });
                plantedCount++;
            }
            attempts++;
        }
    }
}

// Check if a position is valid (far enough from existing trees)
function isPositionValid(position) {
    const avoidanceRadius = brushDistance; // Use brush distance as avoidance radius
    
    for (let tree of trees) {
        const distance = position.distanceTo(tree.position);
        if (distance < avoidanceRadius) {
            return false; // Too close to existing tree
        }
    }
    return true; // Position is valid
}

// Helper function to adjust color brightness
function adjustColor(color, factor) {
    // Convert hex to RGB
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    
    // Adjust brightness
    const newR = Math.max(0, Math.min(255, Math.round(r * (1 + factor))));
    const newG = Math.max(0, Math.min(255, Math.round(g * (1 + factor))));
    const newB = Math.max(0, Math.min(255, Math.round(b * (1 + factor))));
    
    // Convert back to hex
    return '#' + newR.toString(16).padStart(2, '0') + 
                 newG.toString(16).padStart(2, '0') + 
                 newB.toString(16).padStart(2, '0');
}

// Draw street
function drawStreet(point) {
    if (!currentDrawing) {
        currentDrawing = new THREE.Group();
        scene.add(currentDrawing);
    }
    
    const geometry = new THREE.BoxGeometry(5, 0.1, 5);
    const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const segment = new THREE.Mesh(geometry, material);
    segment.position.copy(point);
    segment.position.y = 0.05;
    
    currentDrawing.add(segment);
}

// Draw green space
function drawGreenSpace(point) {
    if (!currentDrawing) {
        currentDrawing = new THREE.Group();
        scene.add(currentDrawing);
    }
    
    const geometry = new THREE.BoxGeometry(10, 0.1, 10);
    const material = new THREE.MeshStandardMaterial({ color: 0x90EE90 });
    const segment = new THREE.Mesh(geometry, material);
    segment.position.copy(point);
    segment.position.y = 0.05;
    
    currentDrawing.add(segment);
}

// Calculate sun position
function calculateSunPosition(month, day, hour, minute, latitude, longitude) {
    // Create date with fixed year 2025, month, day, hour, and minute
    const date = new Date(2025, month - 1, day, hour, minute);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    
    // Calculate solar declination
    const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);
    
    // Calculate hour angle (0 at solar noon, negative in morning, positive in afternoon)
    const decimalHour = hour + minute / 60;
    const hourAngle = (decimalHour - 12) * 15;
    
    // Adjust latitude by subtracting 40
    const adjustedLatitude = latitude - 40;
    
    // Calculate elevation
    const elevation = Math.asin(
        Math.sin(declination * Math.PI / 180) * Math.sin(adjustedLatitude * Math.PI / 180) +
        Math.cos(declination * Math.PI / 180) * Math.cos(adjustedLatitude * Math.PI / 180) * 
        Math.cos(hourAngle * Math.PI / 180)
    );
    
    // Calculate azimuth (0 = North, 90 = East, 180 = South, 270 = West)
    const azimuth = Math.atan2(
        Math.sin(hourAngle * Math.PI / 180),
        Math.cos(hourAngle * Math.PI / 180) * Math.sin(adjustedLatitude * Math.PI / 180) -
        Math.tan(declination * Math.PI / 180) * Math.cos(adjustedLatitude * Math.PI / 180)
    );
    
    return { elevation, azimuth };
}

// Update sun position
function updateSunPosition() {
    const month = parseInt(document.getElementById('month').value);
    const day = parseInt(document.getElementById('day').value);
    const hour = parseInt(document.getElementById('hour').value);
    const minute = parseInt(document.getElementById('minute').value);
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    
    const { elevation, azimuth } = calculateSunPosition(month, day, hour, minute, latitude, longitude);
    
    // Update directional light position
    const distance = 100;
    const x = distance * Math.cos(elevation) * Math.sin(azimuth);
    const y = distance * Math.sin(elevation);
    const z = distance * Math.cos(elevation) * Math.cos(azimuth);
    
    // Check if it's daylight hours (between 5:00 and 21:00)
    const isDaylight = hour >= 5 && hour <= 21;
    
    scene.children.forEach(child => {
        if (child instanceof THREE.DirectionalLight) {
            child.position.set(x, y, z);
            child.castShadow = isDaylight;
            child.intensity = isDaylight ? 1 : 0.3; // Reduce intensity at night
        }
    });
}

// Update orbit controls based on current mode
function updateOrbitControls() {
    if (isPlantingTree && plantingMode === 'brush') {
        // Disable all mouse buttons for camera control when using brush tool
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.NONE,
            MIDDLE: THREE.MOUSE.NONE,
            RIGHT: THREE.MOUSE.NONE
        };
    } else if (isPlantingTree && plantingMode === 'single') {
        // Disable left mouse button for camera control when planting single trees
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.NONE,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE
        };
    } else {
        // Enable all mouse buttons for camera control when not planting
        controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE
        };
    }
}

// Function to switch tools
function switchTool(activeToolId) {
    const toolButtons = document.querySelectorAll('.tool-btn');
    const panels = document.querySelectorAll('.panel');
    
    // Update toolbar button states
    toolButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeToolId).classList.add('active');
    
    // Reset all modes
    isPlantingTree = false;
    isDrawingStreet = false;
    isDrawingGreen = false;
    
    // Update orbit controls
    updateOrbitControls();
    
    // Reset plant tree button
    const plantTreeButton = document.getElementById('plant-tree');
    plantTreeButton.textContent = 'Plant Tree';
    plantTreeButton.classList.remove('active');
    
    // Show/hide panels based on active tool
    panels.forEach(panel => {
        const panelTitle = panel.querySelector('h2').textContent.toLowerCase();
        
        if (activeToolId === 'tree-tool') {
            // Show only tree planting panel
            panel.style.display = panelTitle.includes('tree') ? 'block' : 'none';
        } else if (activeToolId === 'sun-tool') {
            // Show only sunlight simulation panel
            panel.style.display = panelTitle.includes('sunlight') ? 'block' : 'none';
        } else if (activeToolId === 'location-tool') {
            // Show only location panel
            panel.style.display = panelTitle.includes('location') ? 'block' : 'none';
        } else if (activeToolId === 'settings-tool') {
            // Show only settings panel
            panel.style.display = panelTitle.includes('settings') ? 'block' : 'none';
        }
    });
}

// Initialize UI controls
function initUIControls() {
    // Toolbar controls
    const toolButtons = document.querySelectorAll('.tool-btn');
    
    // Add event listeners for toolbar buttons
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTool(btn.id);
        });
    });
    
    // Tree planting controls
    const plantTreeButton = document.getElementById('plant-tree');
    plantTreeButton.addEventListener('click', () => {
        isPlantingTree = !isPlantingTree;
        isDrawingStreet = false;
        isDrawingGreen = false;
        
        // Update button text and appearance
        if (isPlantingTree) {
            plantTreeButton.textContent = 'Cancel Planting';
            plantTreeButton.classList.add('active');
        } else {
            plantTreeButton.textContent = 'Plant Tree';
            plantTreeButton.classList.remove('active');
        }
        
        // Update orbit controls
        updateOrbitControls();
    });
    
    // Planting mode controls
    document.getElementById('single-mode').addEventListener('click', () => {
        plantingMode = 'single';
        updatePlantingModeButtons();
        document.getElementById('brush-settings').style.display = 'none';
    });
    
    document.getElementById('brush-mode').addEventListener('click', () => {
        plantingMode = 'brush';
        updatePlantingModeButtons();
        document.getElementById('brush-settings').style.display = 'block';
    });
    
    // Function to update button states
    function updatePlantingModeButtons() {
        document.getElementById('single-mode').classList.toggle('active', plantingMode === 'single');
        document.getElementById('brush-mode').classList.toggle('active', plantingMode === 'brush');
    }
    
    // Brush distance control
    document.getElementById('brush-distance').addEventListener('input', (e) => {
        brushDistance = parseFloat(e.target.value);
        document.getElementById('brush-distance-value').textContent = brushDistance;
    });
    
    // Sunlight controls
    ['month', 'day', 'hour', 'minute'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            document.getElementById(`${id}-value`).textContent = e.target.value;
            updateSunPosition();
        });
    });
    
    // Location controls
    ['latitude', 'longitude'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateSunPosition);
    });
    
    // Settings controls
    document.getElementById('global-axis-toggle').addEventListener('change', (e) => {
        globalAxisVisible = e.target.checked;
        // Find the arrow axes in the scene and toggle their visibility
        scene.children.forEach(child => {
            if (child.userData && child.userData.type === 'axes') {
                child.visible = globalAxisVisible;
            }
        });
    });
    
    document.getElementById('grid-toggle').addEventListener('change', (e) => {
        gridVisible = e.target.checked;
        // Find the grid helper in the scene and toggle its visibility
        scene.children.forEach(child => {
            if (child instanceof THREE.GridHelper) {
                child.visible = gridVisible;
            }
        });
    });
    
    // Drawing tools (kept for compatibility)
    document.getElementById('draw-street').addEventListener('click', () => {
        isDrawingStreet = true;
        isDrawingGreen = false;
        isPlantingTree = false;
        currentDrawing = null;
        
        // Reset plant tree button
        const plantTreeButton = document.getElementById('plant-tree');
        plantTreeButton.textContent = 'Plant Tree';
        plantTreeButton.classList.remove('active');
        
        // Update orbit controls
        updateOrbitControls();
    });
    
    document.getElementById('draw-green').addEventListener('click', () => {
        isDrawingStreet = false;
        isDrawingGreen = true;
        isPlantingTree = false;
        currentDrawing = null;
        
        // Reset plant tree button
        const plantTreeButton = document.getElementById('plant-tree');
        plantTreeButton.textContent = 'Plant Tree';
        plantTreeButton.classList.remove('active');
        
        // Update orbit controls
        updateOrbitControls();
    });
    
    // Export/Import controls
    document.getElementById('export-scene').addEventListener('click', () => {
        const sceneData = {
            trees: trees.map(tree => ({
                position: tree.position.toArray(),
                userData: tree.userData
            })),
            buildings: buildings.map(building => ({
                position: building.position.toArray(),
                scale: building.scale.toArray()
            }))
        };
        
        const blob = new Blob([JSON.stringify(sceneData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'digital-twin-scene.json';
        a.click();
    });
    
    document.getElementById('import-button').addEventListener('click', () => {
        document.getElementById('import-scene').click();
    });
    
    document.getElementById('import-scene').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const sceneData = JSON.parse(event.target.result);
                
                // Clear existing scene
                trees.forEach(tree => scene.remove(tree));
                buildings.forEach(building => scene.remove(building));
                trees = [];
                buildings = [];
                
                // Load trees
                sceneData.trees.forEach(treeData => {
                    const tree = createTree(
                        new THREE.Vector3(...treeData.position),
                        treeData.userData
                    );
                });
                
                // Load buildings
                sceneData.buildings.forEach(buildingData => {
                    const geometry = new THREE.BoxGeometry(1, 1, 1);
                    const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
                    const building = new THREE.Mesh(geometry, material);
                    building.position.set(...buildingData.position);
                    building.scale.set(...buildingData.scale);
                    building.castShadow = true;
                    building.receiveShadow = true;
                    scene.add(building);
                    buildings.push(building);
                });
            };
            reader.readAsText(file);
        }
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    
    // Update compass to align with global -Z axis
    updateCompass();
}

// Handle mouse down
function onMouseDown(event) {
    if (isPlantingTree && plantingMode === 'brush') {
        isDragging = true;
        // Plant first tree immediately
        plantTreeAtMousePosition(event);
    }
}

// Handle mouse move
function onMouseMove(event) {
    // Plant trees continuously while dragging with brush tool
    if (isDragging && isPlantingTree && plantingMode === 'brush') {
        plantTreeAtMousePosition(event);
    }
    
    // Handle drawing tools (existing functionality)
    if (isDrawingStreet || isDrawingGreen) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(ground);
        
        if (intersects.length > 0) {
            const point = intersects[0].point;
            if (isDrawingStreet) {
                drawStreet(point);
            } else if (isDrawingGreen) {
                drawGreenSpace(point);
            }
        }
    }
}

// Handle mouse up
function onMouseUp(event) {
    isDragging = false;
}

// Helper function to plant tree at mouse position
function plantTreeAtMousePosition(event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const groundIntersects = raycaster.intersectObject(ground);
    
    if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        console.log('Planting tree at:', point);
        plantTree(point);
    } else {
        console.log('No ground intersection found');
    }
}

// Update compass to align with global -Z axis
function updateCompass() {
    const compass = document.getElementById('compass');
    if (!compass) return;
    
    // Get camera's forward direction in world space
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);
    
    // Project camera direction onto XZ plane (ignore Y component)
    const cameraDirectionXZ = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
    
    // Calculate angle between camera direction and global -Z axis
    const negativeZAxis = new THREE.Vector3(0, 0, -1);
    const angle = Math.atan2(cameraDirectionXZ.x, cameraDirectionXZ.z);
    
    // Rotate compass to align with global -Z axis
    compass.style.transform = `rotate(${angle}rad)`;
}

// Handle right click for tree deletion
function onRightClick(event) {
    event.preventDefault(); // Prevent default context menu
    
    if (!isPlantingTree) return; // Only allow deletion when planting is active
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Check for tree intersection
    const treeIntersects = raycaster.intersectObjects(trees, true);
    if (treeIntersects.length > 0) {
        const selectedObject = treeIntersects[0].object;
        const tree = selectedObject.parent;
        
        console.log('🗑️ Deleting tree via right-click');
        scene.remove(tree);
        trees = trees.filter(t => t !== tree);
    }
}

// Initialize the application
init(); 