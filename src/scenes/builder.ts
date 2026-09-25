import type { Entity } from 'playcanvas';

import type { Obstacle, WalkSurface } from '../gameplay/collision';
import { createBridgeBlockers } from '../gameplay/level-objects';
import type { BridgeHandles } from '../gameplay/level-objects';
import { createAdventurer } from '../objects/adventurer';
import type { PropContext } from '../objects/context';
import { appendBush, createBushBatch } from '../objects/foliage';
import {
    LOG_HEIGHT,
    LOG_RADIUS,
    POT_RADIUS,
    SIGNPOST_RADIUS,
    createLog,
    createPot,
    createSignpost
} from '../objects/props';
import { createPortal, createPushBlock, createSunSwitch } from '../objects/puzzle';
import type { PuzzleSymbol } from '../objects/puzzle';
import { BRIDGE, SHRINE, SHRINE_TOP, createShrineDais, createStoneBridge, shrineFront } from '../objects/shrine';
import { createSlime } from '../objects/slime';
import { meshEntity } from '../rendering/geometry';
import type { NatureModels } from '../rendering/nature-pack';
import { NATURE_COLLISION } from '../rendering/nature-tuning';
import { node } from '../rendering/primitives';
import type { Random } from '../rendering/random';

/** Where to put something on the X/Z ground plane. `rotation` is a yaw in degrees. */
export type Placement = {
    x: number;
    z: number;
    rotation?: number;
};

export type ScaledPlacement = {
    scale?: number;
} & Placement;

export type RockOptions = {
    /** Boulder width in world units. */
    scale: number;
    /** Ground height, e.g. a stepping stone sitting in sunken water. */
    y?: number;
} & Placement;

export type BushClusterOptions = {
    /** Number of bushes. */
    count?: number;
    /** Half-extent of the scatter along X; Z uses 70% of it. */
    spread?: number;
} & ScaledPlacement;

/** What a finished build hands to the scene's behaviour. */
export type SceneLayout = {
    /** Static collision circles in registration order. */
    obstacles: readonly Obstacle[];
    surfaces?: readonly WalkSurface[];
    /** Ambient motion at scene time `time` seconds. */
    animate(time: number): void;
};

/**
 * Places imported trees and rocks and procedural props into a scene root.
 * Solid props register collision; finish() uploads the shared bush batches.
 */
export class SceneBuilder {
    private readonly obstacles: Obstacle[] = [];
    private readonly surfaces: WalkSurface[] = [];
    private readonly bushes = createBushBatch();
    private finished = false;
    private readonly nature: NatureModels;

    readonly props: PropContext;
    readonly rand: Random;
    readonly root: Entity;

    constructor(props: PropContext, rand: Random, root: Entity, nature: NatureModels) {
        this.nature = nature;
        this.props = props;
        this.rand = rand;
        this.root = root;
    }

    /** Imported tree with a ring of understory bushes; `scale` 1 is about 3.6 units tall. */
    addTree({ x, z, scale: s = 1, rotation: spin = 0 }: ScaledPlacement) {
        const rand = this.rand;
        const root = this.place('tree', { x, z, rotation: spin });
        const visual = this.nature.add(root, 'tree', s);
        for (let i = 0; i < 8; i++) {
            // The ring's phase adds the yaw's degree value directly, as the meadow layout was authored.
            const a = i * 2.4 + spin;
            this.addBush({
                x: x + Math.sin(a) * (0.75 + rand() * 0.5) * s,
                z: z + Math.cos(a) * (0.7 + rand() * 0.45) * s,
                scale: (0.34 + rand() * 0.3) * s
            });
        }
        this.obstacles.push({ x, z, r: NATURE_COLLISION.treeRadius * s });
        return { entity: root, visual };
    }

    /** A single round bush, batched. Bushes are decoration and do not collide. */
    addBush({ x, z, scale = 0.7 }: ScaledPlacement) {
        this.assertOpen();
        appendBush(this.bushes, this.rand, x, z, scale);
    }

