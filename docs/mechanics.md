# Gameplay mechanics

The detailed behavior spec for the current game. Source constants remain authoritative; update this file when a mechanic intentionally changes. Project conventions live in `AGENTS.md`; level authoring lives in `README.md`.

## The journey

Shrines opens **Mossy Meadow**, a small clearing with a hooded adventurer, two strawberry slimes, a grabbable turquoise block, a sun switch and a dormant portal plinth. Solving the puzzle raises a sandstone portal leading to:

1. **Sun & Moon Grove** — a 40 × 30 world with four slimes and two symbol-marked blocks and plates. Both matches open its portal.
2. **Solgrinden** — a 40 × 36 dry grass island with a starting glade, a crescent rock chamber reached through a five-unit-wide gate rotated 35°, and an eastern shrine court. The moon sits behind an inner rock ridge with a broad bend around its eastern tip. Two optional slimes wander in a south-east side glade, away from the required transport route. The sun block starts in a separate eastern glade, out of the starting view; it must first be found and carried west. A sun block snapped onto its temporary plate keeps the only gate open; the enclosed moon block must be carried out along the sandy trail to the permanent moon plate in the shrine court. The two permanent plates stand together below the portal stairs. This readies the permanent sun plate, and the sun block must then be moved off the temporary plate onto it. Both permanent matches open the portal.
3. **Drifting Stones** — a moon plate wakes two floating stones that drift sideways out of step across a wide river between piers and a mid-river pad. The sun block must ride both to reach the shrine plate and open its portal.
4. **Lantern Lake** — a compact 36 × 36 lakeside meadow with two rock-enclosed courts and no moving platforms, piers or bridge transport. The sun starts in the shared southern glade and the moon in the west court. The east court is 15 × 15.5 units, with a broad central carrying lane, four units of depth between its temporary sun holder and permanent lanterns, and an open approach to the shrine steps. The temporary sun plate outside the west court opens its only gate so the moon can be retrieved. The temporary moon plate outside the east court opens its gate; move the sun from the west plate to the temporary sun plate inside the east court to take over pressure. The moon can then be carried inside to its permanent lantern plate. The east gate continuously follows `any` of the outside temporary moon plate, inside temporary sun plate and permanent moon lantern, so it remains open once the moon locks. This readies the adjacent permanent sun lantern (`requiresPlate: moon-lantern`, `showDependency: true`); moving the sun from its temporary plate to the final lantern opens the shrine portal when both permanent plates are matched. Toasts confirm changes without spelling out the next move. The three temporary plates remain reusable; the existing occupied-passage safety rule permits clever alternate solutions. Two slimes occupy optional side clearings away from the puzzle paths.

5. **Återvägens glänta** (final, `returning-glade`) — a 44 × 44 meadow divided by a protected river, with a gated land crossing in the west and a dormant permanent bridge in the east. Put the sun on the temporary court plate to retrieve the moon from the south-west enclosure. Carry the moon around the resting sun to its temporary crossing plate at (−2, 7), in an open clearing east of the court wall with room to approach from all sides and a sandy trail to the river gate, then bring the sun through the river gate to the northern bridge plate at (14, −8). Both temporary plates together raise the bridge once; it stays up when either stone is removed. Retrieve the moon using the new bridge after the western gate closes, and lock it onto the permanent shrine plate. This readies the permanent sun plate (`requiresPlate: shrine-moon`, `showDependency: true`); retrieve the sun to open the final portal. The sun bridge plate stands beside the bridge approach so the resting stone does not block transport. Removing either temporary stone first remains recoverable via the bridge. No moving platforms or open-water regions are added; river shores and bridge curbs protect the route. Two optional slimes stay in side glades.

Defeating slimes is optional. Remaining hearts carry over between areas. Restarting after a defeat retries the current area with full hearts; restarting after victory returns to the first area with three hearts.

### Saved progress and replay

