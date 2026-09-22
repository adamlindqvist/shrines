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
npm run lint
npm run build
```

The production build is written to `dist/`. The scene is intentionally small, with sparse perimeter decoration and a broad continuous walkable clearing. The generated visual reference and iteration notes are kept in the ignored `.dream-loop/` folder.

Performance targets more than 60 FPS on suitable hardware; actual frame rate depends on GPU, display refresh rate, and browser.

## Project layout

| Folder       | Contents                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `app/`       | Application startup and the scene host that forwards `update` and `resize` to one scene            |
| `rendering/` | Seeded random, procedural geometry, primitives, textures, the material palette, resource ownership |
| `objects/`   | Factories for trees, bushes, rocks, pots, logs, the adventurer, slimes and puzzle pieces           |
| `gameplay/`  | Input, movement, collision, combat, slimes, puzzle, effects and the `AdventureGame` coordinator    |
| `ui/`        | The HUD overlay                                                                                    |
| `scenes/`    | The scene builder, terrain and camera/lighting building blocks, reusable groups and scenes         |

## Building scenes

Coordinates are on the X/Z ground plane (+Z points toward the camera) and rotations are yaws in degrees.

### Place a tree

A `SceneBuilder` places props into a scene root. Solid props register collision automatically, trees register canopy sway, and bushes and rocks are merged into shared batches.

```ts
scene.addTree({ x: -8, z: -6.3, scale: 1.5, rotation: 20 });
scene.addRock({ x: -9.8, z: -4.5, scale: 2.5 }); // scale = width in world units
scene.addBushCluster({ x: -7.1, z: -6.9, count: 6, spread: 1.5, scale: 0.48 });
scene.addPot({ x: -8.3, z: 4.9 });
scene.addLog({ x: -9.5, z: 6.6, rotation: -32 });
```

### Compose a reusable group

A group is an ordinary function that takes a builder and a placement. See `addWoodlandGrove` in `src/scenes/groups.ts`:

```ts
export function addWoodlandGrove(scene: SceneBuilder, { x, z, scale = 1, rotation = 0 }: ScaledPlacement) {
    const a = (rotation * Math.PI) / 180,
        c = Math.cos(a),
        s = Math.sin(a);
    const at = (dx: number, dz: number) => ({ x: x + (dx * c + dz * s) * scale, z: z + (-dx * s + dz * c) * scale });

    scene.addTree({ ...at(0, 0), scale: 1.3 * scale, rotation: rotation + 15 });
    scene.addTree({ ...at(2.1, 1.3), scale: 1.0 * scale, rotation: rotation - 40 });
    scene.addRock({ ...at(-1.8, 1.0), scale: 1.2 * scale, rotation });
    scene.addBushCluster({ ...at(0.9, 2.0), count: 4, spread: 0.9, scale: 0.4 * scale, rotation });
}

addWoodlandGrove(scene, { x: 4.4, z: -2.8, scale: 0.9, rotation: 150 });
```

### Create a scene

A scene factory receives the shared `AppContext` and returns `update(dt)`, `resize()` and `destroy()` hooks. It owns everything it creates: its root entity, materials and textures (via `SceneResources`), event listeners and HUD. `destroy()` removes them and leaves the application reusable. `src/scenes/woodland.ts` is a complete example:

```ts
export function createWoodlandScene(context: AppContext): SceneInstance {
    const { app, device } = context;
    const resources = new SceneResources();
    const palette = createPalette(resources);
    const rand = createRandom(11); // generation draws from this sequence in call order
    const root = new Entity('Quiet Woodland');
    app.root.addChild(root);

    const island = createIsland({ device, resources, rand }, root, {
        halfWidth: 8.6,
        halfDepth: 6.6,
        cornerRadius: 2.6,
        wallHeight: 1.5
    });
    const scene = new SceneBuilder({ device, palette }, rand, root);
    addWoodlandGrove(scene, { x: -4.6, z: -2.6 });
    scene.addPot({ x: -3.2, z: 3.6 });
    createBackdrop({ device, resources }, root, island);
    const layout = scene.finish(); // uploads the bush and rock batches

    const rig = new CameraRig(app, root, {
        ...MEADOW_LIGHTING,
        camera: {
            position: [0, 22, 19.2],
            target: [0, 0, 0.74],
            orthoHeight: 6.2,
            minVisibleWidth: 9.5,
            clearColor: new Color(0.78, 0.89, 0.81)
        }
    });

    let time = 0;
    return {
        update(dt) {
            time += Math.min(dt, 0.035);
            layout.animate(time);
        },
        resize: () => rig.resize(),
        destroy() {
            rig.destroy();
            root.destroy();
            resources.destroy();
        }
    };
}
```

Gameplay is opt-in. `src/scenes/meadow.ts` adds the adventurer, slimes and puzzle pieces through the same builder, then hands them to `AdventureGame`, which owns input, combat, the puzzle, the HUD and win/loss state.

### Select a scene

Register the factory in `src/scenes/index.ts`:

```ts
export const scenes = {
    meadow: createMeadowScene,
    woodland: createWoodlandScene
} satisfies Record<string, SceneFactory>;
```

Then pick it in `src/main.ts`:

```ts
const SCENE: SceneName = 'woodland';
```

In development builds, the console also exposes `shrines.load('woodland')` and `shrines.unload()` for checking teardown.
