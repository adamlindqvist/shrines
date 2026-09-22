# Mossy Meadow

A small playable fantasy clearing built with PlayCanvas and TypeScript. All models are procedural geometry; no external art assets are downloaded.

## Play locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Use **WASD** to move and **Space or click** to swing your sword. Push the turquoise block onto the sun switch to unlock the treasure. Two friendly-looking slimes provide a small combat challenge in the open meadow.

## Development

```sh
npm run typecheck
npm run build
```

The production build is written to `dist/`. The scene is intentionally small, with sparse perimeter decoration and a broad continuous walkable clearing. The generated visual reference and iteration notes are kept in the ignored `.dream-loop/` folder.

Performance targets more than 60 FPS on suitable hardware; actual frame rate depends on GPU, display refresh rate, and browser.
