import type { Slime } from './slimes';

export const SWORD = {
    swingTime: 0.28,
    cooldown: 0.42,
    /** Hits land while the remaining swing time is inside this window. */
    activeFrom: 0.21,
    activeUntil: 0.07,
    reach: 1.85,
    /** Half-angle of the frontal cone, in radians. Targets closer than `pointBlank` are always hit. */
    cone: 1.15,
    pointBlank: 0.6,
    knockback: 6,
    stagger: 0.32,
    staggerCooldown: 0.65
};

/** The adventurer's sword: swing timing and a frontal-cone hit test, one hit per slime per swing. */
export class Sword {
    swing = 0;
    cooldown = 0;
    private heading = 0;
    private readonly hitThisSwing = new Set<Slime>();

    tick(dt: number) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.swing = Math.max(0, this.swing - dt);
    }

    get ready() {
        return this.cooldown <= 0;
    }

    start(heading: number) {
        this.swing = SWORD.swingTime;
        this.cooldown = SWORD.cooldown;
        this.heading = heading;
        this.hitThisSwing.clear();
    }

    /** Damages slimes in the swing's cone from (px, pz), calling `onHit` for each new hit. */
    applyHits(px: number, pz: number, slimes: Slime[], onHit: (slime: Slime) => void) {
        if (this.swing < SWORD.activeUntil || this.swing > SWORD.activeFrom) return;
        const fx = Math.sin(this.heading),
            fz = Math.cos(this.heading);
        for (const e of slimes) {
            const dx = e.x - px,
                dz = e.z - pz,
                dist = Math.hypot(dx, dz);
            if (e.hp <= 0 || this.hitThisSwing.has(e) || dist > SWORD.reach) continue;
            if (dist > SWORD.pointBlank && (dx * fx + dz * fz) / dist < Math.cos(SWORD.cone)) continue;
            this.hitThisSwing.add(e);
            e.hp--;
            e.hurt = SWORD.stagger;
            e.cool = SWORD.staggerCooldown;
            e.windup = 0;
            e.vx = (dx / (dist || 1)) * SWORD.knockback;
            e.vz = (dz / (dist || 1)) * SWORD.knockback;
            onHit(e);
        }
    }

    reset() {
        this.swing = 0;
        this.cooldown = 0;
    }
}
