# Shrines — a little adventure

A small playable fantasy clearing built with PlayCanvas and TypeScript. The adventure combines procedural geometry with trees and rocks from a bundled low-poly nature GLB.

## Imported nature scenery

All playable areas—Mossy Meadow, Sun & Moon Grove, Twin Bridges Isle, Solgrinden, Drifting Stones, and Lantern Lake—use trees and rocks from the bundled `src/assets/low_poly_nature_free.glb`. Terrain, bushes, props, characters, puzzles, collision circles, and seeded generation order retain their procedural implementation. Imported trees are static because their trunk and crown share a mesh.

`src/rendering/nature-tuning.ts` records exact static vertex bounds, grounding, and uniform scale for six selected models. Instances share meshes and the pack material; each scene unloads its container after destroying its instances. A loading status handles asynchronous preparation, including switching away during a pending load. Trees and rocks always use this palette; the procedural versions and comparison levels have been removed.

The GLB remains an unmodified source asset in `src/assets/`. Vite emits it with a content hash and the PWA precaches it. Keep it in source control with these changes. A later export can trim unused models and batch repeated rocks if profiling calls for it.

Asset: **Low Poly Nature Free ✓** by **\_Alexandr**, from [Sketchfab](https://sketchfab.com/3d-models/low-poly-nature-free-b9b9d627d62b46418ba61de1cc1df557), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as recorded in the GLB metadata. Models are repositioned, rotated, and uniformly scaled; source geometry and texture are unchanged. A shipped copy of this credit is in `public/asset-credits.txt`.

## Play locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Use **WASD or arrow keys** to move at 7.5 units/s and **Space or left-click** to swing your sword, with 0.30 seconds between swings. Hold **Shift or the right mouse button** to raise your shield: it blocks slime attacks from the front, locks your facing and halves walking speed so you can back away or sidestep. Release to turn and attack again; an ongoing sword swing finishes before the shield rises. Attacks from behind still hurt, and you cannot guard while carrying a block. Press **Escape** to pause. On touch screens, drag the **joystick** in the bottom-left corner to move — the further you push it, the faster you walk — and tap the **⚔️ button** in the bottom-right corner to attack, grab, or release. Hold the **🛡️ button** beside it to guard while steering. Touching the canvas does not interact. There is no sprint or dash. Near the turquoise block, **Space or click** grabs it instead of swinging. Grabbing turns you to face the box and locks your facing: moving carries the box in any direction while keeping its offset, so with the box on your right, pressing up sidesteps you both upward. If the box is blocked, you stop; diagonal pushes slide along walls. Then press **Space or click** again to release it. Bring it onto the sun switch to open the portal; it releases automatically when it snaps into place. Two friendly-looking slimes provide a small combat challenge in the open meadow. Solving it raises a portal; walking into it takes you to **Sun & Moon Grove**, a larger 40 × 30 clearing with a following camera, four slimes, and two symbol-marked blocks. Follow the sandy paths and bring each block to its matching sun or moon plate. Correct matches lock in place; both open the second portal, which leads to **Twin Bridges Isle**, a 48 × 40 island cut by two rivers: the sun block raises the first bridge, the moon block the second, and a second sun block carried to its shrine plate opens that isle's portal. It leads to **Solgrinden**. Explore its larger 40 × 36 island: follow the trail east to find the sun block in its own glade, then carry it back west and leave it on the octagonal wooden temporary plate in the starting glade to keep the angled gate open, then find the moon block behind the rock chamber’s inner ridge. Carry it around the broad bend, through the gate and along the sandy trail to its square moon plate below the eastern shrine. Two slimes in a south-east side glade offer optional combat. Temporary plates never lock blocks: picking the sun up closes the gate once its passage is clear. The moon plate readies a permanent sun plate. Return to the starting glade and bring the sun to this square plate beside the moon; both permanent matches open the raised shrine portal. It leads to **Drifting Stones**: a wide river crossed by two floating stones. Placing the moon block on its plate wakes the stones, which rise from the river and drift sideways, out of step with each other, between a south pier, a mid-river pad and a north pier. Time each step on and off while they rest at a dock, and carry the sun block across both to the shrine plate to open the portal to **Lantern Lake**, the final area. Two enclosed courts stand beside the lake, connected by short dry paths; the spacious east court leaves room around its plates and shrine stairs. Leave the sun block on the temporary plate outside the west court to retrieve the moon. The temporary moon plate outside the east court opens its gate; bring the sun from the west plate to the temporary sun plate inside the east court so it can take over gate duty. Now retrieve the moon from outside and carry it to its permanent lantern plate inside. This keeps the east gate open and readies the permanent sun plate, linked by a directional stone inlay. Reuse the sun on that final plate to light both lanterns and open the last portal. Two slimes remain in optional side clearings. Stepping into open water costs a heart and returns you to your last dry footing; a block carried into the water sinks, then resurfaces, flickering, at the last dry spot it rested on that is clear of you. Players, carried blocks, and slimes follow registered ground surfaces; small steps are walkable, while cliffs are blocked. Jumping and stacked floors are not supported. Defeating the slimes is optional. Your remaining hearts carry over; after a defeat you retry the current area with full hearts, and restarting after victory starts the whole adventure again.

The main journey has six areas: **Mossy Meadow → Sun & Moon Grove → Twin Bridges Isle → Solgrinden → Drifting Stones → Lantern Lake**.

Progress saves automatically in this browser when you finish an area and enter its portal. Refreshing or reopening resumes the furthest area reached, with full hearts and its puzzle reset; finishing area 3 resumes area 4. Use **Välj område** on the title or end card, or **Områden** during play, to replay completed areas or return to your checkpoint. Opening the selector freezes the game; Escape or its close button restores the previous screen. Choosing an area starts it fresh with full hearts. Replaying earlier areas and starting over after victory preserve your unlocks and saved checkpoint. Saves stay on this browser/device; partial puzzles and player positions are not saved.

The hooded hero has layered matte clothing, a wooden shield, and a tapered sword held above the ground. Walking uses resolved travel distance for alternating foot arcs and a subtle vertical footstep bounce, settling when blocked or stopped. Carrying preserves facing with directional steps. Sword attacks have 0.05 seconds of anticipation, a 0.12-second damaging slash, and 0.13 seconds of recovery; the blade and slash cue follow the captured attack direction even while turning. Pause freezes these poses, and restart restores their rest transforms.

## Install on an iPad or phone

Deploy the production `dist/` folder to an HTTPS static host. In Safari on iPad, open the game, tap **Share → Add to Home Screen**, leave **Open as Web App** enabled if shown, then tap **Add**. Launch Shrines from its new icon for a standalone game without browser tabs. Other supported browsers offer their own install action.

After the first online load finishes caching, the production game can reopen offline. This caches the game, not saved progress: each launch still starts a new adventure. Browsers can remove offline data when storage is low. New releases download in the background. The game checks on launch, when returning to the window or going online, and every five minutes while visible. A small notice offers **Ladda om** (reload) to apply the update and start a new adventure, or **Senare** (later) to keep playing. Updating one window does not force other open adventures to reload. Closing every Shrines window also lets a waiting update activate. A normal browser refresh can still show the previous version until the downloaded update is activated.

Existing installations without the update notice need all Shrines tabs and installed-app windows closed once (or a hard refresh) to pick up this update flow.

To test installation and offline behavior locally, run `npm run build` then `npm start`. Localhost supports service workers; an iPad accessing a computer's plain HTTP LAN address does not, so use HTTPS for device testing. Service workers are disabled in `npm run dev`; use a separate origin/port for development and production preview. Deploy all build files together, including `sw.js`, the Workbox script, and `manifest.webmanifest`. Serve `sw.js`, the manifest, and `index.html` with revalidation (`Cache-Control: no-cache`); hashed assets may be cached immutably. For subdirectory hosting, build with `npm run build -- --base=/your-path/`.

The generated [icon source](docs/shrines-icon-source.png) and [generation prompt](docs/icon.md) are retained for future edits. Install icons and the favicon live in `public/`; Vite generates the manifest and revisioned offline cache from `vite.config.ts`.

## Development

The detailed gameplay spec lives in [`docs/mechanics.md`](docs/mechanics.md); project conventions for contributors and agents live in `AGENTS.md`.

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

Playable scenes and their rules are separate, JSON-compatible TypeScript data. `src/levels/types.ts` defines the contracts; `src/levels/twin-bridges.ts` shows a complete box → plate → bridge → portal setup, and `src/levels/drifting-stones.ts` adds moving platforms over open water.

- `SceneDefinition` owns terrain, spawn, bounds, camera, lighting and ordered object lists. `scenery` is constructed before the player; `objects` afterwards. Preserve this order and the seed when keeping existing scenery unchanged.
- `LevelDefinition` references a scene and owns rules, completion, HUD and text. Multiple levels can reference the same scene with different objectives.
- `JourneyDefinition` lists level IDs in order and specifies the restart level. Health carries across levels; restarting after defeat retries the current level with its maximum health, and restarting after victory starts the restart level with its maximum health. The normal adventure's checkpoint and replay selector use these IDs and order; both kinds of restart preserve saved unlocks.

`backdrop` sets the sky plane under the island: its half-`size`, sky `gradient`, and the island's painted `shadowColor` and `shadowOffset`. Drifting cloud banks and a few small floating islets are scattered around the rim automatically from their own seeded stream, so they never shift scenery; `islets` overrides the islet count. They stay below the walkable top and off the island, with no collision.

The orthographic camera expands its directional shadow range on resize to cover the visible ground and bank. `sun.shadowDistance` is a minimum camera-space distance, capped by the camera's far clip.

Definitions contain plain objects, arrays, strings, numbers and booleans. Use data spreads for defaults; do not add callbacks, `Color` instances or scene-building code. Object types cover trees, rocks, bushes, bush clusters, pots, logs, signs, shrine platforms, bridges, piers, floating platforms, water regions, blocks, plates, portals, slimes and zones. Interactives have unique IDs across both lists. Rock scale is width in world units; other scale values retain their existing factory contracts. Camera RGB values are numeric triples.

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
            clearColor: [0.75, 0.89, 0.9]
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

Import these exports into `src/levels/index.ts` and add them under `'little-shrine'` in `sceneDefinitions` and `levelDefinitions`. This automatically exposes `shrines.load('little-shrine')` and, in development, `/?level=N` where `N` is its 1-based position among `levelDefinitions`' keys. To include it in the adventure, also add its level ID to `adventureJourney.levels`. The journey's `title` card is the splash shown once over whichever area the game opens in. No changes to `AdventureGame` or object controllers are needed.

### Conditions and actions

Conditions are `plateActive`, `enemyDefeated`, `portalReached` and `zoneVisited`, each with a `target` ID. Combine them using `{ type: 'all' | 'any', conditions: [...] }`; the list must not be empty. A defeated enemy has zero health. A reached portal must be open and fully risen, and the player must be nearby on its floor. Zones have `minX`, `maxX`, `minZ`, `maxZ`, `minY`, `maxY`; visits remain recorded until reset. A level can have no boxes or no portals.

Each rule fires once and can target multiple objects with `openBridge`, `openPortal` and `activatePlatform`. Conditions use one snapshot per playing frame; action consequences are observed in the next frame. `completion` uses the same condition syntax and is independent of any rule. A portal never implicitly ends a level. Lethal damage takes precedence over completion.

Plates default to `mode: 'permanent'` and snap and lock matching boxes. Set `mode: 'temporary'` to snap matching boxes and release them automatically without locking them; picking a block up immediately removes pressure, and the same block can be reused. The plate ignores a freshly picked-up box until it leaves the snap radius, allowing it to be carried away; returning or explicitly releasing it over the plate activates it again. Wrong symbols and the player do not activate temporary plates. Temporary plates are octagonal wooden pads with open ivory corner brackets; permanent plates remain square with a continuous border. The round turquoise-and-sandstone seal marks a portal. For nearby plates on clear, flat ground, set `showDependency: true` on the dependent plate to draw a directional stone inlay from its prerequisite; the three chevrons light turquoise in order over 0.45 gameplay seconds when that prerequisite activates. This is enabled for Solgrinden’s moon → sun connection. A plate can specify `requiresPlate: 'other-plate-id'` to accept a block only after that permanent plate is matched; its base and symbol are grey until ready. This prevents locking an essential block too early. Missing references, temporary prerequisites and dependency cycles are rejected. Rules with `openPortal` actions cannot reference temporary plates in their conditions, even inside `all`/`any`. Portals and bridges stay open until reset. A closed portal shows only its plinth; opening raises the gate over 1.1 seconds. A bridge's `state` is initially `'open'` or `'closed'`; it extends along Z and rises in 0.8 seconds. The full passage stays blocked for players, carried blocks and slimes until it finishes rising. Shore openings are derived from bridge footprints, so river definitions do not contain hand-authored openings. Pause freezes progress. Restart restores every authored state, visited zone and rule.

### Reversible dry-land gates

Add a gate in `objects`, linked to a plate or another existing condition:

```ts
{ type: 'plate', id: 'gate-plate', symbol: 'sun', x: -6, z: 4, mode: 'temporary' },
{ type: 'gate', id: 'gate', x: 0, z: 0, width: 5,
  openWhen: { type: 'plateActive', target: 'gate-plate' } }
```

`width` is the clear opening in world units (minimum 3.2). Optional `rotation` is yaw in degrees; zero spans X, with passage along Z. Gates start closed and continuously follow `openWhen`, including `all`/`any` groups, using the same snapshot as the one-shot rules. The wooden grille lowers into the ground over 0.6 gameplay seconds and reverses smoothly when the condition changes. Its posts stay solid and the passage stays blocked until fully open. Closing waits while the player, any resting or held block, or a living slime overlaps the opening, then enables collision before raising the grille. Pause freezes gates; restart restores their closed state. Enclose the protected area with solid scenery so the gate cannot be bypassed; keep room for the player's fixed carrying offset.

### Floating platforms and open water

These three object types work together on river terrain:

- `{ type: 'water', minX, maxX, minZ, maxZ }` in `scenery` marks where the river's water is a hazard. Inside it, any point the terrain draws as water, and that no enabled walk surface covers, splashes a player who steps there. The player loses a heart, falls for 0.7 gameplay seconds and respawns on the last dry footing that was not a moving platform. A splash on the last heart ends the run once the fall finishes. Water keeps ground height 0, so walking off an edge is allowed. Slimes never enter water, damage shoves never push into it, and an unlocked block whose centre ends up over it resurfaces on its most recent clear dry spot (or its start).
- `{ type: 'pier', x, z, width, depth }` in `scenery` is a static wooden walk surface at meadow height. Its floor reaches 0.15 units past the planks so a docked platform meets it without a gap, and its footprint opens the river shore. Mooring posts stand in the water beside its long sides, so dock platforms at its short ends.
- `{ type: 'platform', id, x, z, width, depth, travel: { x, z }, duration, dwell, phase, state }` in `objects` is a floating stone. It drifts between `(x, z)` and `(x, z) + travel`, taking `duration` seconds each way and resting `dwell` seconds at each end. `phase` offsets its clock in seconds. `width` and `depth` must be at least 3.2 so the player fits beside a carried block. A `'dormant'` platform rests sunk and cannot be walked on. `activatePlatform` raises it over 0.8 seconds, then its clock starts.

A platform carries whatever rests on it: the player, released blocks and living slimes. A held block always follows the player. Pause freezes platforms and splashes; restart restores dormant states, clocks, blocks and hearts.

Definitions are validated before creating scene resources. Errors identify the level and invalid field, including missing/wrong references, duplicate IDs, nonfinite dimensions and empty condition groups. Validation does not prove puzzle solvability; play every transport route. `window.meadow` and `#diagnostics` expose object IDs, plate/gate/portal/bridge states, visited zones, activated rules and completion.

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

`src/levels/meadow.ts`, `src/levels/sun-moon.ts`, `src/levels/twin-bridges.ts`, `src/levels/sun-gate.ts`, `src/levels/drifting-stones.ts`, and `src/levels/lantern-lake.ts` configure the six adventure areas. `createAdventureArea` constructs them through `SceneBuilder`, then hands them to `AdventureGame`, which owns input, combat, the puzzle, the HUD and win/loss state. The journey owns progression and queues area changes until the running update has returned; it destroys the previous area before creating the next.

### Select a scene

Registered levels are exposed automatically in `src/scenes/index.ts`. The default `SCENE` in `src/main.ts` opens the saved adventure checkpoint; changing it to another ID overrides startup for inspection. In development, use `shrines.load('sun-moon')` or `?level=2` (its 1-based position among `levelDefinitions`' keys) to inspect another area, and `shrines.unload()` to check teardown. These inspection routes leave player saves untouched and omit the replay selector. Add `?debug=true` to walk at twice the normal speed (`PLAYER.debugSpeedScale`). URL overrides are ignored in production. `window.meadow` and the hidden `#diagnostics` output describe the active adventure area, including stage, remaining hearts, each block's symbol and lock state, activated plates, and camera position.
