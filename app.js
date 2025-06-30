// Scene setup
let scene, camera, renderer, controls;
let ground, buildings = [], trees = [];
let stlObjects = []; // Array to store imported STL objects
let gridHelper = null; // Track the grid helper
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
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.0008); // Add fog for depth

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
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
    controls.minDistance = 0.5;
    controls.maxDistance = 100000;
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
    gridHelper = new THREE.GridHelper(500, 100, 0x444444, 0x888888);
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
        } else if (activeToolId === 'stl-tool') {
            // Show only STL import/export panel
            panel.style.display = panelTitle.includes('stl') ? 'block' : 'none';
        } else if (activeToolId === 'camera-tool') {
            // Show only camera navigation panel
            panel.style.display = panelTitle.includes('camera') ? 'block' : 'none';
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
    
    // Fog controls
    document.getElementById('fog-toggle').addEventListener('change', (e) => {
        if (e.target.checked) {
            // Enable fog
            const fogDistance = parseFloat(document.getElementById('fog-distance').value);
            scene.fog = new THREE.FogExp2(0x87CEEB, fogDistance);
            console.log('🌫️ Fog enabled with distance:', fogDistance);
        } else {
            // Disable fog
            scene.fog = null;
            console.log('🌫️ Fog disabled');
        }
    });
    
    document.getElementById('fog-distance').addEventListener('input', (e) => {
        const fogDistance = parseFloat(e.target.value);
        document.getElementById('fog-distance-value').textContent = fogDistance;
        
        // Update fog if it's enabled
        if (document.getElementById('fog-toggle').checked) {
            scene.fog = new THREE.FogExp2(0x87CEEB, fogDistance);
            console.log('🌫️ Fog distance updated:', fogDistance);
        }
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
    
    // STL Import/Export controls
    document.getElementById('import-stl').addEventListener('click', () => {
        document.getElementById('stl-file-input').click();
    });
    
    document.getElementById('stl-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importSTL(file);
        }
    });
    
    document.getElementById('export-stl').addEventListener('click', () => {
        exportSTL();
    });
    
    // STL settings controls
    document.getElementById('stl-scale').addEventListener('input', (e) => {
        // Update scale for future imports
        console.log('STL scale updated:', e.target.value);
    });
    
    document.getElementById('stl-color').addEventListener('input', (e) => {
        // Update color for future imports
        console.log('STL color updated:', e.target.value);
    });
    
    // STL rotation controls
    ['stl-rotation-x', 'stl-rotation-y', 'stl-rotation-z'].forEach(id => {
        const slider = document.getElementById(id);
        const numberInput = document.getElementById(id + '-number');
        
        // Slider event listener
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            numberInput.value = value;
            
            // Apply rotation to existing STL objects
            updateSTLRotation();
            
            console.log('STL rotation updated:', id, value + '°');
        });
        
        // Number input event listener
        numberInput.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            
            // No range validation - allow unlimited movement
            slider.value = value;
            
            // Apply rotation to existing STL objects
            updateSTLRotation();
            
            console.log('STL rotation updated:', id, value + '°');
        });
    });
    
    // STL position controls
    ['stl-position-x', 'stl-position-y', 'stl-position-z'].forEach(id => {
        const numberInput = document.getElementById(id + '-number');
        
        // Number input event listener
        numberInput.addEventListener('input', (e) => {
            let value = parseFloat(e.target.value);
            
            // Apply position to existing STL objects
            updateSTLPosition();
            
            console.log('STL position updated:', id, value);
        });
    });
    
    // Camera navigation controls
    document.getElementById('move-up').addEventListener('click', () => {
        camera.position.y += 10;
        console.log('📷 Camera moved up');
    });
    
    document.getElementById('move-down').addEventListener('click', () => {
        camera.position.y -= 10;
        console.log('📷 Camera moved down');
    });
    
    document.getElementById('move-left').addEventListener('click', () => {
        camera.position.x -= 10;
        console.log('📷 Camera moved left');
    });
    
    document.getElementById('move-right').addEventListener('click', () => {
        camera.position.x += 10;
        console.log('📷 Camera moved right');
    });
    
    document.getElementById('rotate-up').addEventListener('click', () => {
        camera.rotation.x -= 0.1;
        console.log('📷 Camera rotated up');
    });
    
    document.getElementById('rotate-down').addEventListener('click', () => {
        camera.rotation.x += 0.1;
        console.log('📷 Camera rotated down');
    });
    
    document.getElementById('rotate-left').addEventListener('click', () => {
        camera.rotation.y -= 0.1;
        console.log('📷 Camera rotated left');
    });
    
    document.getElementById('rotate-right').addEventListener('click', () => {
        camera.rotation.y += 0.1;
        console.log('📷 Camera rotated right');
    });
    
    document.getElementById('zoom-in').addEventListener('click', () => {
        camera.position.multiplyScalar(0.9);
        console.log('📷 Camera zoomed in');
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        camera.position.multiplyScalar(1.1);
        console.log('📷 Camera zoomed out');
    });
    
    document.getElementById('zoom-extended').addEventListener('click', () => {
        camera.position.set(100, 100, 100);
        camera.lookAt(0, 0, 0);
        console.log('📷 Camera zoomed to extended view');
    });
    
    document.getElementById('reset-camera').addEventListener('click', () => {
        camera.position.set(50, 50, 50);
        camera.rotation.set(0, 0, 0);
        camera.lookAt(0, 0, 0);
        console.log('📷 Camera reset to default position');
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

// STL Import/Export Functions
function importSTL(file) {
    // Show loading overlay
    showLoading('Scanning STL file...');
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const content = event.target.result;
            
            // Check if it's an ASCII STL file
            if (typeof content === 'string' && content.startsWith('solid')) {
                // First, quickly scan for solids
                const solids = scanSTLSolids(content);
                console.log(`Found ${solids.length} solids in STL file:`, solids.map(s => s.name));
                
                // Show solids list to user
                showSolidsList(solids, content, file.name);
            } else {
                // Parse binary STL file
                parseBinarySTL(content, file.name);
            }
        } catch (error) {
            console.error('Error importing STL file:', error);
            alert('Error importing STL file. Please check if the file is valid.');
            hideLoading();
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading STL file');
        alert('Error reading STL file. Please try again.');
        hideLoading();
    };
    
    reader.readAsText(file); // Read as text for ASCII parsing
}

// Fast function to scan STL file and list all solids
function scanSTLSolids(content) {
    const lines = content.split('\n');
    const solids = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('solid ')) {
            // Found a solid - extract name
            const solidName = line.substring(6).trim(); // Remove 'solid ' prefix
            
            // Count facets for this solid
            let facetCount = 0;
            let j = i + 1;
            while (j < lines.length && !lines[j].trim().startsWith('endsolid')) {
                if (lines[j].trim().startsWith('facet normal')) {
                    facetCount++;
                }
                j++;
            }
            
            solids.push({
                name: solidName,
                facetCount: facetCount,
                startLine: i,
                endLine: j
            });
            
            console.log(`Found solid: ${solidName} with ${facetCount} facets`);
        }
    }
    
    return solids;
}

