# Project conventions and creative direction

This file applies to the whole repository. Preserve the project's identity when adding features. The architecture and baseline values below describe the current implementation; the future-development guidance defines how additions should fit it. Intentional changes to these conventions should update this file and the relevant README guidance.

## What we are building

Shrines currently opens **Mossy Meadow**, a small playable fantasy clearing: a hooded adventurer, two strawberry slimes, a grabbable turquoise block, a sun switch, and a dormant portal plinth. Solving the puzzle raises a turquoise portal; walking into it transports the player to **Sun & Moon Grove**, a 40 × 30 world with four slimes and two symbol-marked blocks and plates. Both matches open its portal, which transports the player to **Two Suns Shrine**: a river island where two sun blocks must be carried over a stone bridge onto two sun plates beside a raised shrine. Its portal transports the player to **Twin Bridges Isle**, where two rivers split the island into three banks: each box-and-plate trigger raises the next bridge, and a final sun block carried to the shrine plate opens the last portal. Defeating slimes is optional. Remaining hearts carry over. Restarting after defeat or victory returns to the first area with three hearts.

The intended feel is warm, playful, tactile, and welcoming. Movement should respond promptly, enemies should communicate their intentions, and solving a small puzzle should feel rewarding. Keep the gentle tone of the existing toast and end-card text, including encouraging language after defeat.

Preserve these design priorities:

- **A readable little world.** Rounded silhouettes, oversized character features, chunky faceted rocks, and clearly recognizable interactive objects.
- **Room to play.** The meadow has a broad continuous clearing with sparse perimeter decoration. Leave space to navigate, dodge, fight, and push the block; protect sightlines to the player and objectives.
- **Soft surroundings, crisp actions.** Ambient motion is slow and subtle. Movement, attacks, damage, and puzzle feedback are distinct and immediate.
- **Small, coherent additions.** New mechanics should build on exploration, approachable combat, and spatial puzzles. Match the existing scale and pacing before increasing complexity.

## Stack and code style

- Use TypeScript with strict checking, ES modules, Vite, and the direct PlayCanvas Engine API. The dependency is currently `playcanvas: ^2.22.0`; consult the installed version when using Engine APIs.
- The app uses `AppBase` with explicitly registered render, camera, and light systems. It does not currently use React, Web Components, a physics engine, or a skeletal animation system. Additional Engine systems must be registered deliberately in `src/app/create-app.ts` when needed.
- Follow `@playcanvas/eslint-config` and the shared Prettier configuration. Existing TypeScript uses four-space indentation, single quotes, semicolons, named exports, separate `import type` declarations, and extensionless relative imports.
- Use `type` for data contracts, descriptive handle types for constructed objects, and short documentation comments for public APIs and non-obvious units or assumptions.
- Keep tuning in named configuration objects such as `PLAYER`, `SWORD`, `SLIME`, and `PUZZLE`. Scene-specific placement, text, and settings belong in scene configuration.
- Preserve unrelated working-tree changes. Keep new dependencies and abstractions proportional to the feature.

## Where code belongs

