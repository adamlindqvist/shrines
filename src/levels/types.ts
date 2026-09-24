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
export type ChestDefinition = Placement & { type: 'chest'; id: string; y?: number; locked: boolean; reach?: number };
export type EnemyDefinition = Point & { type: 'slime'; id: string };
export type BridgeDefinition = Point & { type: 'bridge'; id: string; length: number; state: 'closed' | 'open' };
export type ZoneDefinition = Bounds & { type: 'zone'; id: string; minY: number; maxY: number };
export type SceneObject =
    | (ScaledPlacement & { type: 'tree' | 'bush' | 'log' | 'pot' })
    | (RockOptions & { type: 'rock' })
    | (BushClusterOptions & { type: 'bushCluster' })
    | (Placement & { type: 'signpost' | 'shrineDais' })
    | BlockDefinition
    | PlateDefinition
    | ChestDefinition
    | EnemyDefinition
    | BridgeDefinition
    | ZoneDefinition;

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
    | { type: 'plateActive' | 'enemyDefeated' | 'chestReached' | 'zoneVisited'; target: string }
    | { type: 'all' | 'any'; conditions: Condition[] };
export type Action = { type: 'openBridge' | 'unlockChest'; target: string };
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
