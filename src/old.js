import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import './style.css';

// Add these variables at the top after imports
let currentTweens = [];
let animationProps = {
    tileIntensity: 0,
    fogNear: 15,
    fogFar: 30
};
const ANIMATION_FPS = 30;
const ANIMATION_INTERVAL = 1000 / ANIMATION_FPS;
let lastAnimationTime = 0;

// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Fog Effect to Hide Edges
scene.background = new THREE.Color(0x000000); // Black background
scene.fog = new THREE.Fog(0x000000, 10, 25);  // Color, near, far
renderer.setClearColor(0x000000);

// Texture Loader

const textureLoader = new THREE.TextureLoader();
const texturePath = "/static/textures/";

const metalTextures = {
    map: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_basecolor.png`),
    aoMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_ambientOcclusion.png`),
    displacementMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_height.png`),
    // metalnessMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_metallic.png`),
    normalMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_normal.png`),
    roughnessMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_roughness.png`)
};

// Grid Settings
const gridSize = 100;
const tileSize = 2;
const gap = 0.07;
const tiles = [];
const tileMap = new Map();
const tileColors = [0xff5555, 0x55aaff, 0x55ff77, 0xffcc55];

const gridGroup = new THREE.Group();
const geometry = new THREE.PlaneGeometry(tileSize, tileSize, 32, 32);
for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
        const material = new THREE.MeshStandardMaterial({
            color: 0x222222,
            side: THREE.DoubleSide,
            emissive: 0x000000,
            emissiveIntensity: 0,
        });
        const tile = new THREE.Mesh(geometry, material);
        tile.position.set(
            (x - gridSize / 2) * (tileSize + gap),
            (y - gridSize / 2) * (tileSize + gap),
            0
        );
        tile.receiveShadow = true;
        tile.userData = { x, y, originalColor: tile.material.color.getHex(), originalPosition: tile.position.clone() };
        gridGroup.add(tile);
        tiles.push(tile);
        tileMap.set(`${x},${y}`, tile);
    }
}
// for textures

// for (let x = 0; x < gridSize; x++) {
//     for (let y = 0; y < gridSize; y++) {
//         const material = new THREE.MeshStandardMaterial({
//             ...metalTextures,
//             side: THREE.DoubleSide,
//             emissive: 0x000000,
//             emissiveIntensity: 0,
//             displacementScale: 0.1, // Reduced scale to prevent extreme spikes
//             displacementBias: -0.05, // Centers the displacement
//             roughness: 0.6, // Slightly smoother surface
//             metalness: 0.9 // Keeps the metallic feel strong
//         });
//         const tile = new THREE.Mesh(geometry, material);
//         tile.position.set(
//             (x - gridSize / 2) * (tileSize + gap),
//             (y - gridSize / 2) * (tileSize + gap),
//             0
//         );
//         tile.receiveShadow = true;
//         tile.userData = { x, y, originalColor: tile.material.color.getHex(), originalPosition: tile.position.clone() };
//         gridGroup.add(tile);
//         tiles.push(tile);
//         tileMap.set(`${x},${y}`, tile);
//     }
// }

scene.add(gridGroup);

// **TILT THE GRID**
gridGroup.rotation.x = -Math.PI / 4;
gridGroup.rotation.z = Math.PI / 6;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
ambientLight.intensity = 0.3;  // Reduce ambient light to make fog more visible

scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);
//tile light
// Create a powerful central spotlight and intense pointlight
const tileLight = new THREE.SpotLight(0xffffff, 0, 30); // Increased range to 30
tileLight.angle = Math.PI / 1; // Wider angle
tileLight.penumbra = 0.5; // Soft edges
tileLight.decay = 1; // Slower decay
scene.add(tileLight);


// **Camera Position (Lowered for closer look)**
camera.position.set(0, 3, 15);
camera.far = 100; // Make sure camera far plane extends beyond fog
camera.updateProjectionMatrix();
camera.lookAt(0, 0, 0);