// Function to show solids list to user
function showSolidsList(solids, content, fileName) {
    hideLoading();
    
    // Create a modal or update UI to show solids
    const list = document.getElementById('stl-objects-list');
    
    if (solids.length === 0) {
        list.innerHTML = '<p>No solids found in STL file</p>';
        return;
    }
    
    // Group solids by category
    const categories = groupSolidsByCategory(solids);
    
    list.innerHTML = '<h4>Solids found in STL file (grouped by category):</h4>';
    
    // Display each category
    Object.keys(categories).forEach(categoryName => {
        const category = categories[categoryName];
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'stl-category';
        categoryDiv.innerHTML = `
            <div class="category-header" onclick="toggleCategory('${categoryName}')">
                <div class="category-info">
                    <span class="category-toggle">▶</span>
                    <span class="category-name">${categoryName}</span>
                    <span class="category-count">(${category.solids.length} objects)</span>
                </div>
                <div class="category-actions" onclick="event.stopPropagation()">
                    <button onclick="loadCategory('${categoryName}', '${fileName}')" class="load-category-btn">Load Category</button>
                </div>
            </div>
            <div class="category-solids" id="category-${categoryName}" style="display: none;">
                ${category.solids.map((solid, index) => `
                    <div class="stl-solid-item">
                        <div class="solid-info">
                            <span class="solid-name">${solid.name}</span>
                            <span class="solid-facets">(${solid.facetCount} facets)</span>
                        </div>
                        <div class="solid-actions">
                            <button onclick="loadSingleSolid(${solid.originalIndex}, '${fileName}')" class="load-btn">Load</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        list.appendChild(categoryDiv);
    });
    
    // Add "Load All" button at the top
    const loadAllDiv = document.createElement('div');
    loadAllDiv.className = 'load-all-section';
    loadAllDiv.innerHTML = `
        <button onclick="loadAllSolids('${fileName}')" class="load-all-btn">Load All Solids (${solids.length} total)</button>
    `;
    list.insertBefore(loadAllDiv, list.firstChild);
    
    // Show category controls
    const categoryControls = document.querySelector('.category-controls');
    if (categoryControls) {
        categoryControls.style.display = 'flex';
    }
    
    // Store solids data for later loading
    window.currentSTLSolids = {
        solids: solids,
        content: content,
        fileName: fileName,
        categories: categories
    };
    
    console.log(`📋 Listed ${solids.length} solids in ${Object.keys(categories).length} categories from ${fileName}`);
}

