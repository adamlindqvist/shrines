import type { Material } from 'playcanvas';

import type { ChestHandles, PushBlockHandles, SunSwitchHandles, PuzzleSymbol } from '../objects/puzzle';

import type { Bounds, Collision } from './collision';
import { PLAYER } from './player';
import type { Stride } from './player';

export type Point = { x: number; z: number };
export type PuzzlePiece = Point & { symbol: PuzzleSymbol };
export type PuzzleConfig = {
    blocks: PuzzlePiece[];
    plates: PuzzlePiece[];
    /** Chest position; `y` raises it onto a plinth. */
    chest: Point & { y?: number };
    /** Overrides `PUZZLE.chestReach`, e.g. when the chest stands behind steps. */
    chestReach?: number;
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
};

export const PUZZLE = {
    /** Half-size of the square the player cannot enter around the block. */
    blockHalf: 1.1,
    /** Held movement uses this fraction of the player's speed. */
    moveRatio: 0.85,
    /** Maximum radial travel or orbit arc length per collision step. */
    grabStep: 0.05,
    /** Bisection precision when shortening a blocked movement step. */
    grabSearchSteps: 12,
    /** Extra reach beyond the block collision footprint. */
    grabReach: 0.6,
    /** Clearance kept between the block's centre and obstacles. */
    blockRadius: 0.76,
    /** The block snaps onto the switch within this distance. */
    snapRadius: 0.55,
    /** The player opens the unlocked chest within this distance. */
    chestReach: 1.7,
    /** Lid opening speed in degrees per second, up to 100°. */
    lidSpeed: 150,
    /** Visual hover height above the ground; collision stays on X/Z. */
    liftHeight: 0.28,
    liftRate: 12,
    /** Downward acceleration gives landing a definite contact frame. */
    dropGravity: 18,
    hoverAmplitude: 0.025,
    hoverRate: 3
};

/** One held block, independently matched plates, and a shared treasure reward. */
export class BlockPuzzle {
    private held: BlockState | null = null;
    private grabDistance = 0;
    private chestOpen = 0;
    private readonly blocks: BlockState[];
    private readonly plates: SunSwitchHandles[];
    private readonly chest: ChestHandles;
    private readonly collision: Collision;
    private readonly materials: { idle: Material; lit: Material; baseIdle: Material };
    readonly config: PuzzleConfig;

