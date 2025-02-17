import * as THREE from "three";
import './style.css';


let animationProps = {
    tileIntensity: 0,
    fogNear: 15,
    fogFar: 30
};
const ANIMATION_FPS = 30;
const ANIMATION_INTERVAL = 1000 / ANIMATION_FPS;
let lastAnimationTime = 0;
const activeTileStates = new Map(); 
let primaryTile = null; 
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
scene.background = new THREE.Color(0x000000); 
scene.fog = new THREE.Fog(0x000000, 10, 25); 
renderer.setClearColor(0x000000);

// Texture Loader

const textureLoader = new THREE.TextureLoader();
const texturePath = "/static/textures/";

// not yet sure if its better with textures...

// const metalTextures = {
//     map: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_basecolor.png`),
//     aoMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_ambientOcclusion.png`),
//     displacementMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_height.png`),
//     // metalnessMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_metallic.png`),
//     normalMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_normal.png`),
//     roughnessMap: textureLoader.load(`${texturePath}Terracotta_Floor_tiles_002_roughness.png`)
// };

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
ambientLight.intensity = 0.3;

scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

const tileLight = new THREE.SpotLight(0xffffff, 0, 30);
tileLight.angle = Math.PI / 1; 
tileLight.penumbra = 0.5;
tileLight.decay = 1;
scene.add(tileLight);


// Camera
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
    
    updateTileStates(intersects[0]?.object || null);
}

// Responsive Canvas
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Shader material for the gaps
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

// Plane for the shader
const gapPlaneSize = gridSize * (tileSize + gap);
const gapGeometry = new THREE.PlaneGeometry(gapPlaneSize, gapPlaneSize);
const gapPlane = new THREE.Mesh(gapGeometry, gapShaderMaterial);

gapPlane.position.z = -0.1;
gapPlane.rotation.x = gridGroup.rotation.x;
gapPlane.rotation.z = gridGroup.rotation.z;
scene.add(gapPlane);

function activateTile(tile, color, isPrimary = false) {
    const state = {
        color: color,
        isPrimary: isPrimary,
        intensity: isPrimary ? 2.0 : (Math.random() * 0.3 + 0.2)
    };
    
    activeTileStates.set(tile, state);
    
    // creating tweens for active tile
    const tweens = [
        new TWEEN.Tween(tile.material.color)
            .to(new THREE.Color(color), 500)
            .start(),
        new TWEEN.Tween(tile.material.emissive)
            .to(new THREE.Color(color), 500)
            .start(),
        new TWEEN.Tween(tile.material)
            .to({ emissiveIntensity: state.intensity }, 500)
            .start()
    ];
    
    if (isPrimary) {
        const worldPosition = new THREE.Vector3();
        tile.getWorldPosition(worldPosition);
        
        tileLight.position.set(worldPosition.x, worldPosition.y, worldPosition.z + 5);
        tileLight.target.position.set(worldPosition.x, worldPosition.y, worldPosition.z - 2);
        scene.add(tileLight.target);
        
    }
    
    return tweens;
}

function deactivateTile(tile) {
    if (!activeTileStates.has(tile)) return [];
    
    activeTileStates.delete(tile);
    
    const tweens = [
        new TWEEN.Tween(tile.material.color)
            .to(new THREE.Color(tile.userData.originalColor), 500)
            .start(),
        new TWEEN.Tween(tile.material.emissive)
            .to(new THREE.Color(0x000000), 500)
            .start(),
        new TWEEN.Tween(tile.material)
            .to({ emissiveIntensity: 0 }, 500)
            .start()
    ];
    
    return tweens;
}

function updateTileStates(hoveredTile) {
    if (!hoveredTile) {
        // No tile hovered, deactivate all
        Array.from(activeTileStates.keys()).forEach(tile => {
            deactivateTile(tile);
        });
        primaryTile = null;
        return;
    }
    
    const newColor = tileColors[Math.floor(Math.random() * tileColors.length)];
    
    if (primaryTile !== hoveredTile) {
        // Deactivate old primary tile if exists
        if (primaryTile) {
            deactivateTile(primaryTile);
        }
        
        // Activate new primary tile
        activateTile(hoveredTile, newColor, true);
        primaryTile = hoveredTile;
        
        // Handle neighbors
        const neighbors = getNeighborCoords(hoveredTile.userData.x, hoveredTile.userData.y)
            .sort(() => 0.5 - Math.random())
            .slice(0, 4); // Pick 4 random neighbors
            
        neighbors.forEach(({key}) => {
            const neighborTile = tileMap.get(key);
            if (neighborTile && !activeTileStates.has(neighborTile)) {
                activateTile(neighborTile, newColor, false);
            }
        });
    }
}
function getNeighborCoords(x, y) {
    return [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },  // Left & Right
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 },  // Up & Down
        { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, // Diagonals
        { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
    ].map(({dx, dy}) => ({
        x: x + dx,
        y: y + dy,
        key: `${x + dx},${y + dy}`
    }));
}


function animate(currentTime) {
    requestAnimationFrame(animate);
    
    TWEEN.update();
    
    if (currentTime - lastAnimationTime >= ANIMATION_INTERVAL && primaryTile) {
        const time = currentTime * 0.001;
        
        animationProps.tileIntensity = 15 + Math.sin(time * 4) * 3;
        animationProps.fogNear = 15 + Math.sin(time) * 2;
        animationProps.fogFar = 30 + Math.sin(time * 0.5) * 2;
        
        tileLight.intensity = animationProps.tileIntensity;
        scene.fog.near = animationProps.fogNear;
        scene.fog.far = animationProps.fogFar;
        
        lastAnimationTime = currentTime;
    }
    
    gapShaderMaterial.uniforms.time.value = currentTime * 0.0005;
    renderer.render(scene, camera);
}
animate();
window.addEventListener("mousemove", onMouseMove);
