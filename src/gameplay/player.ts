import { BOOT_X, BOOT_Y, BOOT_Z } from '../objects/adventurer';
import type { AdventurerHandles } from '../objects/adventurer';

import type { Collision } from './collision';
import { SWORD } from './combat';

export const PLAYER = {
    walkSpeed: 7.5,
    /** Exponential rate at which movement eases toward the input direction. */
    responsiveness: 14,
    /** Collision radius. */
    radius: 0.33
};

/** Visual tuning in local model units; stride length is measured in world units. */
export const PLAYER_MOTION = {
    strideLength: 3.6,
    settleRate: 18,
    stepLength: 0.15,
    stepHeight: 0.12,
    bob: 0.022
};

export type PlayerAnimation = {
    dt: number;
    time: number;
    dx: number;
    dz: number;
    carrying: boolean;
    swing: number;
    attackHeading: number;
    invincible: number;
};

const ease = (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

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
    private stridePhase = 0;
    private gait = 0;
    private stepX = 0;
    private stepZ = 1;

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

    /** Poses use only resolved locomotion and the gameplay attack clock. */
    animate({ dt, time, dx, dz, carrying, swing, attackHeading, invincible }: PlayerAnimation) {
        const { visual, torso, leftBoot, rightBoot, swordPivot, shieldPivot } = this.handles;
        const distance = Math.hypot(dx, dz);
        const amount = dt > 0 ? Math.min(1, distance / (dt * PLAYER.walkSpeed)) : 0;
        this.gait += (amount - this.gait) * (1 - Math.exp(-PLAYER_MOTION.settleRate * dt));
        this.stridePhase = (this.stridePhase + distance * ((Math.PI * 2) / PLAYER_MOTION.strideLength)) % (Math.PI * 2);
        if (distance > 0.00001) {
            // Convert resolved world movement to the locked facing used while carrying.
            const c = Math.cos(this.heading),
                s = Math.sin(this.heading);
            this.stepX = (dx * c - dz * s) / distance;
            this.stepZ = (dx * s + dz * c) / distance;
        }
        const step = Math.sin(this.stridePhase);
        for (const [boot, side] of [
            [leftBoot, -1],
            [rightBoot, 1]
        ] as const) {
            const phase = step * -side;
            boot.setLocalPosition(
                side * BOOT_X + phase * this.stepX * PLAYER_MOTION.stepLength * this.gait,
                BOOT_Y + Math.max(0, phase) * PLAYER_MOTION.stepHeight * this.gait,
                BOOT_Z + phase * this.stepZ * PLAYER_MOTION.stepLength * this.gait
            );
            boot.setLocalEulerAngles(-phase * this.stepZ * 12 * this.gait, 0, phase * this.stepX * 8 * this.gait);
        }
        visual.setLocalPosition(0, Math.abs(step) * PLAYER_MOTION.bob * this.gait, 0);
        visual.setLocalEulerAngles(0, 0, step * 1.5 * this.gait * (carrying ? 0.3 : 1));
        const armWalk = step * 7 * this.gait * (carrying ? 0.2 : 1);
        let pitch = -12 + armWalk,
            yaw = -18,
            twist = 0,
            attackWeight = 0;
        if (swing > 0) {
            const elapsed = SWORD.swingTime - swing;
            const anticipation = SWORD.swingTime - SWORD.activeFrom;
            if (elapsed < anticipation) {
                const t = ease(elapsed / anticipation);
                pitch = mix(-12 + armWalk, -28, t);
                yaw = mix(-18, -75, t);
                twist = -10 * t;
                attackWeight = t;
            } else if (swing >= SWORD.activeUntil) {
                const t = ease((SWORD.activeFrom - swing) / (SWORD.activeFrom - SWORD.activeUntil));
                pitch = mix(-28, -8, t);
                yaw = mix(-75, 65, t);
                twist = mix(-10, 10, t);
                attackWeight = 1;
            } else {
                const t = ease(1 - swing / SWORD.activeUntil);
                pitch = mix(-8, -12 + armWalk, t);
                yaw = mix(65, -18, t);
                twist = 10 * (1 - t);
                attackWeight = 1 - t;
            }
        }
        const headingDelta = Math.atan2(Math.sin(attackHeading - this.heading), Math.cos(attackHeading - this.heading));
        torso.setLocalEulerAngles(0, twist + ((headingDelta * 180) / Math.PI) * attackWeight, 0);
        swordPivot.setLocalEulerAngles(pitch, yaw, 0);
        shieldPivot.setLocalEulerAngles(-armWalk - attackWeight * 12, -twist * 0.5, 0);
        visual.enabled = !(invincible > 0 && Math.floor(time * 18) % 2 === 0);
    }

    /** Cancels only the upper-body action when a block interaction interrupts a swing. */
    cancelAttackPose() {
        for (const rest of this.handles.rest) {
            if ([this.handles.torso, this.handles.swordPivot, this.handles.shieldPivot].includes(rest.entity)) {
                rest.entity.setLocalPosition(rest.position);
                rest.entity.setLocalRotation(rest.rotation);
            }
        }
    }

    reset(x: number, z: number) {
        this.heading = 0;
        this.moveX = 0;
        this.moveZ = 0;
        this.stridePhase = 0;
        this.gait = 0;
        this.stepX = 0;
        this.stepZ = 1;
        const { entity, visual, rest } = this.handles;
        entity.setPosition(x, this.ground?.heightAt(x, z) ?? 0, z);
        entity.setEulerAngles(0, 0, 0);
        visual.enabled = true;
        for (const pose of rest) {
            pose.entity.setLocalPosition(pose.position);
            pose.entity.setLocalRotation(pose.rotation);
        }
    }
}