- The normal adventure saves a level checkpoint in this browser's `localStorage` (`shrines.progress.v1`). Completing an area by reaching its open portal marks it completed and unlocks the next area immediately. For example, completing Sun & Moon Grove saves Solgrinden as the checkpoint. Final victory marks Återvägens glänta completed and keeps it as the checkpoint.
- Refreshing or reopening starts the furthest reached area at its authored spawn with full hearts, fresh puzzles and enemies, behind a title card offering **Fortsätt äventyret**. Positions, hearts and partial puzzle progress are not saved. Normal portal transitions still carry remaining hearts.
- **Välj område** on the title and end cards, and **Områden** in the HUD, open the area selector. It lists the six areas in journey order with completed, current, checkpoint and locked states. Earlier areas and the checkpoint are selectable; later areas stay locked. Selecting any area, including the current one, starts it fresh with full hearts and skips the title.
- Replaying earlier areas follows the normal portal sequence. Replays, defeat retries and **Spela igen** after final victory retain every unlock and never move the saved checkpoint backwards. Refresh during a replay still resumes the furthest reached area.
- The selector freezes gameplay, ambient motion, effects and action poses, clears held keyboard/touch input and blocks the canvas. Closing it or pressing Escape restores the previous title, playing, paused, victory or defeat screen. Keyboard navigation and button activation belong to the dialog, not gameplay.
- Version-1 saves with Lantern Lake as both checkpoint and completed area advance to Återvägens glänta when it follows in the journey. Earlier completions are retained; the new area is unlocked but not completed. Unfinished Lantern Lake saves remain there.
- Missing, corrupt, unsupported or obsolete saves fall back to Meadow. Checkpoints for the removed Twin Bridges Isle resume in Solgrinden, preserving earlier completions. Unknown completed IDs are ignored. If browser storage is denied or full, the game remains playable and retains progress for the current session.
- Development startup overrides (`?level=N`, a non-default `SCENE`, and `shrines.load(...)`) neither read player progress to choose the area nor write it, and do not show the selector.
- In the default development adventure, the selector allows every journey area for testing, regardless of saved unlocks. Selecting an area does not change saved progress; production keeps the normal unlock restrictions.

## Tuning baseline

| Action         | Current baseline                                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Movement       | Normalized eight-way input, 8 units/s, exponential smoothing rate 14.                                                                                                                                   |
| Sword          | 0.30 s swing/cooldown: 0.05 s anticipation, 0.12 s active slash, 0.13 s recovery; one hit per enemy per swing.                                                                                          |
| Slime attack   | 0.45 s visible windup, followed by a hit or miss cooldown.                                                                                                                                              |
| Slime reaction | Squash, knockback, stagger, and a 0.45 s death animation.                                                                                                                                               |
| Player damage  | Health feedback, a short shove and burst, and flashing during 1.2 s of invulnerability.                                                                                                                 |
| Puzzle         | Block snaps within 1.0 unit (1.3 while the player stands on the plate, who is then eased out of the box at 6 units/s); switch changes material, portal rises, and toast/effect feedback marks progress. |

## Shield

Hold either Shift key, the right mouse button, or the touch 🛡️ button to guard. The shield protects a 160° cone centred on the hero's facing at the moment the slime strike lands. Side/rear strikes still hurt; overlapping attackers with no direction are not blocked. There is no stamina or perfect-timing requirement.

Guard locks facing and halves walking speed, allowing backward and sideways steps. Release to turn normally. A sword swing completes before a held shield rises. Guard prevents sword attacks and grabbing; carrying prevents guard, but the interaction button still releases a held block. Water cannot be blocked.

A blocked strike costs no heart and grants no damage invulnerability. It uses the slime's normal hit recovery (1.5 s), a collision-constrained 0.12-unit shove that refuses water, a 0.18 s shield recoil, fourteen short-lived ivory/gold particles flying outward from the raised shield surface and “Bra blockerat!” feedback. A translucent warm-gold curved barrier outlines the protected cone in front of the hero while guarding; its rim briefly expands on impact. It adds two draw calls only while guarding and uses shared scene-owned materials. The game remains silent. The shield pose, barrier and recoil use gameplay time, freeze on pause and reset with the scene. Pause/focus loss, reset, end states, pointer release/cancellation and lost capture clear held guard input; resuming requires a fresh shield press.

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

