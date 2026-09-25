import type { Material } from 'playcanvas';

import type { PushBlockHandles, SunSwitchHandles, PuzzleSymbol } from '../objects/puzzle';

import type { Bounds, Collision } from './collision';
import { PLAYER } from './player';
import type { Stride } from './player';

export type Point = { x: number; z: number };
export type PuzzlePiece = Point & { symbol: PuzzleSymbol };
export type PuzzleConfig = {
    blocks: PuzzlePiece[];
    plates: PuzzlePiece[];
    /** Rectangle the block centres may be moved within. */
    blockBounds: Bounds;
};

type BlockState = {
    handles: PushBlockHandles;
    symbol: PuzzleSymbol;
    locked: boolean;
    /** Index of the plate this block is locked onto, or -1. */
    plate: number;
    lift: number;
    hoverTime: number;
    dropSpeed: number;
    /** Recent dry, off-platform centres, oldest first; a sunk block respawns on the newest clear one. */
    trail: Point[];
    /** Remaining flicker time after resurfacing from the water; 0 otherwise. */
    flicker: number;
    /** Remaining sink time while the block goes under; it is out of play until it resurfaces. */
    sink: number;
    /** Visual height the sink started from. */
    sinkFrom: number;
    splashed: boolean;
};

export const PUZZLE = {
    /** Half-size of the square the player cannot enter around the block. */
    blockHalf: 1.1,
    /** Held movement uses this fraction of the player's speed. */
    moveRatio: 0.85,
    /** Maximum held-pair travel per collision step. */
    grabStep: 0.05,
    /** Bisection precision when shortening a blocked movement step. */
    grabSearchSteps: 12,
    /** Extra reach beyond the block collision footprint. */
    grabReach: 0.6,
    /** Clearance kept between the block's centre and obstacles. */
    blockRadius: 0.76,
    /** The block snaps onto the switch within this distance. */
    snapRadius: 0.55,
    /** Visual hover height above the ground; collision stays on X/Z. */
    liftHeight: 0.28,
    liftRate: 12,
    /** Downward acceleration gives landing a definite contact frame. */
    dropGravity: 18,
    hoverAmplitude: 0.025,
    hoverRate: 3,
    /** A block's safe trail gains a point once it has moved this far from the newest one. */
    trailSpacing: 0.3,
    /** Points kept per block; with the spacing this covers a few units of recent travel. */
    trailLength: 40,
    /** A block over open water sinks `sinkDepth` below its rest height over `sinkTime` seconds, like the player. */
    sinkTime: 0.7,
    sinkDepth: 2.6,
    /** A block resurfacing from the water flickers like the hurt player for this many seconds. */
    respawnFlicker: 1.2,
    flickerRate: 18
};

/** One held block and independently matched plates; rewards belong to level rules. */
export class BlockPuzzle {
    private held: BlockState | null = null;
    private readonly blocks: BlockState[];
    private readonly plates: SunSwitchHandles[];
    private readonly collision: Collision;
    private readonly materials: { idle: Material; lit: Material; baseIdle: Material };
    readonly config: PuzzleConfig;

    constructor(
        config: PuzzleConfig,
        blocks: PushBlockHandles[],
        plates: SunSwitchHandles[],
        collision: Collision,
        materials: { idle: Material; lit: Material; baseIdle: Material }
    ) {
        this.config = config;
        this.blocks = blocks.map((handles, i) => ({
            handles,
            symbol: config.blocks[i].symbol,
            locked: false,
            plate: -1,
            lift: 0,
            hoverTime: 0,
            dropSpeed: 0,
            trail: [{ x: config.blocks[i].x, z: config.blocks[i].z }],
            flicker: 0,
            sink: 0,
            sinkFrom: 0,
            splashed: false
        }));
        this.plates = plates;
        this.collision = collision;
        this.materials = materials;
    }

    get grabbed() {
        return this.held !== null;
    }
    get matched() {
        return this.blocks.filter((b) => b.locked).length;
    }
    get heldPosition() {
        return this.held?.handles.entity.getPosition();
    }

    release() {
        this.held = null;
    }

    diagnostics() {
        return this.blocks.map((b) => {
            const p = b.handles.entity.getPosition();
            return {
                symbol: b.symbol,
                x: p.x,
                y: p.y,
                z: p.z,
                locked: b.locked,
                grabbed: b === this.held,
                sinking: b.sink > 0
            };
        });
    }

    /** Whether each plate, in config order, holds a locked block. */
    plateStates() {
        return this.config.plates.map((_, i) => this.blocks.some((b) => b.plate === i));
    }