// Mouse Interactivity
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let lastHoveredTile = null;
let glowingTiles = [];

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(tiles);

    if (intersects.length > 0) {
        const hoveredTile = intersects[0].object;

        // Ignore neighbor tiles treated as glowing only
        if (hoveredTile.userData.isNeighbor) return;

        if (hoveredTile !== lastHoveredTile) {
            if (lastHoveredTile) {
                resetTile(lastHoveredTile);
            }

            activateTile(hoveredTile);
            lastHoveredTile = hoveredTile;
        }
    } else {
        if (lastHoveredTile) {
            resetTile(lastHoveredTile);
            lastHoveredTile = null;
        }
    }
}
function resetTile(tile) {
    // Reset the tile back to its original state
    new TWEEN.Tween(tile.material.color)
        .to(new THREE.Color(tile.userData.originalColor), 500)
        .start();
    new TWEEN.Tween(tile.material.emissive)
        .to(new THREE.Color(0x000000), 500)
        .start();
    tile.material.emissiveIntensity = 0; // Reset emissive intensity
}
function activateTile(tile) {
    // Stop any animations for the new hovered tile
    currentTweens.forEach((tween) => tween.stop());
    currentTweens = [];
    resetGlowingTiles(); // Stop glowing neighbors to avoid conflicts

    const newColor = tileColors[Math.floor(Math.random() * tileColors.length)];
    const worldPosition = new THREE.Vector3();
    tile.getWorldPosition(worldPosition);

    // Position the tile's spotlight
    tileLight.position.set(worldPosition.x, worldPosition.y, worldPosition.z + 5);
    tileLight.target.position.set(worldPosition.x, worldPosition.y, worldPosition.z - 2);
    scene.add(tileLight.target);

    // Start emission and color animation
    const tween = new TWEEN.Tween({
        tileIntensity: 0,
        emissiveIntensity: 0,
        r: tile.material.color.r,
        g: tile.material.color.g,
        b: tile.material.color.b,
    })
        .to({
            tileIntensity: 15,
            emissiveIntensity: 2.0,
            r: new THREE.Color(newColor).r,
            g: new THREE.Color(newColor).g,
            b: new THREE.Color(newColor).b,
        }, 200)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate((obj) => {
            tileLight.intensity = obj.tileIntensity;
            tile.material.emissiveIntensity = obj.emissiveIntensity;
            tile.material.color.setRGB(obj.r, obj.g, obj.b);
            tile.material.emissive.setRGB(obj.r, obj.g, obj.b);
        });

    currentTweens.push(tween);
    tween.start();

    // Activate glowing neighbors
    activateGlowingTiles(tile.userData.x, tile.userData.y, newColor);
}
// Highlight neighboring tiles with random opacity
function activateGlowingTiles(x, y, baseColor) {
    // Reset previously glowing neighbors to their original state
    glowingTiles.forEach((tile) => {
        tile.userData.isNeighbor = false; // Clear neighbor tagging
        new TWEEN.Tween(tile.material.color)
            .to(new THREE.Color(tile.userData.originalColor), 500)
            .start();
        new TWEEN.Tween(tile.material.emissive)
            .to(new THREE.Color(0x000000), 500)
            .start();
        tile.material.emissiveIntensity = 0;
    });

    // Clear the glowingTiles array
    glowingTiles = [];

    // Define the neighbors' relative positions
    const neighbors = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },  // Left & Right
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 },  // Up & Down
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, // Diagonals
        { dx: 1, dy: -1 }, { dx: -1, dy: 1 }  // Diagonal Opposites
    ];

    // Shuffle the neighbors array and select a few random ones (e.g., 4 neighbors)
    const shuffledNeighbors = neighbors.sort(() => 0.5 - Math.random()).slice(0, 4);

    // Activate new random neighbors
    shuffledNeighbors.forEach(({ dx, dy }) => {
        const neighborKey = `${x + dx},${y + dy}`;
        if (tileMap.has(neighborKey)) {
            const neighborTile = tileMap.get(neighborKey);

            // Mark this tile as a neighbor
            neighborTile.userData.isNeighbor = true;

            // Start glowing effect for the neighbor
            new TWEEN.Tween(neighborTile.material.color)
                .to(new THREE.Color(baseColor), 500)
                .start();
            new TWEEN.Tween(neighborTile.material.emissive)
                .to(new THREE.Color(baseColor), 500)
                .start();
            neighborTile.material.emissiveIntensity = Math.random() * 0.4 + 0.001; // Lower intensity for neighbors

            // Add this tile to the glowingTiles list for later resetting
            glowingTiles.push(neighborTile);
        }
    });
}
// Reset glowing tiles
function resetGlowingTiles() {
    glowingTiles.forEach(tile => {
        // Reset neighbors only
        if (tile.userData.isNeighbor) {
            new TWEEN.Tween(tile.material.color)
                .to(new THREE.Color(tile.userData.originalColor), 500)
                .start();
            new TWEEN.Tween(tile.material.emissive)
                .to(new THREE.Color(0x000000), 500)
                .start();
            tile.material.emissiveIntensity = 0;
            tile.userData.isNeighbor = false; // Clear neighbor flag
        }
    });

    glowingTiles = []; // Clear glowing tiles
}

