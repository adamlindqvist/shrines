import type { Entity } from 'playcanvas';

import type { SlimeHandles } from '../objects/slime';

import type { Collision } from './collision';

export const SLIME = {
    health: 3,
    radius: 0.4,
    /** Distance at which a slime notices and chases the player. */
    sight: 4.0,
    chaseSpeed: 1.2,
    wanderSpeed: 0.25,
    /** Distance at which a slime starts winding up an attack. */
    reach: 1.15,
    /** A strike lands if the player is still within this distance. */
    strikeRange: 1.25,
    windup: 0.45,
    missCooldown: 1.25,
    hitCooldown: 1.5,
    deathTime: 0.45
};

export type Slime = {
    handles: SlimeHandles;
    x: number;
    z: number;
    homeX: number;
    homeZ: number;
    hp: number;
    /** Time until the slime may start another attack. */
    cool: number;
    /** Stagger time after being hit. */
    hurt: number;
    /** Knockback velocity, decaying each frame. */
    vx: number;
    vz: number;
    mode: 'wander' | 'chase' | 'attack';
    /** Attack wind-up countdown; the strike lands as it reaches zero. */
    windup: number;
    /** Death animation countdown. */
    death: number;
};

/** What slimes can attack. `canBeHit` is asked at the moment a strike lands. */
export type SlimeTarget = {
    entity: Entity;
    canBeHit(): boolean;
    /** A strike landed; (dx, dz) is the unnormalised push direction and `d` its length. */
    hit(dx: number, dz: number, d: number): void;
};

/** Wandering, chasing, winding up and striking — plus knockback and the death pop. */
export class SlimePack {
    readonly slimes: Slime[];

    private readonly collision: Collision;

    constructor(handles: SlimeHandles[], collision: Collision) {
        this.collision = collision;
        this.slimes = handles.map((h) => {
            const p = h.entity.getLocalPosition();
            return {
                handles: h,
                x: p.x,
                z: p.z,
                homeX: p.x,
                homeZ: p.z,
                hp: SLIME.health,
                cool: 0,
                hurt: 0,
                vx: 0,
                vz: 0,
                mode: 'wander',
                windup: 0,
                death: 0
            };
        });
    }

    update(dt: number, time: number, target: SlimeTarget) {
        const slimes = this.slimes;
        for (let i = 0; i < slimes.length; i++) {
            const e = slimes[i];
            const { entity, body } = e.handles;
            if (e.hp <= 0) {
                e.death = Math.max(0, e.death - dt);
                const t = e.death / SLIME.deathTime;
                entity.setLocalScale(Math.max(0.01, t), Math.max(0.01, t * (1.7 - t)), Math.max(0.01, t));
                entity.setPosition(e.x, this.collision.heightAt(e.x, e.z) + Math.sin((1 - t) * Math.PI) * 0.65, e.z);
                if (t === 0) entity.enabled = false;
                continue;
            }
            e.cool = Math.max(0, e.cool - dt);
            e.hurt = Math.max(0, e.hurt - dt);
            const p = target.entity.getPosition(),
                ex = p.x - e.x,
                ez = p.z - e.z,
                d = Math.hypot(ex, ez);
            e.mode = e.windup > 0 ? 'attack' : d < SLIME.sight ? 'chase' : 'wander';
            let vx = 0,
                vz = 0;
            if (e.hurt === 0 && e.windup === 0) {
                if (d < SLIME.sight && d > 0.8) {
                    vx = (ex / d) * SLIME.chaseSpeed;
                    vz = (ez / d) * SLIME.chaseSpeed;
                } else if (d >= SLIME.sight) {
                    vx = Math.cos(time * 0.55 + i * 3) * SLIME.wanderSpeed;
                    vz = Math.sin(time * 0.55 + i * 3) * SLIME.wanderSpeed;
                }
            }
            const safe = this.collision.resolve(e.x + (vx + e.vx) * dt, e.z + (vz + e.vz) * dt, SLIME.radius);
            // Slimes never hop or get knocked into open water.
            if (this.collision.canTravel(e, safe) && !this.collision.isWater(safe.x, safe.z)) {
                e.x = safe.x;
                e.z = safe.z;
            }
            e.vx *= Math.exp(-9 * dt);
            e.vz *= Math.exp(-9 * dt);
            entity.setPosition(
                e.x,
                this.collision.heightAt(e.x, e.z) + Math.max(0, Math.sin(time * 5 + i)) * 0.09,
                e.z
            );
            if (d < SLIME.sight) entity.setEulerAngles(0, (Math.atan2(ex, ez) * 180) / Math.PI, 0);
            const squash =
                e.hurt > 0 ? 0.7 : e.windup > 0 ? 0.68 + Math.sin(time * 28) * 0.04 : 1 + Math.sin(time * 5 + i) * 0.06;
            body.setLocalScale(1 / squash, squash, 1 / squash);
            if (d < SLIME.reach && e.cool === 0 && e.hurt === 0 && e.windup === 0) e.windup = SLIME.windup;
            const striking = e.windup > 0 && e.windup <= dt;
            e.windup = Math.max(0, e.windup - dt);
            if (striking) e.cool = SLIME.missCooldown;
            if (striking && d < SLIME.strikeRange && target.canBeHit()) {
                e.cool = SLIME.hitCooldown;
                target.hit(ex, ez, d);
            }
        }
    }

    reset() {
        for (const e of this.slimes) {
            const { entity, body } = e.handles;
            e.death = 0;
            e.windup = 0;
            body.setLocalScale(1, 1, 1);
            entity.setLocalScale(1, 1, 1);
            e.x = e.homeX;
            e.z = e.homeZ;
            e.hp = SLIME.health;
            e.cool = 0;
            e.hurt = 0;
            e.vx = e.vz = 0;
            entity.enabled = true;
            entity.setPosition(e.x, this.collision.heightAt(e.x, e.z), e.z);
        }
    }
}
