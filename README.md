# Interactive Three.js Grid Effect

This project features an interactive grid built with Three.js. The tiles change color and glow when hovered over, with animated lighting effects and smooth transitions. The gaps between tiles have a dynamic shader effect.

## Features

- **Interactive Tile Effects:** Hovering over tiles changes their color and emits a glowing effect.
- **Neighbor Tile Glow:** Randomly selected neighboring tiles receive a weaker glow effect.
- **Dynamic Lighting:** A spotlight follows the hovered tile.
- **Fog Effect:** Adds depth and ambiance to the scene.
- **Shader-Driven Grid Gaps:** Custom fragment shader animates the tile gaps.

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/threejs-grid-effect.git
   cd threejs-grid-effect
   ```
2. Install dependencies (if using a local server):
   ```sh
   npm install
   ```
3. Start a development server:
   ```sh
   npm run dev
   ```
   Alternatively, you can open the `index.html` file directly in a browser.

## Usage

- Move your mouse over the tiles to see the color changes and lighting effects.
- Resize the browser window to adjust the scene dynamically.

## Customization

- **Tile Colors:** Modify the `tileColors` array in `script.js`.
- **Tile Size & Grid Density:** Adjust `tileSize` and `gridSize` values.
- **Shader Effects:** Modify the `gapShaderMaterial` in `script.js`.

## Dependencies

- [Three.js](https://threejs.org/)
- [TWEEN.js](https://github.com/tweenjs/tween.js)

## License

This project is open-source and available under the MIT License.