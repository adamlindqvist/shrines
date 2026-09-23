import type { Entity } from 'playcanvas';

import type { Obstacle } from '../gameplay/collision';
import { createAdventurer } from '../objects/adventurer';
import type { PropContext } from '../objects/context';
import { appendBoulder, appendBush, boulderRadius, createBushBatch } from '../objects/foliage';
import { LOG_HEIGHT, LOG_RADIUS, POT_RADIUS, createLog, createPot } from '../objects/props';
import { CHEST_RADIUS, createPushBlock, createSunSwitch, createTreasureChest } from '../objects/puzzle';
import type { PuzzleSymbol } from '../objects/puzzle';
import { createSlime } from '../objects/slime';
import { createTree, treeRadius } from '../objects/tree';
import { createGeo, meshEntity, rotateAppended, vertexCount } from '../rendering/geometry';
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
    /** Icosphere subdivisions; 1 gives the chunky storybook facets. */
    detail?: number;
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
    /** Ambient motion (canopy sway) at scene time `time` seconds. */
    animate(time: number): void;
};

/**
 * Places props into a scene root. Solid props register collision, trees
 * register canopy sway, and bushes and rocks are merged into shared batches
 * that `finish()` uploads once construction is done.
 */
export class SceneBuilder {
    private readonly obstacles: Obstacle[] = [];
    private readonly canopies: Entity[] = [];
    private readonly bushes = createBushBatch();
    private readonly rocks = createGeo();
    private finished = false;

    readonly props: PropContext;
    readonly rand: Random;
    readonly root: Entity;

    constructor(props: PropContext, rand: Random, root: Entity) {
        this.props = props;
        this.rand = rand;
        this.root = root;
    }

    /** Rounded tree with a ring of understory bushes; `scale` 1 is about 3.6 units tall. */
    addTree({ x, z, scale: s = 1, rotation: spin = 0 }: ScaledPlacement) {
        const rand = this.rand;
        const handles = createTree(this.props, this.place('rounded woodland tree', { x, z, rotation: spin }), s);
        this.canopies.push(handles.canopy);
        for (let i = 0; i < 8; i++) {
            // The ring's phase adds the yaw's degree value directly, as the meadow layout was authored.
            const a = i * 2.4 + spin;
            this.addBush({
                x: x + Math.sin(a) * (0.75 + rand() * 0.5) * s,
                z: z + Math.cos(a) * (0.7 + rand() * 0.45) * s,
                scale: (0.34 + rand() * 0.3) * s
            });
        }
        this.obstacles.push({ x, z, r: treeRadius(s) });
        return handles;
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

    /** Faceted boulder `scale` units wide, batched, with collision. */
    addRock({ x, z, scale: w, rotation = 0, detail = 1 }: RockOptions) {
        this.assertOpen();
        const start = vertexCount(this.rocks);
        appendBoulder(this.rocks, this.rand, x, z, w, detail);
        rotateAppended(this.rocks, start, x, z, rotation);
        this.obstacles.push({ x, z, r: boulderRadius(w) });
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

    addChest(at: Placement) {
        const handles = createTreasureChest(this.props, this.place('sunshine treasure chest', at));
        this.obstacles.push({ x: at.x, z: at.z, r: CHEST_RADIUS });
        return handles;
    }

    /** Registers an extra collision circle, for scene-specific solids. */
    addObstacle(x: number, z: number, r: number) {
        this.obstacles.push({ x, z, r });
    }

    /** Uploads the bush and rock batches. Call once, after the last prop is placed. */
    finish(): SceneLayout {
        this.assertOpen();
        this.finished = true;
        const { device, palette } = this.props;
        const batches = [
            [this.bushes.light, palette.leafLight, 'sunlit bushes'],
            [this.bushes.mid, palette.leaf, 'round bushes'],
            [this.bushes.dark, palette.leafDark, 'shaded bushes'],
            [this.rocks, palette.stone, 'faceted boulders']
        ] as const;
        for (const [g, material, name] of batches) if (g.i.length) meshEntity(device, this.root, name, g, material);
        const canopies = this.canopies;
        return {
            obstacles: this.obstacles,
            animate(time) {
                canopies.forEach((f, i) =>
                    f.setLocalEulerAngles(Math.sin(time * 0.8 + i) * 1.1, 0, Math.cos(time * 0.7 + i) * 1.2)
                );
            }
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