- Puzzles use arrays of uniquely symbol-marked blocks and plates (`sun` / `moon`). A correct match on a permanent plate (the default) snaps and locks the box; a wrong match stays movable. Temporary plates are octagonal wooden pads with open ivory corner brackets, distinct from square permanent plates and round turquoise portal seals. A `temporary` plate snaps a matching block without locking it, automatically releasing the block when carried over the plate. The player does not press it. Picking the block up immediately extinguishes the plate; that same plate ignores the held block until it leaves the snap radius, so it can be carried away without snapping back. Returning to the plate snaps again, and explicitly releasing while still over it also reactivates it. Moving it away or sinking removes pressure. A block can repeatedly activate temporary plates and later lock onto a permanent one. A plate may declare `requiresPlate`, the ID of a permanent plate that must already be matched before it accepts a block; before that its base and symbol are grey. Solgrinden uses this to prevent locking the sun block before the moon has been retrieved. A narrow stone inlay points from its permanent moon plate to its permanent sun plate: three grey chevrons light turquoise in order over 0.45 gameplay seconds after the moon activates, then remain lit. Sun readiness changes immediately; the lighting is explanatory only. Pause freezes the sequence and restart clears it. This visual is opt-in via `showDependency` on a plate with `requiresPlate`. Pickup transfers the plate support height into its visual lift to keep its height continuous.
- Only one box can be held; nearest wins, with array order resolving ties. Other boxes constrain both the player and held box, including damage shoves.
- Grabbing turns the player to face the block and locks facing until release. The pair translates rigidly, preserving the pickup offset: input strafes rather than turns, and the held box never rotates around the player. There is no swivel or orbit fallback; whichever of the player or box is blocked stops that axis of the pair, so diagonal input slides along walls.
- Movement uses collision substeps of at most 0.05 world units, resolving X then Z.
- Damage still applies while grabbing, but knockback is suppressed to preserve spacing.
- The visual child eases up by 0.28 units while held, with a subtle bob and sandy grains on lift and landing. This presentation freezes on pause and settles after end states. Pause retains the grip; switch activation, end states and reset release it.

## Level rules

- `BlockPuzzle` owns carrying and plate matching only. Gate, portal, bridge and platform controllers own their independent states.
- `LevelRules` evaluates `plateActive`, `enemyDefeated`, `portalReached` and `zoneVisited`, combined with nonempty `all`/`any`. Rules read one snapshot after combat and object updates, fire once in definition order, and perform idempotent `openBridge`/`openPortal`/`activatePlatform` actions. Their consequences are observed next frame. Gates evaluate their own `openWhen` condition against that same snapshot every playing frame and can open and close repeatedly; they do not use the fired-rule latch. Rules that open portals cannot depend on temporary plates, including within `all`/`any`; validation rejects such rules.
- Completion is an explicit condition; reaching a portal never implicitly finishes a level. Zone visits include height and persist until reset. Generic plate feedback must not assume a portal was opened.

Permanent pressure plates use rounded square sandstone bases and continuous ivory borders. Temporary plates use octagonal wooden faces and separated ivory corner brackets. Permanent plates have turquoise centres; both kinds carry large gold sun or moon symbols. Their activation colours remain state-driven.

## Portals

Closed portals show a low, round sandstone seal with an ivory rim, a gold sun in a turquoise inset and four small turquoise stones. The doorway is a rounded sandstone arch with ivory feet, turquoise inlays and a gold sun crest; a soft turquoise veil and two ivory curls fill the opening. Opened portals rumble, climb out of the plinth, land with a squash and bloom their swirl over 1.1 gameplay seconds, then spin down to a slow turn. They count as reached only once fully risen.

## Pressure gates