    /** A random scatter of bushes around (x, z), each `scale` to `scale + 0.3` in size. */
    addBushCluster({ x, z, count = 5, spread = 1.5, scale = 0.55, rotation = 0 }: BushClusterOptions) {
        const rand = this.rand,
            a = (rotation * Math.PI) / 180,
            c = Math.cos(a),
            s = Math.sin(a);
        for (let i = 0; i < count; i++) {
            let ox = (rand() - 0.5) * spread * 2,
                oz = (rand() - 0.5) * spread * 1.4;
            const size = scale + rand() * 0.3;
            if (rotation) [ox, oz] = [ox * c + oz * s, -ox * s + oz * c];
            this.addBush({ x: x + ox, z: z + oz, scale: size });
        }
    }

    /** Imported boulder `scale` units wide, with the authored collision footprint. */
    addRock({ x, z, scale: w, rotation = 0, y = 0 }: RockOptions) {
        this.assertOpen();
        // Reserve the former rock-variation draw to preserve all later seeded placements.
        this.rand();
        this.nature.add(this.place('rock', { x, z, rotation }, y), 'rock', w);
        this.obstacles.push({ x, z, r: NATURE_COLLISION.rockRadius * w });
    }

    /** Wooden arrow sign; `rotation` 0 faces the camera and points toward +X. */
    addSignpost(at: Placement) {
        createSignpost(this.props, this.place('wooden signpost', at));
        this.obstacles.push({ x: at.x, z: at.z, r: SIGNPOST_RADIUS });
    }

    /**
     * Stone bridge centred on (x, z) spanning `length` along Z. Its curbs and
     * pillars collide, keeping walkers and carried blocks on the deck.
     */
    addBridge({
        x,
        z,
        length,
        dynamic = false
    }: {
        x: number;
        z: number;
        length: number;
        dynamic?: boolean;
    }): BridgeHandles {
        const root = this.place('stone bridge', { x, z });
        const visual = node(root, 'bridge deck');
        createStoneBridge(this.props, visual, length);
        const blockers = dynamic ? createBridgeBlockers(x, z, length) : [];
        this.obstacles.push(...blockers);
        const curbX = BRIDGE.width / 2 - BRIDGE.parapetWidth / 2;
        // Curbs collide only between the pillars, so both ends open onto the meadow.
        const span = length - BRIDGE.pillarInset * 2;
        for (const side of [-1, 1]) {
            const steps = Math.ceil(span / 0.45);
            for (let i = 0; i <= steps; i++)
                this.obstacles.push({ x: x + side * curbX, z: z - span / 2 + (span * i) / steps, r: 0.3 });
            for (const end of [-1, 1])
                this.obstacles.push({
                    x: x + side * (BRIDGE.width / 2 - BRIDGE.pillarSize / 2 + 0.06),
                    z: z + end * (length / 2 - BRIDGE.pillarInset),
                    r: 0.52
                });
        }
        return { visual, blockers };
    }

    /** Registers a horizontal floor; adjacent small height changes form walkable stairs. */
    addWalkSurface(surface: WalkSurface) {
        this.assertOpen();
        this.surfaces.push(surface);
    }