// Function to toggle category visibility
function toggleCategory(categoryName) {
    const categorySolids = document.getElementById(`category-${categoryName}`);
    const categoryHeader = categorySolids.previousElementSibling;
    const toggleIcon = categoryHeader.querySelector('.category-toggle');
    
    if (categorySolids.style.display === 'none') {
        // Show category
        categorySolids.style.display = 'block';
        toggleIcon.textContent = '▼';
        categoryHeader.classList.add('expanded');
    } else {
        // Hide category
        categorySolids.style.display = 'none';
        toggleIcon.textContent = '▶';
        categoryHeader.classList.remove('expanded');
    }
}

// Function to expand all categories
function expandAllCategories() {
    const categories = document.querySelectorAll('.stl-category');
    categories.forEach(category => {
        const categorySolids = category.querySelector('.category-solids');
        const categoryHeader = category.querySelector('.category-header');
        const toggleIcon = categoryHeader.querySelector('.category-toggle');
        
        categorySolids.style.display = 'block';
        toggleIcon.textContent = '▼';
        categoryHeader.classList.add('expanded');
    });
}

// Function to collapse all categories
function collapseAllCategories() {
    const categories = document.querySelectorAll('.stl-category');
    categories.forEach(category => {
        const categorySolids = category.querySelector('.category-solids');
        const categoryHeader = category.querySelector('.category-header');
        const toggleIcon = categoryHeader.querySelector('.category-toggle');
        
        categorySolids.style.display = 'none';
        toggleIcon.textContent = '▶';
        categoryHeader.classList.remove('expanded');
    });
}

// Function to group solids by category based on their names
function groupSolidsByCategory(solids) {
    const categories = {};
    
    solids.forEach((solid, index) => {
        const name = solid.name.toLowerCase();
        let category = 'Other'; // Default category
        
        // Determine category based on name patterns
        if (name.includes('building') || name.includes('house') || name.includes('structure') || 
            name.includes('tower') || name.includes('skyscraper') || name.includes('office') ||
            name.includes('apartment') || name.includes('residential') || name.includes('commercial')) {
            category = 'Buildings';
        } else if (name.includes('tree') || name.includes('plant') || name.includes('vegetation') ||
                   name.includes('forest') || name.includes('garden') || name.includes('park') ||
                   name.includes('bush') || name.includes('shrub')) {
            category = 'Vegetation';
        } else if (name.includes('road') || name.includes('street') || name.includes('path') ||
                   name.includes('highway') || name.includes('avenue') || name.includes('lane') ||
                   name.includes('drive') || name.includes('way') || name.includes('bridge')) {
            category = 'Roads & Infrastructure';
        } else if (name.includes('car') || name.includes('vehicle') || name.includes('transport') ||
                   name.includes('bus') || name.includes('truck') || name.includes('motorcycle') ||
                   name.includes('bicycle') || name.includes('train')) {
            category = 'Vehicles';
        } else if (name.includes('furniture') || name.includes('chair') || name.includes('table') ||
                   name.includes('desk') || name.includes('bed') || name.includes('sofa') ||
                   name.includes('cabinet') || name.includes('shelf')) {
            category = 'Furniture';
        } else if (name.includes('light') || name.includes('lamp') || name.includes('lighting') ||
                   name.includes('streetlight') || name.includes('bulb') || name.includes('fixture')) {
            category = 'Lighting';
        } else if (name.includes('water') || name.includes('river') || name.includes('lake') ||
                   name.includes('pond') || name.includes('fountain') || name.includes('pool')) {
            category = 'Water Features';
        } else if (name.includes('terrain') || name.includes('ground') || name.includes('landscape') ||
                   name.includes('mountain') || name.includes('hill') || name.includes('valley')) {
            category = 'Terrain';
        } else if (name.includes('sign') || name.includes('billboard') || name.includes('advertisement') ||
                   name.includes('traffic') || name.includes('signal')) {
            category = 'Signs & Signals';
        } else if (name.includes('bench') || name.includes('seat') || name.includes('rest') ||
                   name.includes('playground') || name.includes('equipment')) {
            category = 'Street Furniture';
        } else if (name.includes('wall') || name.includes('fence') || name.includes('barrier') ||
                   name.includes('gate') || name.includes('door')) {
            category = 'Walls & Barriers';
        }
        
        // Add to category
        if (!categories[category]) {
            categories[category] = {
                name: category,
                solids: []
            };
        }
        
        // Store original index for loading
        solid.originalIndex = index;
        categories[category].solids.push(solid);
    });
    
    return categories;
}