    constructor(
        config: PuzzleConfig,
        blocks: PushBlockHandles[],
        plates: SunSwitchHandles[],
        chest: ChestHandles,
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
            dropSpeed: 0
        }));
        this.plates = plates;
        this.chest = chest;
        this.collision = collision;
        this.materials = materials;
    }

    get grabbed() {
        return this.held !== null;
    }
    get matched() {
        return this.blocks.filter((b) => b.locked).length;
    }
    get unlocked() {
        return this.matched === this.blocks.length;
    }
    get heldPosition() {
        return this.held?.handles.entity.getPosition();
    }

    release() {
        this.held = null;
        this.grabDistance = 0;
    }

    diagnostics() {
        return this.blocks.map((b) => {
            const p = b.handles.entity.getPosition();
            return { symbol: b.symbol, x: p.x, z: p.z, locked: b.locked, grabbed: b === this.held };
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
            if (b.locked) continue;
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
        if (this.held) {
            const block = this.held.handles.entity.getPosition();
            this.grabDistance = Math.hypot(player.x - block.x, player.z - block.z);
        }
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
            if (wasRaised && b.lift === 0) {
                const p = b.handles.entity.getPosition();
                landed.push({ x: p.x, z: p.z });
            }
        }
        return landed;
    }

    private overlapsBlocks(x: number, z: number, half: number, except: BlockState | null = null) {
        return this.blocks.some((b) => {
            if (b === except) return false;
            const p = b.handles.entity.getPosition();
            return Math.abs(x - p.x) < half && Math.abs(z - p.z) < half;
        });
    }

    /** Resolves movement and damage shoves without pushing into another block. */
    resolvePlayer(next: Point, from: Point) {
        const safe = this.collision.resolve(next.x, next.z, PLAYER.radius);
        const result = { ...from };
        // Releasing after an orbit can leave the player inside a square corner margin.
        // Allow leaving that margin, never moving deeper or crossing through the block.
        const canStep = (to: Point, start: Point) =>
            this.blocks.every((block) => {
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

    /** Translate together when clear; swivel at fixed distance only when the block is stuck. */
    constrain(stride: Stride, player: Point) {
        const held = this.held;
        if (!held) return this.resolvePlayer(stride, player);
        const bp = held.handles.entity.getPosition();
        let x = player.x,
            z = player.z,
            bx = bp.x,
            bz = bp.z;
        const distance = this.grabDistance;
        const b = this.config.blockBounds;
        const walk = this.collision.bounds;
        const validPlayer = (px: number, pz: number) =>
            px >= walk.minX &&
            px <= walk.maxX &&
            pz >= walk.minZ &&
            pz <= walk.maxZ &&
            !this.collision.overlaps(px, pz, PLAYER.radius) &&
            !this.overlapsBlocks(px, pz, PUZZLE.blockHalf, held);
        const validBlock = (blockX: number, blockZ: number) =>
            blockX >= b.minX &&
            blockX <= b.maxX &&
            blockZ >= b.minZ &&
            blockZ <= b.maxZ &&
            !this.collision.overlaps(blockX, blockZ, PUZZLE.blockRadius) &&
            !this.overlapsBlocks(blockX, blockZ, PUZZLE.blockRadius * 2, held);
        // The held footprint is circular: its square corners must not catch an orbit.
        // Normal grabs start outside this clearance; guard invalid overlapping starts.
        if (distance < PLAYER.radius + PUZZLE.blockRadius) return { x, z };
        const dx = (stride.x - x) * PUZZLE.moveRatio;
        const dz = (stride.z - z) * PUZZLE.moveRatio;
        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / PUZZLE.grabStep));
        for (let i = 0; i < steps; i++) {
            const sx = dx / steps;
            const sz = dz / steps;
            const blockFraction = this.allowedFraction((f) => validBlock(bx + sx * f, bz + sz * f));
            const playerFraction = this.allowedFraction((f) => validPlayer(x + sx * f, z + sz * f));
            const fraction = Math.min(blockFraction, playerFraction);
            // In open space retain the current offset, including sideways movement.
            x += sx * fraction;
            z += sz * fraction;
            bx += sx * fraction;
            bz += sz * fraction;
            if (blockFraction === 1 || playerFraction < blockFraction) continue;

            // Only the box blocking the remaining movement activates the swivel.
            const angle = Math.atan2(z - bz, x - bx);
            const turn = ((-sx * Math.sin(angle) + sz * Math.cos(angle)) * (1 - fraction)) / distance;
            const orbit = this.allowedFraction((f) =>
                validPlayer(bx + Math.cos(angle + turn * f) * distance, bz + Math.sin(angle + turn * f) * distance)
            );
            if (orbit > 0 && turn !== 0) {
                x = bx + Math.cos(angle + turn * orbit) * distance;
                z = bz + Math.sin(angle + turn * orbit) * distance;
            }
        }
        held.handles.entity.setPosition(bx, 0, bz);
        return { x, z };
    }

    /** Matches only like symbols, one block per plate. A matched block remains locked until reset. */
    update(dt: number, player: Point) {
        const clicked: PuzzlePiece[] = [];
        for (const b of this.blocks) {
            if (b.locked) continue;
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
            b.handles.entity.setPosition(plate.x, 0.3, plate.z);
            this.plates[i].sunDisk.render!.meshInstances[0].material = this.materials.lit;
            this.plates[i].base.render!.meshInstances[0].material = this.materials.lit;
            clicked.push(plate);
        }
        if (this.unlocked) {
            this.chestOpen = Math.min(100, this.chestOpen + dt * PUZZLE.lidSpeed);
            this.chest.lid.setLocalEulerAngles(-this.chestOpen, 0, 0);
        }
        const chest = this.config.chest;
        return {
            clicked,
            reached:
                this.unlocked &&
                Math.hypot(player.x - chest.x, player.z - chest.z) < (this.config.chestReach ?? PUZZLE.chestReach)
        };
    }

    reset() {
        this.release();
        this.chestOpen = 0;
        this.chest.lid.setLocalEulerAngles(0, 0, 0);
        this.blocks.forEach((b, i) => {
            b.locked = false;
            b.plate = -1;
            b.lift = b.hoverTime = b.dropSpeed = 0;
            b.handles.visual.setLocalPosition(0, 0, 0);
            b.handles.available.enabled = b.handles.selected.enabled = false;
            const start = this.config.blocks[i];
            b.handles.entity.setPosition(start.x, 0, start.z);
        });
        for (const plate of this.plates) {
            plate.sunDisk.render!.meshInstances[0].material = this.materials.idle;
            plate.base.render!.meshInstances[0].material = this.materials.baseIdle;
        }
    }
}
