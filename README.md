# Shrines — a little adventure

A small playable fantasy clearing built with PlayCanvas and TypeScript. The adventure combines procedural geometry with trees and rocks from a bundled low-poly nature GLB.

## Imported nature scenery

All playable areas—Mossy Meadow, Sun & Moon Grove, Two Suns Shrine, and Twin Bridges Isle—use trees and rocks from the bundled `src/assets/low_poly_nature_free.glb`. Terrain, bushes, props, characters, puzzles, collision circles, and seeded generation order retain their procedural implementation. Imported trees are static because their trunk and crown share a mesh.

`src/rendering/nature-tuning.ts` records exact static vertex bounds, grounding, and uniform scale for six selected models. Instances share meshes and the pack material; each scene unloads its container after destroying its instances. A loading status handles asynchronous preparation, including switching away during a pending load. Trees and rocks always use this palette; the procedural versions and comparison levels have been removed.

The GLB remains an unmodified source asset in `src/assets/`. Vite emits it with a content hash and the PWA precaches it. Keep it in source control with these changes. A later export can trim unused models and batch repeated rocks if profiling calls for it.

Asset: **Low Poly Nature Free ✓** by **\_Alexandr**, from [Sketchfab](https://sketchfab.com/3d-models/low-poly-nature-free-b9b9d627d62b46418ba61de1cc1df557), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as recorded in the GLB metadata. Models are repositioned, rotated, and uniformly scaled; source geometry and texture are unchanged. A shipped copy of this credit is in `public/asset-credits.txt`.

## Play locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Use **WASD or arrow keys** to move at 4.5 units/s and **Space or click** to swing your sword, with 0.30 seconds between swings. Press **Escape** to pause. On touch screens, drag the **joystick** in the bottom-left corner to move and tap the **⚔️ button** in the bottom-right corner to attack or grab. There is no sprint or dash. Near the turquoise block, **Space or click** grabs it instead of swinging. Grabbing turns you to face the box and locks your facing: moving carries the box in any direction while keeping its offset, so with the box on your right, pressing up sidesteps you both upward. If the box is blocked, you stop; diagonal pushes slide along walls. Then press **Space or click** again to release it. Bring it onto the sun switch to open the portal; it releases automatically when it snaps into place. Two friendly-looking slimes provide a small combat challenge in the open meadow. Solving it raises a portal; walking into it takes you to **Sun & Moon Grove**, a larger 40 × 30 clearing with a following camera, four slimes, and two symbol-marked blocks. Follow the sandy paths and bring each block to its matching sun or moon plate. Correct matches lock in place; both open the second portal, which leads to **Two Suns Shrine**. Match both sun blocks, then walk up the shrine steps to enter its portal. That leads to **Twin Bridges Isle**, a 48 × 40 island cut by two rivers: the sun block raises the first bridge, the moon block the second, and a second sun block carried to the shrine plate opens the final portal. Players, carried blocks, and slimes follow registered ground surfaces; small steps are walkable, while cliffs are blocked. Jumping, falling, and stacked floors are not supported. Defeating the slimes is optional. Your remaining hearts carry over; restarting after defeat or victory starts the whole adventure again with three hearts.

## Install on an iPad or phone

Deploy the production `dist/` folder to an HTTPS static host. In Safari on iPad, open the game, tap **Share → Add to Home Screen**, leave **Open as Web App** enabled if shown, then tap **Add**. Launch Shrines from its new icon for a standalone game without browser tabs. Other supported browsers offer their own install action.

After the first online load finishes caching, the production game can reopen offline. This caches the game, not saved progress: each launch still starts a new adventure. Browsers can remove offline data when storage is low. New releases download in the background and activate after all Shrines windows are closed; the game never forces a reload during play.

To test installation and offline behavior locally, run `npm run build` then `npm start`. Localhost supports service workers; an iPad accessing a computer's plain HTTP LAN address does not, so use HTTPS for device testing. Service workers are disabled in `npm run dev`; use a separate origin/port for development and production preview. Deploy all build files together, including `sw.js`, the Workbox script, and `manifest.webmanifest`. Serve `sw.js`, the manifest, and `index.html` with revalidation (`Cache-Control: no-cache`); hashed assets may be cached immutably. For subdirectory hosting, build with `npm run build -- --base=/your-path/`.

The generated [icon source](docs/shrines-icon-source.png) and [generation prompt](docs/icon.md) are retained for future edits. Install icons and the favicon live in `public/`; Vite generates the manifest and revisioned offline cache from `vite.config.ts`.

## Development

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The production build is written to `dist/`. Both areas use sparse perimeter decoration and broad continuous walkable clearings. The second area is roughly 1.6 times wider and deeper; its camera follows the player instead of framing the entire island. Controller and puzzle tests run in Node with stubbed DOM/particle rendering; browser checks are still required for game feel and visuals. The generated visual reference and iteration notes are kept in the ignored `.dream-loop/` folder.

Performance targets more than 60 FPS on suitable hardware; actual frame rate depends on GPU, display refresh rate, and browser.

## Project layout

| Folder       | Contents                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `app/`       | Application startup and the scene host that forwards `update` and `resize` to one scene            |
| `rendering/` | Seeded random, procedural geometry, primitives, textures, the material palette, resource ownership |
| `objects/`   | Factories for trees, bushes, rocks, pots, logs, the adventurer, slimes and puzzle pieces           |
| `levels/`    | Serializable scene/level definitions, defaults, validation and journey registry                    |
| `gameplay/`  | Input, movement, collision, combat, slimes, puzzle, effects and the `AdventureGame` coordinator    |
| `ui/`        | The HUD overlay                                                                                    |
| `scenes/`    | The scene builder, terrain and camera/lighting building blocks, reusable groups and scenes         |

## Building playable levels

Playable scenes and their rules are separate, JSON-compatible TypeScript data. `src/levels/types.ts` defines the contracts; `src/levels/twin-bridges.ts` shows a complete box → plate → bridge → portal setup.

- `SceneDefinition` owns terrain, spawn, bounds, camera, lighting and ordered object lists. `scenery` is constructed before the player; `objects` afterwards. Preserve this order and the seed when keeping existing scenery unchanged.
- `LevelDefinition` references a scene and owns rules, completion, HUD and text. Multiple levels can reference the same scene with different objectives.
- `JourneyDefinition` lists level IDs in order and specifies the restart level. Health carries across levels; restart restores the restart level's maximum health.

Definitions contain plain objects, arrays, strings, numbers and booleans. Use data spreads for defaults; do not add callbacks, `Color` instances or scene-building code. Object types cover trees, rocks, bushes, bush clusters, pots, logs, signs, shrine platforms, bridges, blocks, plates, portals, slimes and zones. Interactives have unique IDs across both lists. Rock scale is width in world units; other scale values retain their existing factory contracts. Camera RGB values are numeric triples.

### Add a complete level

Create `src/levels/little-shrine.ts`:

```ts
import { DEFAULT_HUD, DEFAULT_LIGHTING, DEFAULT_TEXT } from './defaults';
import type { LevelDefinition, SceneDefinition } from './types';

export const scene: SceneDefinition = {
    id: 'little-shrine',
    name: 'Little Shrine',
    seed: 510,
    terrain: { halfWidth: 12, halfDepth: 10, cornerRadius: 2, wallHeight: 1.8 },
    backdrop: { size: 34 },
    spawn: { x: 0, z: 7 },
    walkBounds: { minX: -10, maxX: 10, minZ: -8, maxZ: 8 },
    blockBounds: { minX: -9, maxX: 9, minZ: -7, maxZ: 7 },
    camera: {
        ...DEFAULT_LIGHTING,
        camera: {
            position: [0, 22, 19.2],
            target: [0, 0, 0.74],
            orthoHeight: 10,
            minVisibleHalfWidth: 12,
            clearColor: [0.78, 0.89, 0.81]
        }
    },
    scenery: [{ type: 'tree', x: -8, z: -6, scale: 1.2 }],
    objects: [
        { type: 'block', id: 'box', symbol: 'sun', x: 0, z: 5 },
        { type: 'plate', id: 'plate', symbol: 'sun', x: 0, z: -2 },
        { type: 'portal', id: 'portal', x: 5, z: -5, rotation: 0, locked: true }
    ]
};

export const level: LevelDefinition = {
    id: 'little-shrine',
    scene: 'little-shrine',
    hud: DEFAULT_HUD,
    text: { ...DEFAULT_TEXT, matched: 'Klick! Solen lyser.' },
    rules: [
        {
            id: 'open-portal',
            when: { type: 'plateActive', target: 'plate' },
            actions: [{ type: 'openPortal', target: 'portal' }],
            message: 'En portal öppnar sig!'
        }
    ],
    completion: { type: 'portalReached', target: 'portal' }
};
```

Import these exports into `src/levels/index.ts` and add them under `'little-shrine'` in `sceneDefinitions` and `levelDefinitions`. This automatically exposes `shrines.load('little-shrine')` and, in development, `/?level=N` where `N` is its 1-based position among `levelDefinitions`' keys. To include it in the adventure, also add its level ID to `adventureJourney.levels`. No changes to `AdventureGame` or object controllers are needed.

### Conditions and actions

Conditions are `plateActive`, `enemyDefeated`, `portalReached` and `zoneVisited`, each with a `target` ID. Combine them using `{ type: 'all' | 'any', conditions: [...] }`; the list must not be empty. A defeated enemy has zero health. A reached portal must be open and fully risen, and the player must be nearby on its floor. Zones have `minX`, `maxX`, `minZ`, `maxZ`, `minY`, `maxY`; visits remain recorded until reset. A level can have no boxes or no portals.

Each rule fires once and can target multiple objects with `openBridge` and `openPortal`. Conditions use one snapshot per playing frame; action consequences are observed in the next frame. `completion` uses the same condition syntax and is independent of any rule. A portal never implicitly ends a level. Lethal damage takes precedence over completion.

Plates permanently snap and lock matching boxes. Portals and bridges stay open until reset. A closed portal shows only its plinth; opening raises the gate over 0.9 seconds. A bridge's `state` is initially `'open'` or `'closed'`; it extends along Z and rises in 0.8 seconds. The full passage stays blocked for players, carried blocks and slimes until it finishes rising. Shore openings are derived from bridge footprints, so river definitions do not contain hand-authored openings. Pause freezes progress. Restart restores every authored state, visited zone and rule.

Definitions are validated before creating scene resources. Errors identify the level and invalid field, including missing/wrong references, duplicate IDs, nonfinite dimensions and empty condition groups. Validation does not prove puzzle solvability; play every transport route. `window.meadow` and `#diagnostics` expose object IDs, plate/portal/bridge states, visited zones, activated rules and completion.

## Low-level scene composition

The following builder API is used by playable levels through their data definitions above.

Coordinates are on the X/Z ground plane (+Z points toward the camera) and rotations are yaws in degrees.

### Place a tree

A `SceneBuilder` places props into a scene root. Solid props register collision automatically, imported trees and rocks share model resources, and bushes are merged into shared batches.

```ts
scene.addTree({ x: -8, z: -6.3, scale: 1.5, rotation: 20 });
scene.addRock({ x: -9.8, z: -4.5, scale: 2.5 }); // scale = width in world units
scene.addBushCluster({ x: -7.1, z: -6.9, count: 6, spread: 1.5, scale: 0.48 });
scene.addPot({ x: -8.3, z: 4.9 });
scene.addLog({ x: -9.5, z: 6.6, rotation: -32 });
```

### Scene lifecycle

A scene factory receives the shared `AppContext` and returns `update(dt)`, `resize()` and `destroy()` hooks. It owns everything it creates: its root entity, materials and textures (via `SceneResources`), event listeners and HUD. `destroy()` removes them and leaves the application reusable.

`src/levels/meadow.ts`, `src/levels/sun-moon.ts`, `src/levels/two-suns.ts`, and `src/levels/twin-bridges.ts` configure the four adventure areas. `createAdventureArea` constructs them through `SceneBuilder`, then hands them to `AdventureGame`, which owns input, combat, the puzzle, the HUD and win/loss state. The journey owns progression and queues area changes until the running update has returned; it destroys the previous area before creating the next.

### Select a scene

Registered levels are exposed automatically in `src/scenes/index.ts`. Set `SCENE` in `src/main.ts` to choose the startup level. In development, use `shrines.load('sun-moon')` or `?level=2` (its 1-based position among `levelDefinitions`' keys) to inspect another area, and `shrines.unload()` to check teardown. URL overrides are ignored in production. `window.meadow` and the hidden `#diagnostics` output describe the active adventure area, including stage, remaining hearts, each block's symbol and lock state, activated plates, and camera position.