| Location                         | Responsibility                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/main.ts`                    | Select the initial scene and start the application.                                        |
| `src/app/`                       | Shared application services and the single active scene host.                              |
| `src/rendering/`                 | Procedural geometry, primitives, textures, seeded random, palette, and resource ownership. |
| `src/objects/`                   | Visual factories that receive dependencies and return entities or typed handles.           |
| `src/levels/`                    | JSON-compatible scene/level definitions, defaults, validation and journey registry.        |
| `src/scenes/`                    | Terrain, composition, reusable placement groups, camera/lighting, and scene configuration. |
| `src/gameplay/`                  | Input, movement, collision, combat, enemies, puzzle rules, effects, and game coordination. |
| `src/ui/hud.ts`, `src/style.css` | State-driven DOM HUD and its presentation.                                                 |

Keep factories focused on constructing visuals. Put behavior in gameplay controllers and wire dependencies explicitly. Prefer extending a builder method or creating a reusable placement helper over copying scene construction. Register playable scene and level data in `src/levels/index.ts`; `src/scenes/index.ts` derives their factories automatically. Choose the startup level in `src/main.ts`.

## Scene construction, coordinates, and ownership

- Ground movement uses X/Z, with +Y up and +Z toward the meadow camera. The adventurer model faces +Z at zero yaw. Gameplay heading is in radians (`atan2(x, z)`); Engine Euler rotations and placement yaw are in degrees. Convert at the boundary.
- Give each independently placed object a semantic root. Use children and explicit pivots for visual offsets, scaling, and animation. Return handles instead of searching the hierarchy by name during updates.
- Use `SceneBuilder` for placement and collision registration. Call `finish()` once after construction; it uploads shared bush meshes and returns obstacles and ambient animation. Batched geometry cannot be treated as individually movable entities.
- Read each placement API's scale contract: rock `scale` is width in world units, while other factories may use a multiplier. Verify visual size and collision footprint together, especially when introducing scaled props.
- Collision uses static circles and rectangular walk bounds, with separate grabbed-block movement logic. SceneBuilder registers horizontal walk surfaces; the highest surface at X/Z supplies ground height (default 0). Player, carried blocks, slimes, and effects use this height. Steps up to 0.16 units are traversable in both directions; larger height changes are blocked. The shrine has walkable front stairs and solid side/back rims; its portal requires reaching the raised floor. Portals register no collision so the player can walk in. This is a height field, without jumping, falling, or stacked floors. Keep this simple model consistent; test corners, narrow gaps, and puzzle routes when changing layouts.
- Use the scene's seeded `Random` for procedural generation. Generation order affects every later draw from the sequence; adding an early random draw can change unrelated scenery. Preserve call order during visual refactors, or deliberately introduce separate seeded streams for independent new systems.
- A scene factory receives `AppContext` and returns `update(dt)`, `resize()`, and `destroy()`. `SceneHost` owns update/resize forwarding. Do not add independent frame loops for new features.
- Scenes own their root, listeners, HUD, transient effects, camera post-processing, and allocated resources. Track scene-owned materials and textures with `SceneResources`; meshes are released with their entities. Shared application services remain alive across scene changes.
- Production builds use `vite-plugin-pwa` to generate the app manifest and precache the complete game. Updates wait until every game window closes; do not force reloads during play. Keep installation icons in `public/`, retain HUD safe-area insets, and verify offline reopening against a production preview when changing PWA behavior. The generated app icon is branding; world art remains procedural.
- Follow the meadow teardown order: remove diagnostics, destroy gameplay, destroy the camera frame, destroy the scene root, then destroy tracked resources. Every new subsystem needs a clear reset/cleanup path.

## Visual direction

All playable levels use the bundled `src/assets/low_poly_nature_free.glb` for trees and rocks, with calibration in `src/rendering/nature-tuning.ts`, scene-owned container loading, static imported trees, and attribution in `public/asset-credits.txt`. Terrain, bushes, characters, puzzle objects, and other props remain procedural. The procedural tree/rock generators and comparison levels have been removed; every SceneBuilder requires loaded NatureModels. Imported scenery preserves authored placements, collision circles, and procedural random consumption. Extend the existing primitives, geometry helpers, and palette by default; introducing imported art is a deliberate pipeline change that must still match the scene.

Use `src/rendering/palette.ts` as the shared color/material vocabulary: clover greens, warm bark and stone, turquoise, sunshine gold, warm ivory, and strawberry pink. Preserve the relative prominence of the hero, puzzle objects, and enemies. New props should be legible at the actual gameplay camera distance.

Start new scenes from `CameraRig` and `MEADOW_LIGHTING`: an elevated orthographic view, warm afternoon sun, cool fill, soft grounding shadows, restrained bloom, and ambient occlusion. The camera follows gently and adjusts its framing on resize. All playable levels use `ADVENTURE_VIEW`, with an orthographic half-height of at least 10 world units and a visible half-width of at least 12. Narrow viewports zoom out to fit that width; the same viewport gets the same zoom in every level. Larger worlds such as Sun & Moon Grove, Two Suns Shrine and Twin Bridges Isle use full X/Z following, so the whole world need not be visible at once. Keep effects and lighting subordinate to gameplay readability; avoid adding routine camera shake or large flashes as default feedback.

The HUD uses rounded cream panels, soft shadows, rounded typography, and short friendly copy. Keep it separate from the 3D hierarchy and driven by game state. Noninteractive overlays should let pointer input reach the canvas; interactive end cards own their input.

## Animation and game feel

### Current baseline

Animation is procedural and driven by game state: player bob and alternating boots, a sword pivot, slime hops and squash, a rising portal gate with a slowly turning swirl, and short-lived primitive effects. There are no authored animation clips in the current game.

Useful tuning references (the source constants remain authoritative):

| Action         | Current baseline                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Movement       | Normalized eight-way input, 4.5 units/s, exponential smoothing rate 14.                                         |
| Sword          | 0.28 s swing, 0.30 s cooldown; active while remaining swing time is 0.21–0.07 s; one hit per enemy per swing.   |
| Slime attack   | 0.45 s visible windup, followed by a hit or miss cooldown.                                                      |
| Slime reaction | Squash, knockback, stagger, and a 0.45 s death animation.                                                       |
| Player damage  | Health feedback, a short shove and burst, and flashing during 1.2 s of invulnerability.                         |
| Puzzle         | Block snaps within 0.55 units; switch changes material, portal rises, and toast/effect feedback marks progress. |

### Guidance for future features

- **Make actions readable.** Give attacks a recognizable anticipation, active moment, and recovery. Respond to input immediately, even when the damaging part has a windup. New enemy attacks need a visible warning and an opportunity to evade.
- **Share timing between visuals and rules.** Drive hit windows, weapon poses, trails, and reactions from the same action state. The current sword captures heading at swing start; account for turning during the swing so future visuals and hit direction agree. Never use an unrelated timeout to decide a hit.
- **Animate from a rest pose.** Store base transforms and calculate bounded offsets or normalized action progress. Avoid accumulating bob, squash, or rotation each frame. Keep locomotion on the root and decorative motion on visual children for new animated objects, so animation does not move collision unexpectedly.
- **Keep motion soft but controlled.** Use modest squash/stretch, rounded arcs, eased settling, and small secondary motion. Let footsteps and bob reflect movement intensity; let idle motion settle quietly. Avoid making every object bounce with the same phase or amplitude.
- **Define competing states.** Decide which animation owns each transform when moving, attacking, hurt, dying, or celebrating. Damage and death must remain readable; multiple controllers must not overwrite the same pivot unpredictably.
- **Use layered, brief feedback.** Combine pose change, a small effect, and relevant HUD feedback for meaningful events. Keep bursts near the interaction, use shared materials, and remove effects promptly. Ambient motion should remain less prominent than combat and puzzle cues.
- **Keep the camera comfortable.** Preserve gentle follow and stable framing. Any added recoil or shake should be brief, small, and optional, and must not hide telegraphs or disorient navigation.
- **Make rewards visible.** New puzzle steps need a clear before/after state and a satisfying response when solved. Preserve forgiving spatial interactions and verify that decoration or collision cannot trap required objects.
- **If adding animation clips**, inspect the model's hierarchy, bounds, facing, joints, and clip names first. Keep a stable gameplay root, register the required Engine systems, bind animation to the rendered hierarchy, and integrate clips with the existing update/state lifecycle. Do not replace procedural motion wholesale just to add one animated asset.

## Time, state, and input

`createJourneyScene` uses `JourneyDefinition` for progression and restart, and queues area changes until after the active update returns. `createAdventureArea` validates and builds a `SceneDefinition` with a separate `LevelDefinition`. Definitions are plain JSON-compatible TypeScript data, with no callbacks or PlayCanvas instances. Shared defaults live in `src/levels/defaults.ts`; levels must not inherit gameplay defaults from Meadow. `scenery` is built before the player and `objects` afterwards; preserve both list orders to retain seeded generation. Interactives have unique IDs across both lists. New playable levels require data and registry entries only; see the complete authoring example in README.

`BlockPuzzle` owns carrying and plate matching only. Portal and bridge controllers own their independent states. `LevelRules` evaluates `plateActive`, `enemyDefeated`, `portalReached` and `zoneVisited`, combined with nonempty `all`/`any`. Rules read one snapshot after combat and object updates, fire once in definition order, and perform idempotent `openBridge`/`openPortal` actions. Their consequences are observed next frame. Completion is an explicit condition; reaching a portal never implicitly finishes a level. Zone visits include height and persist until reset. Generic plate feedback must not assume a portal was opened. Closed portals show only their sandstone plinth; opened portals rise over 0.9 gameplay seconds and count as reached only once fully risen.

Bridges are Z-aligned and permanently open once activated. Closed bridges rise from 2.4 units below their authored position over 0.8 gameplay seconds; their whole passage is blocked until fully open. Dynamic collision blockers are shared by the player, carried boxes and enemies. River shore openings derive from bridge footprints. Pause freezes rules, portals and bridges; reset restores locks, bridge positions/collision, zone visits and fired rules.

`AdventureGame` coordinates movement/block constraints/collision, player animation, combat, enemies, puzzle, ambience, and camera. Preserve deliberate update order when adding systems.

- Frame time is in seconds. Gameplay currently clamps `rawDt` to 0.035; diagnostics use raw frame time. Advance durations and velocities with the gameplay timestep and use frame-rate-independent easing for new motion, such as `1 - Math.exp(-rate * dt)`.
- Current states are `playing`, `paused`, `won`, `over`, and the transient `complete` state used while an area change is queued. Lethal damage takes precedence over puzzle completion in the same frame. Gameplay time and ambient animation advance only while playing. Effects freeze while paused but finish after victory or defeat. Document any intentional new presentation behavior outside play.
- Use the existing `Input` owner. Controls are WASD/arrows, Space/canvas click to attack (or grab a nearby block / release the held block), and Escape to toggle pause. Touch devices get an on-screen joystick (bottom-left) and attack button (bottom-right) from `src/ui/touch-controls.ts`; `Input` merges the stick with the keyboard and releases it whenever held input is cleared. Blur clears held keys and pauses. Resume and restart behavior is centralized in `AdventureGame`.
- Puzzles use arrays of uniquely symbol-marked blocks and plates (`sun` / `moon`). A correct match snaps and locks the box; a wrong match stays movable. Only one box can be held; nearest wins, with array order resolving ties. Other boxes constrain both the player and held box, including damage shoves.
- Grabbing turns the player to face the block and locks facing until release. The pair translates rigidly, preserving the pickup offset: input strafes rather than turns, and the held box never rotates around the player. There is no swivel or orbit fallback; whichever of the player or box is blocked stops that axis of the pair, so diagonal input slides along walls. Movement uses collision substeps of at most 0.05 world units, resolving X then Z. Damage still applies while grabbing, but knockback is suppressed to preserve their spacing. The visual child eases up by 0.28 units while held, with a subtle bob and sandy grains on lift and landing. This presentation freezes on pause and settles after end states. Pause retains the grip; switch activation, end states, and reset release it.
- New features must reset timers, transforms, visibility, health/state, hit tracking, spawned effects, and HUD feedback as applicable. Verify restarting during or after an action does not retain its pose or state.
- Avoid wall-clock timers for simulation or independent animation loops that continue during pause. If adding input buffering, hit-stop, or slow motion, explicitly define which clocks and systems are affected.

## Validation and completion

Use Node matching `package.json` (currently >=22.23.2). For code changes, run:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Use `npm run fmt` to check formatting; format only relevant files when unrelated formatting differences exist. Documentation-only changes need a targeted formatting/content check. The Node test suite checks puzzle rules and controller state with stubbed DOM/particle rendering; it does not verify rendering or game feel.

For gameplay or rendering changes, run `npm run dev` and verify the relevant behavior in the browser:

- Check movement, diagonals, stopping, attacks, enemy warnings/reactions, and obstacle contact as applicable.
- Complete the block/switch/portal path after layout or puzzle changes. Check damage, defeat, victory, and restart after state changes.
- Check pause/resume, focus loss, and repeat actions for stuck input, stale poses, or accumulating effects.
- Inspect the scene at gameplay distance and at wide/narrow viewport sizes for framing, occlusion, HUD overlap, and consistent visual style.
- Use development hooks `shrines.load('meadow')`, `shrines.load('sun-moon')`, `shrines.load('two-suns')`, `shrines.load('twin-bridges')`, and `shrines.unload()` to verify scene cleanup when ownership changes. `window.meadow` exposes live gameplay diagnostics; the hidden `#diagnostics` output is also available.
- Watch draw calls, effects, and frame rate on representative hardware. The project targets more than 60 FPS on suitable hardware; retain static batching, shared materials, restrained effects, and the `RENDER` pixel-ratio range in `src/app/create-app.ts` (1.5× supersampling on standard screens, capped at 2×) unless a measured change justifies adjustment.

For visual refactors, compare the same seeded scene, camera, viewport, and gameplay state before and after. `.dream-loop/` contains ignored local reference/iteration artifacts when available; do not make development depend on files missing from a fresh checkout. Report which checks actually ran and any remaining limitations.
