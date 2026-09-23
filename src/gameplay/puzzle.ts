import type { Material } from 'playcanvas';

import type { ChestHandles, PushBlockHandles, SunSwitchHandles } from '../objects/puzzle';

import type { Bounds, Collision } from './collision';
import { PLAYER } from './player';
import type { Stride } from './player';

export type Point = {
    x: number;
    z: number;
};

export type PuzzleConfig = {
    block: Point;
    switch: Point;
    chest: Point;
    /** Rectangle the block's centre may be moved within. */
    blockBounds: Bounds;
};

export const PUZZLE = {
    /** Half-size of the square the player cannot enter around the block. */
    blockHalf: 1.1,
    /** The block moves at this fraction of the player's speed. */
    moveRatio: 0.85,
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

/** Grab and move the block onto the sun switch, then walk to the chest. */
export class BlockPuzzle {
    unlocked = false;
    grabbed = false;
    private chestOpen = 0;
    private lift = 0;
    private hoverTime = 0;
    private dropSpeed = 0;

    readonly config: PuzzleConfig;
    private readonly block: PushBlockHandles;
    private readonly sunSwitch: SunSwitchHandles;
    private readonly chest: ChestHandles;
    private readonly collision: Collision;
    private readonly materials: { idle: Material; lit: Material };

    constructor(
        config: PuzzleConfig,
        block: PushBlockHandles,
        sunSwitch: SunSwitchHandles,
        chest: ChestHandles,
        collision: Collision,
        materials: { idle: Material; lit: Material }
    ) {
        this.config = config;
        this.block = block;
        this.sunSwitch = sunSwitch;
        this.chest = chest;
        this.collision = collision;
        this.materials = materials;
    }

    get blockPosition() {
        return this.block.entity.getPosition();
    }

    /** Consumes attack when releasing or when close enough to grab the movable block. */
    interact(player: Point) {
        if (this.grabbed) {
            this.grabbed = false;
            return true;
        }
        if (!this.canGrab(player)) return false;
        this.grabbed = true;
        return true;
    }

    /** Shared reach check for the input action and its visual cue. */
    canGrab(player: Point) {
        const bp = this.blockPosition;
        const dx = Math.max(0, Math.abs(player.x - bp.x) - PUZZLE.blockHalf);
        const dz = Math.max(0, Math.abs(player.z - bp.z) - PUZZLE.blockHalf);
        return !this.unlocked && Math.hypot(dx, dz) <= PUZZLE.grabReach;
    }

    updateIndicator(player: Point, active = true) {
        this.block.available.enabled = active && !this.grabbed && this.canGrab(player);
        this.block.selected.enabled = active && this.grabbed;
    }

    /** Animate only the visual child. Returns true once on landing, for a sand puff. */
    updateLift(dt: number) {
        const wasRaised = this.lift > 0;
        let height: number;
        if (this.grabbed) {
            this.dropSpeed = 0;
            this.lift += (PUZZLE.liftHeight - this.lift) * (1 - Math.exp(-PUZZLE.liftRate * dt));
            this.hoverTime += dt;
            height =
                this.lift +
                Math.sin(this.hoverTime * PUZZLE.hoverRate) * PUZZLE.hoverAmplitude * (this.lift / PUZZLE.liftHeight);
        } else {
            // Start from the visible pose, including its bob, and land without an easing tail.
            const previousHeight = this.block.visual.getLocalPosition().y;
            height = Math.max(0, previousHeight - this.dropSpeed * dt - 0.5 * PUZZLE.dropGravity * dt * dt);
            this.dropSpeed = height > 0 ? this.dropSpeed + PUZZLE.dropGravity * dt : 0;
            this.lift = height;
            this.hoverTime = 0;
        }
        this.block.visual.setLocalPosition(0, height, 0);
        return wasRaised && this.lift === 0;
    }

    /** Moves a grabbed pair together; either body's obstacles constrain both bodies. */
    constrain(stride: Stride, player: Point) {
        const bp = this.blockPosition;
        if (this.grabbed) {
            let x = player.x,
                z = player.z;
            let bx = bp.x,
                bz = bp.z;
            const b = this.config.blockBounds;
            const walk = this.collision.bounds;
            const valid = (px: number, pz: number, blockX: number, blockZ: number) =>
                blockX >= b.minX &&
                blockX <= b.maxX &&
                blockZ >= b.minZ &&
                blockZ <= b.maxZ &&
                px >= walk.minX &&
                px <= walk.maxX &&
                pz >= walk.minZ &&
                pz <= walk.maxZ &&
                !this.collision.overlaps(blockX, blockZ, PUZZLE.blockRadius) &&
                !this.collision.overlaps(px, pz, PLAYER.radius);
            const dx = (stride.x - x) * PUZZLE.moveRatio;
            const dz = (stride.z - z) * PUZZLE.moveRatio;
            if (valid(x + dx, z, bx + dx, bz)) {
                x += dx;
                bx += dx;
            }
            if (valid(x, z + dz, bx, bz + dz)) {
                z += dz;
                bz += dz;
            }
            this.block.entity.setPosition(bx, 0, bz);
            return { x, z };
        }
        const next = this.collision.resolve(stride.x, stride.z, PLAYER.radius);
        const dx = next.x - bp.x,
            dz = next.z - bp.z;
        const half = PUZZLE.blockHalf;
        if (Math.abs(dx) < half && Math.abs(dz) < half) {
            if (Math.abs(dx) > Math.abs(dz)) next.x = bp.x + (Math.sign(dx) || 1) * half;
            else next.z = bp.z + (Math.sign(dz) || 1) * half;
        }
        return next;
    }

    /** Advances the switch and chest. Reports the frame the switch clicks and the frame the chest is reached. */
    update(dt: number, player: Point) {
        const { switch: sw, chest } = this.config;
        let clicked = false,
            reached = false;
        const bp = this.block.entity.getPosition();
        if (!this.unlocked && Math.hypot(bp.x - sw.x, bp.z - sw.z) < PUZZLE.snapRadius) {
            this.unlocked = true;
            this.grabbed = false;
            clicked = true;
            this.block.entity.setPosition(sw.x, 0, sw.z);
            this.sunSwitch.sunDisk.render!.meshInstances[0].material = this.materials.lit;
        }
        if (this.unlocked) {
            this.chestOpen = Math.min(100, this.chestOpen + dt * PUZZLE.lidSpeed);
            this.chest.lid.setLocalEulerAngles(-this.chestOpen, 0, 0);
            reached = Math.hypot(player.x - chest.x, player.z - chest.z) < PUZZLE.chestReach;
        }
        return { clicked, reached };
    }

    reset() {
        this.lift = 0;
        this.hoverTime = 0;
        this.dropSpeed = 0;
        this.block.visual.setLocalPosition(0, 0, 0);
        this.grabbed = false;
        this.block.available.enabled = false;
        this.block.selected.enabled = false;
        this.unlocked = false;
        this.chestOpen = 0;
        this.block.entity.setPosition(this.config.block.x, 0, this.config.block.z);
        this.chest.lid.setLocalEulerAngles(0, 0, 0);
        this.sunSwitch.sunDisk.render!.meshInstances[0].material = this.materials.idle;
    }
}
