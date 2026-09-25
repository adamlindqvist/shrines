import { BOOT_X, BOOT_Y, BOOT_Z } from '../objects/adventurer';
import type { AdventurerHandles } from '../objects/adventurer';

import type { Collision } from './collision';

export const PLAYER = {
    walkSpeed: 7.5,
    /** Exponential rate at which movement eases toward the input direction. */
    responsiveness: 14,
    /** Collision radius. */
    radius: 0.33
};

/** Result of one movement step: the unconstrained next position and how it was reached. */
export type Stride = {
    x: number;
    z: number;
    /** Length of the raw input vector; 0 when no direction is held. */
    input: number;
    speed: number;
};

/** Adventurer locomotion: eased 8-way movement, facing and the walk/flash animation. */
export class PlayerController {
    heading = 0;
    moveX = 0;
    moveZ = 0;

    readonly handles: AdventurerHandles;
    private readonly ground?: Collision;

    constructor(handles: AdventurerHandles, ground?: Collision) {
        this.handles = handles;
        this.ground = ground;
    }

    get position() {
        return this.handles.entity.getPosition();
    }

    /**
     * Eases toward the input direction and proposes the next position; the caller constrains and applies it.
     * With `turn` false (holding a block) facing stays locked and movement strafes.
     */
    stride(dt: number, axis: { x: number; z: number }, turn = true): Stride {
        const length = Math.hypot(axis.x, axis.z);
        const desiredX = length ? axis.x / length : 0,
            desiredZ = length ? axis.z / length : 0;
        const smooth = 1 - Math.exp(-PLAYER.responsiveness * dt);
        this.moveX += (desiredX - this.moveX) * smooth;
        this.moveZ += (desiredZ - this.moveZ) * smooth;
        if (length && turn) this.face(Math.atan2(desiredX, desiredZ));
        const speed = PLAYER.walkSpeed;
        const pos = this.position;
        return {
            x: pos.x + this.moveX * speed * dt,
            z: pos.z + this.moveZ * speed * dt,
            input: length,
            speed
        };
    }

    /** Sets gameplay heading (radians, `atan2(x, z)`) and the matching entity yaw. */
    face(heading: number) {
        this.heading = heading;
        this.handles.entity.setEulerAngles(0, (heading * 180) / Math.PI, 0);
    }

    moveTo(x: number, z: number) {
        this.handles.entity.setPosition(x, this.ground?.heightAt(x, z) ?? 0, z);
    }

    /** Walk bob, stepping boots, sword swing (`swing` counts down from `swingTime`) and damage flashing. */
    animate(time: number, swing: number, swingTime: number, invincible: number) {
        const { visual, leftBoot, rightBoot, swordPivot } = this.handles;
        const moving = Math.hypot(this.moveX, this.moveZ);
        visual.setLocalPosition(0, Math.sin(time * 13) * 0.045 * moving, 0);
        leftBoot.setLocalPosition(-BOOT_X, BOOT_Y + Math.max(0, Math.sin(time * 13)) * 0.1 * moving, BOOT_Z);
        rightBoot.setLocalPosition(BOOT_X, BOOT_Y + Math.max(0, -Math.sin(time * 13)) * 0.1 * moving, BOOT_Z);
        swordPivot.setLocalEulerAngles(
            swing > 0 ? -75 : 0,
            swing > 0 ? (1 - swing / swingTime) * 160 - 80 : 0,
            swing > 0 ? -40 : 0
        );
        visual.enabled = !(invincible > 0 && Math.floor(time * 18) % 2 === 0);
    }

    reset(x: number, z: number) {
        this.heading = 0;
        this.moveX = 0;
        this.moveZ = 0;
        const { entity, visual, swordPivot } = this.handles;
        entity.setPosition(x, this.ground?.heightAt(x, z) ?? 0, z);
        entity.setEulerAngles(0, 0, 0);
        visual.enabled = true;
        visual.setLocalPosition(0, 0, 0);
        swordPivot.setLocalEulerAngles(0, 0, 0);
    }
}
