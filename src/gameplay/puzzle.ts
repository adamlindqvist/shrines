import type { Entity, Material } from 'playcanvas';

import type { ChestHandles, SunSwitchHandles } from '../objects/puzzle';

import type { Bounds, Collision } from './collision';
import type { Stride } from './player';

export type Point = {
    x: number;
    z: number;
};

export type PuzzleConfig = {
    block: Point;
    switch: Point;
    chest: Point;
    /** Rectangle the block's centre may be pushed within. */
    blockBounds: Bounds;
};

export const PUZZLE = {
    /** Half-size of the square the player cannot enter around the block. */
    blockHalf: 1.1,
    /** The block moves at this fraction of the player's speed. */
    pushRatio: 0.85,
    /** Clearance kept between the block's centre and obstacles. */
    blockRadius: 0.76,
    /** The block snaps onto the switch within this distance. */
    snapRadius: 0.55,
    /** The player opens the unlocked chest within this distance. */
    chestReach: 1.7,
    /** Lid opening speed in degrees per second, up to 100°. */
    lidSpeed: 150
};

/** Push the block onto the sun switch, then walk to the chest. */
export class BlockPuzzle {
    unlocked = false;
    private chestOpen = 0;

    readonly config: PuzzleConfig;
    private readonly block: Entity;
    private readonly sunSwitch: SunSwitchHandles;
    private readonly chest: ChestHandles;
    private readonly collision: Collision;
    private readonly materials: { idle: Material; lit: Material };

    constructor(
        config: PuzzleConfig,
        block: Entity,
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
        return this.block.getPosition();
    }

    /**
     * Lets a walking player push the block while locked, and keeps the player
     * out of the block's footprint. Returns the adjusted next position.
     */
    constrain(stride: Stride, moveX: number, moveZ: number, dt: number) {
        let { x: nx, z: nz } = stride;
        const { blockHalf, pushRatio, blockRadius } = PUZZLE;
        const bp = this.block.getPosition();
        const dx = nx - bp.x,
            dz = nz - bp.z;
        if (Math.abs(dx) < blockHalf && Math.abs(dz) < blockHalf) {
            if (!this.unlocked && stride.input && dx * moveX + dz * moveZ < 0) {
                const b = this.config.blockBounds;
                let bx = bp.x + moveX * stride.speed * dt * pushRatio,
                    bz = bp.z + moveZ * stride.speed * dt * pushRatio;
                bx = Math.max(b.minX, Math.min(b.maxX, bx));
                bz = Math.max(b.minZ, Math.min(b.maxZ, bz));
                if (!this.collision.overlaps(bx, bz, blockRadius)) this.block.setPosition(bx, 0, bz);
            }
            const nb = this.block.getPosition();
            if (Math.abs(nx - nb.x) > Math.abs(nz - nb.z)) nx = nb.x + Math.sign(nx - nb.x) * blockHalf;
            else nz = nb.z + Math.sign(nz - nb.z) * blockHalf;
        }
        return { x: nx, z: nz };
    }

    /** Advances the switch and chest. Reports the frame the switch clicks and the frame the chest is reached. */
    update(dt: number, player: Point) {
        const { switch: sw, chest } = this.config;
        let clicked = false,
            reached = false;
        const bp = this.block.getPosition();
        if (!this.unlocked && Math.hypot(bp.x - sw.x, bp.z - sw.z) < PUZZLE.snapRadius) {
            this.unlocked = true;
            clicked = true;
            this.block.setPosition(sw.x, 0, sw.z);
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
        this.unlocked = false;
        this.chestOpen = 0;
        this.block.setPosition(this.config.block.x, 0, this.config.block.z);
        this.chest.lid.setLocalEulerAngles(0, 0, 0);
        this.sunSwitch.sunDisk.render!.meshInstances[0].material = this.materials.idle;
    }
}
