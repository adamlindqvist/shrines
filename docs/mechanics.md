# Gameplay mechanics

The detailed behavior spec for the current game. Source constants remain authoritative; update this file when a mechanic intentionally changes. Project conventions live in `AGENTS.md`; level authoring lives in `README.md`.

## The journey

Shrines opens **Mossy Meadow**, a small clearing with a hooded adventurer, two strawberry slimes, a grabbable turquoise block, a sun switch and a dormant portal plinth. Solving the puzzle raises a turquoise portal leading to:

1. **Sun & Moon Grove** — a 40 × 30 world with four slimes and two symbol-marked blocks and plates. Both matches open its portal.
2. **Two Suns Shrine** — a river island where two sun blocks are carried over a stone bridge onto two sun plates beside a raised shrine.
3. **Twin Bridges Isle** — two rivers split the island into three banks. Each box-and-plate trigger raises the next bridge; a sun block carried to the shrine plate opens the portal.
4. **Drifting Stones** — a moon plate wakes two floating stones that drift sideways out of step across a wide river between piers and a mid-river pad. The sun block must ride both to reach the shrine plate and open its portal.
5. **Lantern Lake** (final) — the shrine stands on a lake islet and wants a moon block. A sun block on the west lantern wakes a ferry stone in the east bay; a second sun block, hidden in the north-west grove, must ride it to the east lantern. Both lanterns together raise the lake bridge, and the moon block from the far shore rides back across to the shrine plate to open the last portal.

Defeating slimes is optional. Remaining hearts carry over between areas. Restarting after a defeat retries the current area with full hearts; restarting after victory returns to the first area with three hearts.

## Tuning baseline

| Action         | Current baseline                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Movement       | Normalized eight-way input, 7.5 units/s, exponential smoothing rate 14.                                         |
| Sword          | 0.30 s swing/cooldown: 0.05 s anticipation, 0.12 s active slash, 0.13 s recovery; one hit per enemy per swing.  |
| Slime attack   | 0.45 s visible windup, followed by a hit or miss cooldown.                                                      |
| Slime reaction | Squash, knockback, stagger, and a 0.45 s death animation.                                                       |
| Player damage  | Health feedback, a short shove and burst, and flashing during 1.2 s of invulnerability.                         |
| Puzzle         | Block snaps within 0.55 units; switch changes material, portal rises, and toast/effect feedback marks progress. |

## Animation

Animation is procedural and driven by game state; there are no authored clips.

- **Player stride** is distance-driven, using actual post-collision X/Z displacement (excluding damage shoves and teleports), with alternating foot arcs and direction-aware steps while carrying. The hero rises at most 0.035 world units per footstep (60% while carrying), without side-to-side body roll. Cloth and arms use layered pivots.
- **Sword** captures heading at swing start. Its upper-body pose compensates for subsequent player turning during the active slash and blends back during recovery. The slash effect fires once on entry to the active phase.
- **Slimes** hop and squash.
- **Dust**: movement kicks up overlapping, varied-size warm-white billows with soft scalloped edges at irregular intervals around ground-level foot contacts along resolved travel, including while carrying. Dust renders over world geometry so plates and raised props cannot hide it. Puffs expand and fade over 0.7 gameplay seconds, freeze on pause, and clear on reset or scene teardown.

## Collision and ground height

- Collision uses static circles and rectangular walk bounds, with separate grabbed-block movement logic. Dynamic collision blockers are shared by the player, carried boxes and enemies.
- SceneBuilder registers horizontal walk surfaces; the highest surface at X/Z supplies ground height (default 0). Player, carried blocks, slimes and effects use this height.
- Steps up to 0.16 units are traversable in both directions; larger height changes are blocked. There is no jumping or stacked floors; the only fall is a splash into open water.
- Walk surfaces may be disabled (`enabled: false`) and moved at runtime; moving platforms own one each.
- The shrine has walkable front stairs and solid side/back rims; its portal requires reaching the raised floor. Portals register no collision so the player can walk in.

## Carrying blocks

