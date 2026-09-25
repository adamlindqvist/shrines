# Project conventions and creative direction

This file applies to the whole repository. Preserve the project's identity when adding features. Intentional changes to these conventions should update this file.

- **`docs/mechanics.md`** — the detailed spec of current gameplay (levels, tuning, carrying, rules, portals, bridges, platforms, water, states, input). Read the relevant section before changing a mechanic, and update it when behavior changes.
- **`README.md`** — play instructions, installation, and the level-authoring guide.

## What we are building

Shrines is a small playable fantasy adventure: a hooded adventurer crosses five areas (Mossy Meadow → Sun & Moon Grove → Two Suns Shrine → Twin Bridges Isle → Drifting Stones), solving box-and-plate puzzles that open bridges, platforms and portals, with optional slime combat.

The intended feel is warm, playful, tactile and welcoming. Movement responds promptly, enemies communicate their intentions, and solving a small puzzle feels rewarding. Keep the gentle tone of toast and end-card text, including encouraging language after defeat.

- **A readable little world.** Rounded silhouettes, oversized character features, chunky faceted rocks, clearly recognizable interactive objects.
- **Room to play.** Broad continuous clearings with sparse perimeter decoration. Protect sightlines to the player and objectives.
- **Soft surroundings, crisp actions.** Ambient motion is slow and subtle; movement, attacks, damage and puzzle feedback are distinct and immediate.
- **Small, coherent additions.** Build on exploration, approachable combat and spatial puzzles. Match existing scale and pacing before increasing complexity.

## Stack and code style

- TypeScript (strict), ES modules, Vite, and the direct PlayCanvas Engine API (`playcanvas: ^2.22.0`; consult the installed version). The app uses `AppBase` with explicitly registered render, camera and light systems — no React, Web Components, physics engine or skeletal animation. Register additional Engine systems deliberately in `src/app/create-app.ts`.
- Follow `@playcanvas/eslint-config` and Prettier: four-space indentation, single quotes, semicolons, named exports, separate `import type` declarations, extensionless relative imports.
- Use `type` for data contracts, descriptive handle types for constructed objects, and short doc comments for public APIs and non-obvious units.
- Keep tuning in named configuration objects (`PLAYER`, `SWORD`, `SLIME`, `PUZZLE`, …). Scene-specific placement, text and settings belong in scene/level definitions.
- Preserve unrelated working-tree changes. Keep dependencies and abstractions proportional to the feature.

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

Factories construct visuals; behavior lives in gameplay controllers with explicitly wired dependencies. Extend a builder method or reusable placement helper rather than copying scene construction. New playable levels need only data plus registry entries in `src/levels/index.ts` (see README); definitions are plain JSON-compatible data with no callbacks or PlayCanvas instances, and must not inherit gameplay defaults from Meadow (use `src/levels/defaults.ts`).

## Invariants

- **Coordinates.** Ground movement uses X/Z, +Y up, +Z toward the camera; the adventurer faces +Z at zero yaw. Gameplay heading is radians (`atan2(x, z)`); Engine Euler rotations and placement yaw are degrees. Convert at the boundary.
- **Hierarchy.** Each independently placed object has a semantic root; use children and explicit pivots for visual offsets, scaling and animation. Return handles instead of searching by name during updates. Keep locomotion on the root and decorative motion on children so animation never moves collision.
- **SceneBuilder.** Use it for placement and collision registration and call `finish()` once. Batched geometry is not individually movable. Check each placement API's scale contract (rock `scale` is width in world units; others are multipliers) and verify visual size and collision footprint together.
- **Collision model.** A simple height field of static circles, walk bounds and walk surfaces, with 0.16-unit steps — no jumping or stacked floors (details in `docs/mechanics.md`). Keep it consistent; test corners, narrow gaps and puzzle routes when changing layouts.
- **Seeded generation.** Use the scene's seeded `Random`. Draw order affects all later scenery: preserve call order and the `scenery`/`objects` list order, or introduce a separate seeded stream for new systems.
- **One frame loop.** Scene factories receive `AppContext` and return `update(dt)`, `resize()` and `destroy()`; `SceneHost` forwards them. Never add independent frame loops or wall-clock timers for simulation or animation.
- **Timestep.** Frame time is seconds; gameplay clamps `rawDt` to 0.035. Use frame-rate-independent easing such as `1 - Math.exp(-rate * dt)`. Gameplay advances only while `playing`. If adding input buffering, hit-stop or slow motion, define which clocks are affected.
- **Update order.** `AdventureGame` coordinates movement, constraints, collision, animation, combat, enemies, puzzle, rules, ambience and camera in a deliberate order; preserve it when adding systems. Area changes are queued until the active update returns.
- **Ownership and teardown.** Scenes own their root, listeners, HUD, effects, camera post-processing and resources (materials/textures via `SceneResources`). Teardown order: diagnostics, gameplay, camera frame, scene root, tracked resources.
- **Reset.** Every new subsystem must reset timers, transforms, visibility, health/state, hit tracking, effects and HUD feedback. Restarting during or after an action must not retain its pose or state.
- **Input.** Use the existing `Input` owner; resume/restart behavior is centralized in `AdventureGame`.
- **PWA.** `vite-plugin-pwa` precaches the whole game. Never force reloads during play; keep icons in `public/` and HUD safe-area insets; verify offline reopening against a production preview when changing PWA behavior.