    /** Raised floor and front stairs, with solid rims and pillars. */
    addShrineDais({ x, z }: Placement) {
        createShrineDais(this.props, this.place('shrine dais', { x, z }));
        const { width, depth, height, stepCount, stepDepth, pillarSize } = SHRINE;
        const halfSteps = (width - pillarSize * 2 - 0.2) / 2;
        this.addWalkSurface({
            minX: x - width / 2,
            maxX: x + width / 2,
            minZ: z - depth / 2,
            maxZ: z + depth / 2,
            height
        });
        this.addWalkSurface({
            minX: x - (width - 0.7) / 2,
            maxX: x + (width - 0.7) / 2,
            minZ: z - (depth - 0.7) / 2,
            maxZ: z + (depth - 0.7) / 2,
            height: SHRINE_TOP
        });
        for (let step = 0; step < stepCount; step++) {
            this.addWalkSurface({
                minX: x - halfSteps,
                maxX: x + halfSteps,
                minZ: z + depth / 2 + stepDepth * step,
                maxZ: z + depth / 2 + stepDepth * (step + 1),
                height: (height * (stepCount - step)) / (stepCount + 1)
            });
        }
        // Keep the sides/back solid, leaving the stair opening free.
        const r = 0.17;
        for (let px = -width / 2 + r; px <= width / 2 - r; px += 0.2) this.addObstacle(x + px, z - depth / 2 + r, r);
        for (const side of [-1, 1]) {
            for (let pz = -depth / 2 + r; pz <= depth / 2; pz += 0.2)
                this.addObstacle(x + side * (width / 2 - r), z + pz, r);
            for (const end of [-1, 1])
                this.addObstacle(
                    x + side * (width / 2 - pillarSize / 2),
                    z + end * (depth / 2 - pillarSize / 2),
                    pillarSize * 0.65
                );
            for (let pz = depth / 2; pz <= shrineFront(); pz += 0.15)
                this.addObstacle(x + side * (halfSteps + r), z + pz, r);
        }
    }

    addPot({ x, z, scale = 1, rotation }: ScaledPlacement) {
        createPot(this.props, this.place('clay pot', { x, z, rotation }), scale);
        this.obstacles.push({ x, z, r: POT_RADIUS });
    }

    /** Fallen log lying along its local X axis; `rotation` turns it on the ground. */
    addLog({ x, z, scale = 1, rotation }: ScaledPlacement) {
        const root = this.place('fallen log', { x, z, rotation }, LOG_HEIGHT * scale);
        if (scale !== 1) root.setLocalScale(scale, scale, scale);
        createLog(this.props, root);
        this.obstacles.push({ x, z, r: LOG_RADIUS * scale });
    }

    addAdventurer(at: Placement) {
        return createAdventurer(this.props, this.place('little adventurer', at));
    }

    addSlime(at: Placement) {
        return createSlime(this.props, this.place('strawberry slime', at));
    }

    addPushBlock(at: Placement, symbol: PuzzleSymbol = 'sun') {
        return createPushBlock(this.props, this.place(`${symbol} block`, at), symbol);
    }

    addSunSwitch({ x, z, rotation = 38 }: Placement, symbol: PuzzleSymbol = 'sun') {
        return createSunSwitch(this.props, this.place(`${symbol} plate`, { x, z, rotation }), rotation, symbol);
    }

    /** Walk-in portal without collision; `y` lifts it onto a plinth such as the shrine dais. */
    addPortal(at: Placement & { y?: number }) {
        return createPortal(this.props, this.place('shrine portal', at, at.y));
    }

    /** Registers an extra collision circle, for scene-specific solids. */
    addObstacle(x: number, z: number, r: number) {
        this.obstacles.push({ x, z, r });
    }

    /** Uploads the bush batches. Call once, after the last prop is placed. */
    finish(): SceneLayout {
        this.assertOpen();
        this.finished = true;
        const { device, palette } = this.props;
        const batches = [
            [this.bushes.light, palette.leafLight, 'sunlit bushes'],
            [this.bushes.mid, palette.leaf, 'round bushes'],
            [this.bushes.dark, palette.leafDark, 'shaded bushes']
        ] as const;
        for (const [g, material, name] of batches) if (g.i.length) meshEntity(device, this.root, name, g, material);
        return {
            obstacles: this.obstacles,
            surfaces: this.surfaces,
            animate: () => undefined
        };
    }

    private place(name: string, { x, z, rotation = 0 }: Placement, y = 0) {
        this.assertOpen();
        const e = node(this.root, name, x, y, z);
        if (rotation) e.setLocalEulerAngles(0, rotation, 0);
        return e;
    }

    private assertOpen() {
        if (this.finished) throw new Error('SceneBuilder: props must be added before finish()');
    }
}