// Function to load a specific category
function loadCategory(categoryName, fileName) {
    if (!window.currentSTLSolids || !window.currentSTLSolids.categories) {
        alert('No STL file data available');
        return;
    }
    
    const category = window.currentSTLSolids.categories[categoryName];
    if (!category) {
        alert('Category not found');
        return;
    }
    
    showLoading(`Loading category: ${categoryName} (${category.solids.length} objects)...`);
    
    // Reset scene first if it's the first category being loaded
    if (stlObjects.length === 0) {
        resetScene();
    }
    
    // Parse all solids in this category
    category.solids.forEach((solid, index) => {
        const solidContent = extractSolidContent(window.currentSTLSolids.content, solid);
        parseSingleSolid(solidContent, solid.name, fileName);
    });
    
    hideLoading();
    console.log(`📁 Loaded category "${categoryName}" with ${category.solids.length} objects from ${fileName}`);
}

// Function to load a single solid
function loadSingleSolid(solidIndex, fileName) {
    if (!window.currentSTLSolids) {
        alert('No STL file data available');
        return;
    }
    
    const { solids, content } = window.currentSTLSolids;
    const solid = solids[solidIndex];
    
    if (!solid) {
        alert('Solid not found');
        return;
    }
    
    showLoading(`Loading solid: ${solid.name}...`);
    
    // Parse only this solid
    const solidContent = extractSolidContent(content, solid);
    parseSingleSolid(solidContent, solid.name, fileName);
}

// Function to load all solids
function loadAllSolids(fileName) {
    if (!window.currentSTLSolids) {
        alert('No STL file data available');
        return;
    }
    
    const { solids, content } = window.currentSTLSolids;
    
    showLoading(`Loading all ${solids.length} solids...`);
    
    // Reset scene first
    resetScene();
    
    // Parse all solids
    solids.forEach((solid, index) => {
        const solidContent = extractSolidContent(content, solid);
        parseSingleSolid(solidContent, solid.name, fileName);
    });
    
    hideLoading();
    console.log(`📁 Loaded all ${solids.length} solids from ${fileName}`);
}

// Function to extract content for a single solid
function extractSolidContent(fullContent, solid) {
    const lines = fullContent.split('\n');
    const solidLines = lines.slice(solid.startLine, solid.endLine + 1);
    return solidLines.join('\n');
}

// Function to parse a single solid
function parseSingleSolid(content, solidName, fileName) {
    const lines = content.split('\n');
    const facets = [];
    let currentFacet = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('facet normal')) {
            // Start of a facet
            const normalMatch = line.match(/facet normal ([\d.-]+) ([\d.-]+) ([\d.-]+)/);
            if (normalMatch) {
                const normal = {
                    x: parseFloat(normalMatch[1]),
                    y: parseFloat(normalMatch[2]),
                    z: parseFloat(normalMatch[3])
                };
                currentFacet = { normal, vertices: [] };
            }
            
        } else if (line.startsWith('vertex ')) {
            // Vertex data
            const vertexMatch = line.match(/vertex ([\d.-]+) ([\d.-]+) ([\d.-]+)/);
            if (vertexMatch && currentFacet) {
                const vertex = {
                    x: parseFloat(vertexMatch[1]),
                    y: parseFloat(vertexMatch[2]),
                    z: parseFloat(vertexMatch[3])
                };
                currentFacet.vertices.push(vertex);
            }
            
        } else if (line === 'endfacet') {
            // End of facet
            if (currentFacet) {
                facets.push(currentFacet);
                currentFacet = null;
            }
        }
    }
    
    // Create mesh from facets
    createSolidMeshFromFacets(facets, solidName, fileName);
}