## Visual direction

- Trees and rocks come from `src/assets/low_poly_nature_free.glb` (calibration in `src/rendering/nature-tuning.ts`, credit in `public/asset-credits.txt`); every SceneBuilder requires loaded NatureModels. Everything else is procedural. Introducing more imported art is a deliberate pipeline change.
- Use `src/rendering/palette.ts`: clover greens, warm bark and stone, turquoise, sunshine gold, warm ivory, strawberry pink. Preserve the relative prominence of hero, puzzle objects and enemies; props must read at gameplay camera distance.
- Start scenes from `CameraRig` and `MEADOW_LIGHTING`. All levels use `ADVENTURE_VIEW` (orthographic half-height ≥ 10, visible half-width ≥ 12; narrow viewports zoom out, same zoom in every level). Keep effects and lighting subordinate to readability; no routine camera shake or large flashes.
- The HUD uses rounded cream panels, soft shadows, rounded typography and short friendly copy, driven by game state and separate from the 3D hierarchy. Noninteractive overlays pass pointer input to the canvas.

## Animation and game feel

Animation is procedural and state-driven; there are no authored clips.

- **Make actions readable.** Attacks have anticipation, an active moment and recovery. Respond to input immediately. New enemy attacks need a visible warning and a chance to evade.
- **Share timing between visuals and rules.** Hit windows, poses, trails and reactions come from the same action state — never an unrelated timeout.
- **Animate from a rest pose.** Store base transforms and compute bounded offsets; never accumulate bob, squash or rotation per frame.
- **Keep motion soft but controlled.** Modest squash/stretch, rounded arcs, eased settling. Avoid making every object bounce with the same phase or amplitude.
- **Define competing states.** Decide which animation owns each transform when moving, attacking, hurt, dying or celebrating.
- **Layered, brief feedback.** Pose change + small effect + HUD feedback for meaningful events; shared materials; remove effects promptly.
- **Comfortable camera.** Gentle follow, stable framing; any shake is brief, small and optional.
- **Visible rewards.** Puzzle steps need a clear before/after state; verify decoration or collision cannot trap required objects.
- **If adding animation clips**, inspect hierarchy, bounds, facing, joints and clip names first; keep a stable gameplay root and integrate with the existing update lifecycle.

## Validation

Use Node matching `package.json` (>=22.23.2). For code changes run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`. `npm run fmt` checks formatting; format only relevant files. Tests run in Node with stubbed rendering and do not verify visuals or feel.

For gameplay or rendering changes, run `npm run dev` and verify in the browser:

- Movement, diagonals, stopping, attacks, enemy warnings/reactions and obstacle contact.
- The full puzzle/portal path after layout or puzzle changes; damage, defeat, victory and restart after state changes.
- Pause/resume, focus loss and repeated actions (stuck input, stale poses, accumulating effects).
- Framing, occlusion and HUD overlap at wide and narrow viewports.
- Scene cleanup via `shrines.load('<level-id>')` and `shrines.unload()`; `window.meadow` and `#diagnostics` expose live state.
- Draw calls and frame rate (target > 60 FPS). Keep static batching, shared materials, restrained effects and the `RENDER` pixel-ratio range in `src/app/create-app.ts` unless a measured change justifies it.

For visual refactors, compare the same seeded scene, camera, viewport and state before and after. `.dream-loop/` holds ignored local references; don't depend on it. Report which checks actually ran and any limitations.