- Puzzles use arrays of uniquely symbol-marked blocks and plates (`sun` / `moon`). A correct match snaps and locks the box; a wrong match stays movable.
- Only one box can be held; nearest wins, with array order resolving ties. Other boxes constrain both the player and held box, including damage shoves.
- Grabbing turns the player to face the block and locks facing until release. The pair translates rigidly, preserving the pickup offset: input strafes rather than turns, and the held box never rotates around the player. There is no swivel or orbit fallback; whichever of the player or box is blocked stops that axis of the pair, so diagonal input slides along walls.
- Movement uses collision substeps of at most 0.05 world units, resolving X then Z.
- Damage still applies while grabbing, but knockback is suppressed to preserve spacing.
- The visual child eases up by 0.28 units while held, with a subtle bob and sandy grains on lift and landing. This presentation freezes on pause and settles after end states. Pause retains the grip; switch activation, end states and reset release it.

## Level rules

- `BlockPuzzle` owns carrying and plate matching only. Portal, bridge and platform controllers own their independent states.
- `LevelRules` evaluates `plateActive`, `enemyDefeated`, `portalReached` and `zoneVisited`, combined with nonempty `all`/`any`. Rules read one snapshot after combat and object updates, fire once in definition order, and perform idempotent `openBridge`/`openPortal`/`activatePlatform` actions. Their consequences are observed next frame.
- Completion is an explicit condition; reaching a portal never implicitly finishes a level. Zone visits include height and persist until reset. Generic plate feedback must not assume a portal was opened.

## Portals

Closed portals show only their sandstone plinth. Opened portals rumble, climb out of the plinth, land with a squash and bloom their swirl over 1.1 gameplay seconds, then spin down to a slow turn. They count as reached only once fully risen.

## Bridges

Bridges are Z-aligned and permanently open once activated. Closed bridges rise from 2.4 units below their authored position over 0.8 gameplay seconds; their whole passage is blocked until fully open. River shore openings derive from bridge footprints.

## Platforms and water

- Platforms (`PlatformController`, `src/gameplay/platforms.ts`) drift between two ends with a smoothstep glide and a dwell at each end, on a gameplay clock offset by `phase`.
- Dormant platforms rest 2.4 units down with their surface disabled until `activatePlatform` raises them over 0.8 seconds.
- `AdventureGame` moves platforms before player input and carries whatever rested on them before the move: the player (a held box follows the player), unlocked resting boxes and living slimes.
- Piers are static walk surfaces that overlap a docked platform by 0.15 units and open the shore.
- `water` regions combine with the river's own field in `Collision.isWater`. Water keeps height 0, so the step rule allows walking off an edge, and the player then splashes.
- A splash costs a heart even during invulnerability, blocks input and attacks while the player falls for `WATER.sinkTime`, and respawns them with the normal invulnerability at the last dry position that was not on a platform. A lethal splash ends the run after the fall.
- An unlocked box whose centre ends up over water is released and, like the player, drops `PUZZLE.sinkDepth` over `PUZZLE.sinkTime` with a splash as it passes the surface; it cannot be grabbed, pushed against or matched meanwhile. It then resurfaces, flickering for `PUZZLE.respawnFlicker` seconds, on the newest point of its recent trail of dry, off-platform positions that is still dry and clear of the player, other boxes and obstacles; with none, it returns to its start. Reset clears the trail and any flicker. Slimes treat water as blocked, and damage shoves refuse it.

## States, pause and reset

- States are `title`, `playing`, `paused`, `won`, `over`, and the transient `complete` state used while an area change is queued. Lethal damage takes precedence over puzzle completion in the same frame.
- The journey's opening area starts in `title` when the journey defines a `title` card: the area is built but frozen behind the splash. Its button or any key except Escape starts play; that key does nothing else (Space does not swing). Blur, pointer and R are ignored. Area changes and restarts skip the splash.
- Gameplay time and ambient animation advance only while playing. Effects freeze while paused but finish after victory or defeat.
- Pause freezes rules, portals, bridges, platforms and splashes.
- Reset restores locks, bridge positions/collision, platform states and clocks, zone visits and fired rules; clears any splash; and moves the respawn point back to spawn.

## Input

Controls are WASD/arrows, Space/canvas click to attack (or grab a nearby block / release the held block), and Escape to toggle pause. Touch devices get an on-screen joystick (bottom-left) and attack button (bottom-right) from `src/ui/touch-controls.ts`; `Input` merges the stick with the keyboard and releases it whenever held input is cleared. Blur clears held keys and pauses. Resume and restart behavior is centralized in `AdventureGame`.