// Function to create mesh from facets data
function createSolidMeshFromFacets(facets, solidName, fileName) {
    // Convert facets to Three.js geometry
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    
    facets.forEach(facet => {
        if (facet.vertices.length >= 3) {
            // Add vertices for triangle
            facet.vertices.forEach(vertex => {
                vertices.push(vertex.x, vertex.y, vertex.z);
            });
            
            // Add normal for each vertex
            for (let i = 0; i < 3; i++) {
                normals.push(facet.normal.x, facet.normal.y, facet.normal.z);
            }
        }
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    
    const scale = parseFloat(document.getElementById('stl-scale').value);
    const color = document.getElementById('stl-color').value;
    
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.7,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Get rotation values from UI (convert degrees to radians)
    const rotationX = parseFloat(document.getElementById('stl-rotation-x').value) * Math.PI / 180;
    const rotationY = parseFloat(document.getElementById('stl-rotation-y').value) * Math.PI / 180;
    const rotationZ = parseFloat(document.getElementById('stl-rotation-z').value) * Math.PI / 180;
    
    // Apply rotations FIRST
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    
    // Now calculate bounding box AFTER rotation
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const center = boundingBox.getCenter(new THREE.Vector3());
    
    // Calculate offset to center the model (negative of the center point)
    const offset = center.clone().multiplyScalar(-scale);
    mesh.position.copy(offset);
    
    // For import: always position at (0,0,0) with bounding box center at X=0, Z=0
    // Calculate Y size of the model's bounding box AFTER rotation
    const ySize = (boundingBox.max.y - boundingBox.min.y) * scale;
    
    // Position: X/Z centers at 0, Y center at 0
    mesh.position.add(new THREE.Vector3(0, 0, 0));
    
    // Add to scene and track
    scene.add(mesh);
    stlObjects.push({
        mesh: mesh,
        name: solidName, // Use the solid name from the STL file
        originalGeometry: geometry
    });
    
    updateSTLObjectsList();
    console.log(`📁 Solid "${solidName}" imported from ${fileName}`);
}

// Function to parse binary STL files (fallback)
function parseBinarySTL(content, fileName) {
    const loader = new THREE.STLLoader();
    const geometry = loader.parse(content);
    
    const scale = parseFloat(document.getElementById('stl-scale').value);
    const color = document.getElementById('stl-color').value;
    
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.7,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Get rotation values from UI (convert degrees to radians)
    const rotationX = parseFloat(document.getElementById('stl-rotation-x').value) * Math.PI / 180;
    const rotationY = parseFloat(document.getElementById('stl-rotation-y').value) * Math.PI / 180;
    const rotationZ = parseFloat(document.getElementById('stl-rotation-z').value) * Math.PI / 180;
    
    // Apply rotations FIRST
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    
    // Now calculate bounding box AFTER rotation
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    const center = boundingBox.getCenter(new THREE.Vector3());
    
    // Calculate offset to center the model (negative of the center point)
    const offset = center.clone().multiplyScalar(-scale);
    mesh.position.copy(offset);
    
    // For import: always position at (0,0,0) with bounding box center at X=0, Z=0
    // Calculate Y size of the model's bounding box AFTER rotation
    const ySize = (boundingBox.max.y - boundingBox.min.y) * scale;
    
    // Position: X/Z centers at 0, Y center at 0
    mesh.position.add(new THREE.Vector3(0, 0, 0));
    
    // Add to scene and track
    scene.add(mesh);
    stlObjects.push({
        mesh: mesh,
        name: fileName, // Use filename for binary STL
        originalGeometry: geometry
    });
    
    updateSTLObjectsList();
    console.log('📁 Binary STL file imported:', fileName);
    hideLoading();
}

function updateSTLObjectsList() {
    const list = document.getElementById('stl-objects-list');
    
    if (stlObjects.length === 0) {
        list.innerHTML = '<p>No STL objects imported yet</p>';
        // Also update layers list
        updateSTLLayersList();
        return;
    }
    
    list.innerHTML = '';
    stlObjects.forEach((obj, index) => {
        const item = document.createElement('div');
        item.className = 'stl-object-item';
        item.innerHTML = `
            <span>${obj.name}</span>
            <button onclick="removeSTLObject(${index})" class="remove-btn">🗑️</button>
        `;
        list.appendChild(item);
    });
    
    // Update layers list when objects change
    updateSTLLayersList();
}

function removeSTLObject(index) {
    if (index >= 0 && index < stlObjects.length) {
        const obj = stlObjects[index];
        scene.remove(obj.mesh);
        stlObjects.splice(index, 1);
        updateSTLObjectsList();
        console.log('🗑️ STL object removed');
    }
}

// Function to update rotation of existing STL objects
function updateSTLRotation() {
    if (stlObjects.length === 0) return;
    
    // Get rotation values from UI (convert degrees to radians)
    const rotationX = parseFloat(document.getElementById('stl-rotation-x').value) * Math.PI / 180;
    const rotationY = parseFloat(document.getElementById('stl-rotation-y').value) * Math.PI / 180;
    const rotationZ = parseFloat(document.getElementById('stl-rotation-z').value) * Math.PI / 180;
    
    // Apply rotation to all STL objects
    stlObjects.forEach(obj => {
        obj.mesh.rotation.set(rotationX, rotationY, rotationZ);
    });
    
    console.log('🔄 STL rotation applied to', stlObjects.length, 'object(s)');
}

// Function to update position of existing STL objects
function updateSTLPosition() {
    if (stlObjects.length === 0) return;
    
    // Get position values from UI
    const positionX = parseFloat(document.getElementById('stl-position-x-number').value);
    const positionY = parseFloat(document.getElementById('stl-position-y-number').value);
    const positionZ = parseFloat(document.getElementById('stl-position-z-number').value);
    
    // Apply position to all STL objects (X/Z center, Y bottom)
    stlObjects.forEach(obj => {
        // Get current scale and rotation
        const scale = obj.mesh.scale.x; // Assuming uniform scaling
        const rotation = obj.mesh.rotation.clone();
        
        // Create a temporary geometry to calculate bounding box after rotation
        const geometry = obj.originalGeometry.clone();
        geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation));
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox;
        const center = boundingBox.getCenter(new THREE.Vector3());
        
        // Calculate the offset needed to center the model
        const offset = center.clone().multiplyScalar(-scale);
        
        // For X and Z: center the bounding box at specified position
        // For Y: position center at specified Y
        const ySize = (boundingBox.max.y - boundingBox.min.y) * scale; // Y size of bounding box
        
        // Set position: X/Z centered, Y center at specified position
        obj.mesh.position.set(positionX, positionY, positionZ);
        
        // Apply the centering offset
        obj.mesh.position.add(offset);
    });
    
    console.log('🔄 STL position applied to', stlObjects.length, 'object(s)');
}