    private nearest(player: Point) {
        let nearest: BlockState | null = null;
        let distance = Infinity;
        for (const b of this.blocks) {
            if (b.locked || b.sink > 0) continue;
            const p = b.handles.entity.getPosition();
            const dx = Math.max(0, Math.abs(player.x - p.x) - PUZZLE.blockHalf);
            const dz = Math.max(0, Math.abs(player.z - p.z) - PUZZLE.blockHalf);
            const d = Math.hypot(player.x - p.x, player.z - p.z);
            if (Math.hypot(dx, dz) <= PUZZLE.grabReach && d < distance) {
                nearest = b;
                distance = d;
            }
        }
        return nearest;
    }

    /** Consumes attack when releasing or grabbing the nearest available block. */
    interact(player: Point) {
        if (this.held) {
            this.release();
            return true;
        }
        this.held = this.nearest(player);
        return this.grabbed;
    }

    updateIndicator(player: Point, active = true) {
        const nearest = active && !this.held ? this.nearest(player) : null;
        for (const b of this.blocks) {
            b.handles.available.enabled = b === nearest;
            b.handles.selected.enabled = active && b === this.held;
        }
    }

    /** Animates visual children only; reports every landing for its sand puff. */
    updateLift(dt: number): Point[] {
        const landed: Point[] = [];
        for (const b of this.blocks) {
            // Sinking owns the visual height until the block resurfaces.
            if (b.sink > 0) continue;
            const wasRaised = b.lift > 0;
            let height: number;
            if (b === this.held) {
                b.dropSpeed = 0;
                b.lift += (PUZZLE.liftHeight - b.lift) * (1 - Math.exp(-PUZZLE.liftRate * dt));
                b.hoverTime += dt;
                height =
                    b.lift +
                    Math.sin(b.hoverTime * PUZZLE.hoverRate) * PUZZLE.hoverAmplitude * (b.lift / PUZZLE.liftHeight);
            } else {
                const previousHeight = b.handles.visual.getLocalPosition().y;
                height = Math.max(0, previousHeight - b.dropSpeed * dt - 0.5 * PUZZLE.dropGravity * dt * dt);
                b.dropSpeed = height > 0 ? b.dropSpeed + PUZZLE.dropGravity * dt : 0;
                b.lift = height;
                b.hoverTime = 0;
            }
            b.handles.visual.setLocalPosition(0, height, 0);
            b.flicker = Math.max(0, b.flicker - dt);
            b.handles.visual.enabled = !(b.flicker > 0 && Math.floor(b.flicker * PUZZLE.flickerRate) % 2 === 0);
            if (wasRaised && b.lift === 0) {
                const p = b.handles.entity.getPosition();
                landed.push({ x: p.x, z: p.z });
            }
        }
        return landed;
    }

    private overlapsBlocks(x: number, z: number, half: number, except: BlockState | null = null) {
        return this.blocks.some((b) => {
            if (b === except || b.sink > 0) return false;
            const p = b.handles.entity.getPosition();
            return Math.abs(x - p.x) < half && Math.abs(z - p.z) < half;
        });
    }

    /** Resolves movement and damage shoves without pushing into another block; `dry` also refuses open water. */
    resolvePlayer(next: Point, from: Point, dry = false) {
        const safe = this.collision.resolve(next.x, next.z, PLAYER.radius);
        const result = { ...from };
        // A player can end up inside a square corner margin (e.g. a grab from a diagonal).
        // Allow leaving that margin, never moving deeper or crossing through the block.
        const canStep = (to: Point, start: Point) =>
            this.collision.canTravel(start, to) &&
            !(dry && this.collision.isWater(to.x, to.z)) &&
            this.blocks.every((block) => {
                if (block.sink > 0) return true;
                const p = block.handles.entity.getPosition();
                const dx = Math.abs(to.x - p.x);
                const dz = Math.abs(to.z - p.z);
                if (dx >= PUZZLE.blockHalf || dz >= PUZZLE.blockHalf) return true;
                const sx = Math.abs(start.x - p.x);
                const sz = Math.abs(start.z - p.z);
                return sx < PUZZLE.blockHalf && sz < PUZZLE.blockHalf && dx >= sx && dz >= sz;
            });
        if (canStep({ x: safe.x, z: from.z }, from)) result.x = safe.x;
        if (canStep({ x: result.x, z: safe.z }, result)) result.z = safe.z;
        // Axis sliding must also remain outside static obstacles.
        if (this.collision.overlaps(result.x, result.z, PLAYER.radius)) return { ...from };
        return result;
    }