window.addEventListener("mousemove", onMouseMove);

// Responsive Canvas
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create a shader material for the gaps
const gapShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ccff) },
        intensity: { value: 0.9 },
        mouse: { value: new THREE.Vector2(0.5, 0.5) }  // Add this line if you need mouse interaction
    },
    vertexShader: `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float intensity;
    uniform vec2 mouse;
    varying vec2 vUv;
    
    void main() {
      float pulse = sin(time * 2.0) * 0.5 + 0.8;
      vec2 grid = fract(vUv * 50.0);
      float line = min(grid.x, grid.y);
      float glow = smoothstep(0.45, 0.5, line);
      glow *= intensity * pulse;
      vec3 finalColor = color * glow;
      gl_FragColor = vec4(finalColor, glow * 0.9);
    }
  `,
    transparent: true,
    side: THREE.DoubleSide,
});

// Create a plane slightly larger than the grid to show the gaps
const gapPlaneSize = gridSize * (tileSize + gap);
const gapGeometry = new THREE.PlaneGeometry(gapPlaneSize, gapPlaneSize);
const gapPlane = new THREE.Mesh(gapGeometry, gapShaderMaterial);

// Position it just below the grid
gapPlane.position.z = -0.1;
gapPlane.rotation.x = gridGroup.rotation.x;
gapPlane.rotation.z = gridGroup.rotation.z;
scene.add(gapPlane);

// Update the animation loop to animate the shader
function animate(currentTime) {
    requestAnimationFrame(animate);

    // Update tweens every frame
    TWEEN.update();

    // Update heavy calculations at fixed intervals
    if (currentTime - lastAnimationTime >= ANIMATION_INTERVAL && lastHoveredTile) {
        const time = currentTime * 0.001;

        // Batch updates
        animationProps.tileIntensity = 15 + Math.sin(time * 4) * 3;

        animationProps.fogNear = 15 + Math.sin(time) * 2;
        animationProps.fogFar = 30 + Math.sin(time * 0.5) * 2;

        // Apply updates
        tileLight.intensity = animationProps.tileIntensity;

        scene.fog.near = animationProps.fogNear;
        scene.fog.far = animationProps.fogFar;



        lastAnimationTime = currentTime;
    }

    // Update shader uniforms
    gapShaderMaterial.uniforms.time.value = currentTime * 0.0005;

    renderer.render(scene, camera);
}
animate();

// Update mouse position uniform
window.addEventListener("mousemove", (event) => {
    const mouseX = (event.clientX / window.innerWidth);
    const mouseY = 1.0 - (event.clientY / window.innerHeight);
    gapShaderMaterial.uniforms.mouse.value.set(mouseX, mouseY);
});