// Function to analyze STL objects and categorize them by name
function analyzeSTLCategories() {
    const categories = {};
    
    stlObjects.forEach(obj => {
        const name = obj.name.toLowerCase();
        let category = 'Other'; // Default category
        
        // Determine category based on name
        if (name.includes('building') || name.includes('house') || name.includes('structure')) {
            category = 'Building';
        } else if (name.includes('tree') || name.includes('plant') || name.includes('vegetation')) {
            category = 'Tree';
        } else if (name.includes('road') || name.includes('street') || name.includes('path')) {
            category = 'Road';
        } else if (name.includes('car') || name.includes('vehicle') || name.includes('transport')) {
            category = 'Vehicle';
        } else if (name.includes('furniture') || name.includes('chair') || name.includes('table')) {
            category = 'Furniture';
        } else if (name.includes('light') || name.includes('lamp') || name.includes('lighting')) {
            category = 'Lighting';
        } else if (name.includes('water') || name.includes('river') || name.includes('lake')) {
            category = 'Water';
        } else if (name.includes('terrain') || name.includes('ground') || name.includes('landscape')) {
            category = 'Terrain';
        }
        
        // Add to category
        if (!categories[category]) {
            categories[category] = {
                name: category,
                objects: [],
                visible: true
            };
        }
        categories[category].objects.push(obj);
    });
    
    return Object.values(categories);
}