    /** Shortens one small, continuous movement to its last collision-free position. */
    private allowedFraction(valid: (fraction: number) => boolean) {
        if (valid(1)) return 1;
        let low = 0;
        let high = 1;
        for (let i = 0; i < PUZZLE.grabSearchSteps; i++) {
            const mid = (low + high) / 2;
            if (valid(mid)) low = mid;
            else high = mid;
        }
        return low;
    }

    /** Translates the held pair rigidly; the offset and player facing stay fixed. Each axis slides independently. */
    constrain(stride: Stride, player: Point) {
        const held = this.held;
        if (!held) return this.resolvePlayer(stride, player);
        const bp = held.handles.entity.getPosition();
        let x = player.x,
            z = player.z,
            bx = bp.x,
            bz = bp.z;
        const b = this.config.blockBounds;
        const walk = this.collision.bounds;
        const validPlayer = (px: number, pz: number) =>
            px >= walk.minX &&
            px <= walk.maxX &&
            pz >= walk.minZ &&
            pz <= walk.maxZ &&
            this.collision.canTravel({ x, z }, { x: px, z: pz }) &&
            !this.collision.overlaps(px, pz, PLAYER.radius) &&
            !this.overlapsBlocks(px, pz, PUZZLE.blockHalf, held);
        const validBlock = (blockX: number, blockZ: number) =>
            blockX >= b.minX &&
            blockX <= b.maxX &&
            blockZ >= b.minZ &&
            blockZ <= b.maxZ &&
            this.collision.canTravel({ x: bx, z: bz }, { x: blockX, z: blockZ }) &&
            !this.collision.overlaps(blockX, blockZ, PUZZLE.blockRadius) &&
            !this.overlapsBlocks(blockX, blockZ, PUZZLE.blockRadius * 2, held);
        const dx = (stride.x - x) * PUZZLE.moveRatio;
        const dz = (stride.z - z) * PUZZLE.moveRatio;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / PUZZLE.grabStep));
        const sx = dx / steps;
        const sz = dz / steps;
        for (let i = 0; i < steps; i++) {
            if (sx !== 0) {
                const fx = this.allowedFraction((f) => validBlock(bx + sx * f, bz) && validPlayer(x + sx * f, z));
                x += sx * fx;
                bx += sx * fx;
            }
            if (sz !== 0) {
                const fz = this.allowedFraction((f) => validBlock(bx, bz + sz * f) && validPlayer(x, z + sz * f));
                z += sz * fz;
                bz += sz * fz;
            }
        }
        held.handles.entity.setPosition(bx, this.collision.heightAt(bx, bz), bz);
        return { x, z };
    }

    /** Matches only like symbols, one block per plate. A matched block remains locked until reset. */
    update(player: Point) {
        const clicked: PuzzlePiece[] = [];
        for (const b of this.blocks) {
            if (b.locked || b.sink > 0) continue;
            const p = b.handles.entity.getPosition();
            const i = this.config.plates.findIndex(
                (plate, index) =>
                    plate.symbol === b.symbol &&
                    !this.blocks.some((other) => other.plate === index) &&
                    Math.hypot(p.x - plate.x, p.z - plate.z) < PUZZLE.snapRadius
            );
            if (i < 0) continue;
            const plate = this.config.plates[i];
            if (this.overlapsBlocks(plate.x, plate.z, PUZZLE.blockRadius * 2, b)) continue;
            // Do not snap onto the player when approaching from the far side.
            if (Math.abs(player.x - plate.x) < PUZZLE.blockHalf && Math.abs(player.z - plate.z) < PUZZLE.blockHalf)
                continue;
            b.locked = true;
            b.plate = i;
            if (b === this.held) this.release();
            b.handles.entity.setPosition(plate.x, this.collision.heightAt(plate.x, plate.z) + 0.3, plate.z);
            this.plates[i].sunDisk.render!.meshInstances[0].material = this.materials.lit;
            this.plates[i].base.render!.meshInstances[0].material = this.materials.lit;
            clicked.push(plate);
        }
        return { clicked };
    }

    /** Indices of unlocked blocks resting (not held) where `inside` holds, such as on a platform. */
    restingWhere(inside: (x: number, z: number) => boolean) {
        const indices: number[] = [];
        this.blocks.forEach((b, i) => {
            const p = b.handles.entity.getPosition();
            if (!b.locked && b.sink === 0 && b !== this.held && inside(p.x, p.z)) indices.push(i);
        });
        return indices;
    }

    /** Carries the given blocks, plus the held block when `held` is true, by (dx, dz) at ground height. */
    shift(indices: number[], dx: number, dz: number, held = false) {
        const moved = indices.map((i) => this.blocks[i]);
        if (held && this.held) moved.push(this.held);
        for (const b of moved) {
            const p = b.handles.entity.getPosition();
            const x = p.x + dx,
                z = p.z + dz;
            b.handles.entity.setPosition(x, this.collision.heightAt(x, z), z);
        }
    }

    /**
     * Records safe footing for dry blocks and sinks those whose centre ends up over open water:
     * they are released and drop under like the player, splashing as they pass `waterLevel`.
     * Once under, each reappears on its most recent safe spot that is clear of the player, other
     * blocks and obstacles, or at its start if none is. `unsafe` marks moving ground such as
     * platforms, which is never recorded. Returns where blocks splashed and where they resurfaced.
     */
    updateWater(dt: number, player: Point, waterLevel = 0, unsafe: (x: number, z: number) => boolean = () => false) {
        const splashed: Point[] = [];
        const surfaced: Point[] = [];
        for (const b of this.blocks) {
            if (b.locked) continue;
            const p = b.handles.entity.getPosition();
            if (b.sink === 0) {
                if (!this.collision.isWater(p.x, p.z)) {
                    if (!unsafe(p.x, p.z)) this.recordSafe(b, p);
                    continue;
                }
                if (b === this.held) this.release();
                b.sink = PUZZLE.sinkTime;
                b.sinkFrom = b.handles.visual.getLocalPosition().y;
                b.splashed = false;
                b.flicker = 0;
                b.handles.visual.enabled = true;
                b.handles.available.enabled = b.handles.selected.enabled = false;
            }
            b.sink = Math.max(0, b.sink - dt);
            const t = 1 - b.sink / PUZZLE.sinkTime;
            const y = b.sinkFrom - PUZZLE.sinkDepth * t * t;
            b.handles.visual.setLocalPosition(0, y, 0);
            if (!b.splashed && p.y + y <= waterLevel) {
                b.splashed = true;
                splashed.push({ x: p.x, z: p.z });
            }
            if (b.sink > 0) continue;
            const to = this.respawnPoint(b, player, unsafe);
            this.placeAt(b, to);
            b.flicker = PUZZLE.respawnFlicker;
            surfaced.push(to);
        }
        return { splashed, surfaced };
    }

    private recordSafe(b: BlockState, p: Point) {
        const last = b.trail[b.trail.length - 1];
        if (last && Math.hypot(p.x - last.x, p.z - last.z) < PUZZLE.trailSpacing) return;
        b.trail.push({ x: p.x, z: p.z });
        if (b.trail.length > PUZZLE.trailLength) b.trail.shift();
    }

    /** Newest trail point that is still dry, steady and unobstructed; trims the trail to it. */
    private respawnPoint(b: BlockState, player: Point, unsafe: (x: number, z: number) => boolean): Point {
        for (let i = b.trail.length - 1; i >= 0; i--) {
            const q = b.trail[i];
            if (
                this.collision.isWater(q.x, q.z) ||
                unsafe(q.x, q.z) ||
                this.collision.overlaps(q.x, q.z, PUZZLE.blockRadius) ||
                this.overlapsBlocks(q.x, q.z, PUZZLE.blockRadius * 2, b) ||
                (Math.abs(player.x - q.x) < PUZZLE.blockHalf && Math.abs(player.z - q.z) < PUZZLE.blockHalf)
            )
                continue;
            b.trail.length = i + 1;
            return { ...q };
        }
        const start = this.config.blocks[this.blocks.indexOf(b)];
        b.trail = [{ x: start.x, z: start.z }];
        return { x: start.x, z: start.z };
    }

    /** Sets one block down at (x, z), resting and unhighlighted. */
    private placeAt(b: BlockState, to: Point) {
        b.lift = b.hoverTime = b.dropSpeed = b.flicker = b.sink = 0;
        b.splashed = false;
        b.handles.visual.setLocalPosition(0, 0, 0);
        b.handles.visual.enabled = true;
        b.handles.available.enabled = b.handles.selected.enabled = false;
        b.handles.entity.setPosition(to.x, this.collision.heightAt(to.x, to.z), to.z);
    }

    /** Puts one block back at its authored start, resting and unhighlighted, forgetting its trail. */
    returnToStart(index: number) {
        const b = this.blocks[index];
        const start = this.config.blocks[index];
        b.trail = [{ x: start.x, z: start.z }];
        this.placeAt(b, start);
    }

    reset() {
        this.release();
        this.blocks.forEach((b, i) => {
            b.locked = false;
            b.plate = -1;
            this.returnToStart(i);
        });
        for (const plate of this.plates) {
            plate.sunDisk.render!.meshInstances[0].material = this.materials.idle;
            plate.base.render!.meshInstances[0].material = this.materials.baseIdle;
        }
    }
}
