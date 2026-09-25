import type { Bounds } from '../gameplay/collision';
import type { Point } from '../gameplay/puzzle';
import type { PuzzleSymbol } from '../objects/puzzle';
import type { BushClusterOptions, Placement, RockOptions, ScaledPlacement } from '../scenes/builder';
import type { RiverIslandOptions } from '../scenes/river-island';
import type { BackdropOptions, IslandOptions } from '../scenes/terrain';
import type { HudOptions } from '../ui/hud';

export type RGB = [number, number, number];
type Vector = [number, number, number];
export type CameraDefinition = {
    ambient: RGB;
    camera: { position: Vector; target: Vector; orthoHeight: number; minVisibleHalfWidth: number; clearColor: RGB };
    sun: { position: Vector; color: RGB; intensity: number; shadowDistance: number };
    fill: { position: Vector; color: RGB; intensity: number };
    follow?: { x: number; z: number; anchorZ: number; rate: number };
};
export type BlockDefinition = Point & { type: 'block'; id: string; symbol: PuzzleSymbol };
export type PlateDefinition = Point & { type: 'plate'; id: string; symbol: PuzzleSymbol };
export type PortalDefinition = Placement & { type: 'portal'; id: string; y?: number; locked: boolean; reach?: number };
export type EnemyDefinition = Point & { type: 'slime'; id: string };
export type BridgeDefinition = Point & { type: 'bridge'; id: string; length: number; state: 'closed' | 'open' };
export type ZoneDefinition = Bounds & { type: 'zone'; id: string; minY: number; maxY: number };
/**
 * A floating stone `width` (X) by `depth` (Z) that drifts between its (x, z) and (x, z) + `travel`.
 * Each one-way trip takes `duration` seconds, it rests `dwell` seconds at each end, and its clock
 * starts `phase` seconds into that cycle. Dormant platforms rest sunk until activated.
 */
export type PlatformDefinition = Point & {
    type: 'platform';
    id: string;
    width: number;
    depth: number;
    travel: Point;
    duration: number;
    dwell: number;
    phase: number;
    state: 'dormant' | 'active';
};
/** Static wooden walk surface over water; its footprint also opens the river shore. */
export type PierDefinition = Point & { type: 'pier'; width: number; depth: number };
/** Region where the river's open water splashes walkers who are not on a pier or platform. */
export type WaterDefinition = Bounds & { type: 'water' };
export type SceneObject =
    | (ScaledPlacement & { type: 'tree' | 'bush' | 'log' | 'pot' })
    | (RockOptions & { type: 'rock' })
    | (BushClusterOptions & { type: 'bushCluster' })
    | (Placement & { type: 'signpost' | 'shrineDais' })
    | BlockDefinition
    | PlateDefinition
    | PortalDefinition
    | EnemyDefinition
    | BridgeDefinition
    | ZoneDefinition
    | PlatformDefinition
    | PierDefinition
    | WaterDefinition;

/** Serializable authoring data; array order is also procedural generation order. */
export type SceneDefinition = {
    id: string;
    name: string;
    seed: number;
    terrain: IslandOptions | Omit<RiverIslandOptions, 'openings'>;
    backdrop: BackdropOptions;
    spawn: Point;
    walkBounds: Bounds;
    blockBounds: Bounds;
    camera: CameraDefinition;
    scenery: SceneObject[];
    objects: SceneObject[];
};
export type Condition =
    | { type: 'plateActive' | 'enemyDefeated' | 'portalReached' | 'zoneVisited'; target: string }
    | { type: 'all' | 'any'; conditions: Condition[] };
export type Action = { type: 'openBridge' | 'openPortal' | 'activatePlatform'; target: string };
export type RuleDefinition = { id: string; when: Condition; actions: Action[]; message?: string };
export type LevelText = {
    matched: string;
    paused: string;
    won: { title: string; copy: string };
    over: { title: string; copy: string };
};
export type LevelDefinition = {
    id: string;
    scene: string;
    hud: HudOptions;
    text: LevelText;
    rules: RuleDefinition[];
    completion: Condition;
};
export type JourneyDefinition = { levels: string[]; restart: string };