// Function to update STL layers list (now categories)
function updateSTLLayersList() {
    const list = document.getElementById('stl-layers-list');
    
    if (stlObjects.length === 0) {
        list.innerHTML = '<p>No categories detected</p>';
        return;
    }
    
    // Analyze categories from STL objects
    const categories = analyzeSTLCategories();
    
    if (categories.length === 0) {
        list.innerHTML = '<p>No categories found</p>';
        return;
    }
    
    list.innerHTML = '';
    categories.forEach((category, index) => {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.innerHTML = `
            <span>${category.name} (${category.objects.length} objects)</span>
            <button onclick="toggleSTLCategory(${index})" class="layer-toggle ${category.visible ? '' : 'hidden'}" id="category-toggle-${index}">
                ${category.visible ? 'Show' : 'Hide'}
            </button>
        `;
        list.appendChild(item);
    });
    
    // Store categories data for later use
    if (stlObjects.length > 0) {
        stlObjects[0].categories = categories;
    }
}

// Function to toggle STL category visibility
function toggleSTLCategory(categoryIndex) {
    if (stlObjects.length === 0 || !stlObjects[0].categories) return;
    
    const categories = stlObjects[0].categories;
    if (categoryIndex >= 0 && categoryIndex < categories.length) {
        const category = categories[categoryIndex];
        category.visible = !category.visible;
        
        // Update visibility of all objects in this category
        category.objects.forEach(obj => {
            obj.mesh.visible = category.visible;
        });
        
        // Update button appearance
        const button = document.getElementById(`category-toggle-${categoryIndex}`);
        if (button) {
            button.textContent = category.visible ? 'Show' : 'Hide';
            button.classList.toggle('hidden', !category.visible);
        }
        
        console.log(`Category "${category.name}" ${category.visible ? 'shown' : 'hidden'} (${category.objects.length} objects)`);
    }
}

// Loading overlay functions
function showLoading(message = 'Processing STL file...') {
    document.getElementById('loading-overlay').style.display = 'flex';
    document.querySelector('.loading-text').textContent = message;
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// Function to reset the scene
function resetScene() {
    // Clear trees
    trees.forEach(tree => scene.remove(tree));
    trees = [];
    
    // Clear buildings
    buildings.forEach(building => scene.remove(building));
    buildings = [];
    
    // Clear STL objects
    stlObjects.forEach(obj => scene.remove(obj.mesh));
    stlObjects = [];
    
    // Clear current drawing
    if (currentDrawing) {
        scene.remove(currentDrawing);
        currentDrawing = null;
    }
    
    // Clear ground, grid, and axes
    if (ground) {
        scene.remove(ground);
        ground = null;
    }
    
    if (gridHelper) {
        scene.remove(gridHelper);
        gridHelper = null;
    }
    
    scene.children.forEach(child => {
        // Hide global axes (child.userData && child.userData.type === 'axes')
        if (child.userData && child.userData.type === 'axes') {
            child.visible = false;
        }
    });
    
    // Disable grid and global axis checkboxes
    document.getElementById('grid-toggle').checked = false;
    document.getElementById('global-axis-toggle').checked = false;
    
    // Update UI
    updateSTLObjectsList();
    
    console.log('🧹 Scene reset - all objects cleared including ground, grid, and axes');
}

function exportSTL() {
    if (stlObjects.length === 0) {
        alert('No STL objects to export');
        return;
    }
    
    // Show loading overlay
    showLoading('Exporting STL file...');
    
    // Use setTimeout to allow the loading overlay to appear
    setTimeout(() => {
        try {
            // Create a group with all STL objects
            const group = new THREE.Group();
            stlObjects.forEach(obj => {
                group.add(obj.mesh.clone());
            });
            
            // Export the group as STL
            const exporter = new THREE.STLExporter();
            const stlString = exporter.parse(group);
            
            const blob = new Blob([stlString], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exported-scene.stl';
            a.click();
            
            console.log('📁 STL file exported');
        } catch (error) {
            console.error('Error exporting STL file:', error);
            alert('Error exporting STL file. Please try again.');
        } finally {
            hideLoading();
        }
    }, 100);
}

// Initialize the application
init(); 