- A `gate` has an ID, X/Z position, clear `width` (at least 3.2 units), optional yaw `rotation` in degrees and `openWhen` using the existing condition syntax. It starts closed.
- Sandstone posts remain solid. The wooden grille lowers 2.15 units into the ground over 0.6 gameplay seconds, using smoothstep motion; a reversed condition reverses from the current progress. The passage blocks players, carried blocks and slimes until fully open.
- If its condition becomes false while open, the gate waits while any player, resting/held block or living slime overlaps the passage blockers. Once clear, the passage blocks immediately and the grille rises. It never damages or displaces a body.
- Gates advance after puzzle matching against the rule snapshot; movement observes their collision on the next frame. Pause freezes motion, and reset restores closed state, progress, visibility, desired state and collision. Diagnostics include `state`, `progress` and `desiredOpen`.

## Bridges

Bridges are Z-aligned and permanently open once activated. Closed bridges rise from 2.4 units below their authored position over 0.8 gameplay seconds; the water they span is blocked until fully open. On river terrain the blockers cover only the deck over or within 0.5 units of open water, so the sunk bridge's dry approaches stay walkable; curbs and pillars collide only once the bridge is open. River shore openings derive from bridge footprints.

## Platforms and water

- Platforms (`PlatformController`, `src/gameplay/platforms.ts`) drift between two ends with a smoothstep glide and a dwell at each end, on a gameplay clock offset by `phase`.
- Dormant platforms rest 2.4 units down with their surface disabled until `activatePlatform` raises them over 0.8 seconds.
- `AdventureGame` moves platforms before player input and carries whatever rested on them before the move: the player (a held box follows the player), unlocked resting boxes and living slimes.
- Piers are static walk surfaces that overlap a docked platform by 0.15 units and open the shore.
- `water` regions combine with the river's own field in `Collision.isWater`. Water keeps height 0, so the step rule allows walking off an edge, and the player then splashes.
- A splash costs a heart even during invulnerability, blocks input and attacks while the player falls for `WATER.sinkTime`, and respawns them with the normal invulnerability at the last dry position that was not on a platform. A lethal splash ends the run after the fall.
- An unlocked box whose centre ends up over water is released and, like the player, drops `PUZZLE.sinkDepth` over `PUZZLE.sinkTime` with a splash as it passes the surface; it cannot be grabbed, pushed against or matched meanwhile. It then resurfaces, flickering for `PUZZLE.respawnFlicker` seconds, on the newest point of its recent trail of dry, off-platform positions that is still dry and clear of the player, other boxes and obstacles; with none, it returns to its start. Reset clears the trail and any flicker. Slimes treat water as blocked, and damage shoves refuse it.

## States, pause and reset

- States are `title`, `playing`, `paused`, `levels` (the area selector), `won`, `over`, and the transient `complete` state used while an area change is queued. Lethal damage takes precedence over puzzle completion in the same frame.
- The journey's opening area starts in `title` when the journey defines a `title` card: the area is built but frozen behind the splash. Its start button or any key except Escape, Tab or Shift starts play; that key does nothing else (Space does not swing). Tab/Shift+Tab navigate buttons without starting play. Blur and canvas pointer input are ignored. Area changes and restarts skip the splash.
- Gameplay time and ambient animation advance only while playing. Effects freeze while paused but finish after victory or defeat.
- Pause freezes rules, portals, bridges, platforms and splashes.
- Reset restores plate pressure, locks, gate positions/collision, bridge positions/collision, platform states and clocks, zone visits and fired rules; clears any splash; and moves the respawn point back to spawn.

## Input

Controls are WASD/arrows, Space/left canvas click to attack (or grab a nearby block / release the held block), and Escape to toggle pause. Touch devices get an on-screen joystick (bottom-left) and attack and held shield buttons (bottom-right) from `src/ui/touch-controls.ts`; only the button triggers touch interactions, and canvas touch is ignored. The game surface disables text selection and touch callouts. The stick is analog: inside its dead zone (25% of knob travel) nothing moves, and past it walk speed rises linearly from 25% to full speed at the rim (`TOUCH` in that file), while facing follows the stick direction immediately. Keyboard input always walks at full speed, diagonals included. `Input` merges the stick with the keyboard and releases it whenever held input is cleared. Hold Shift or right-click to guard; touch uses the 🛡️ button. Right-click suppresses the canvas context menu. Blur clears held keys and guard and pauses. Resume and restart behavior is centralized in `AdventureGame`.
