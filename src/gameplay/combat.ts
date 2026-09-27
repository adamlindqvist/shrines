import type { Slime } from './slimes';

export const SWORD = {
    swingTime: 0.3,
    cooldown: 0.3,
    /** Hits land while the remaining swing time is inside this window. */
    activeFrom: 0.25,
    activeUntil: 0.13,
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
    private activePending = false;

    /** World-space heading captured at attack start, in radians. */
    get attackHeading() {
        return this.heading;
    }

    /** Consumes the transition into the damaging slash once per attack. */
    consumeActiveStart() {
        const pending = this.activePending;
        this.activePending = false;
        return pending;
    }
    private readonly hitThisSwing = new Set<Slime>();

    tick(dt: number) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        const before = this.swing;
        this.swing = Math.max(0, this.swing - dt);
        if (before > SWORD.activeFrom && this.swing <= SWORD.activeFrom) this.activePending = true;
    }

    get ready() {
        return this.cooldown <= 0;
    }

    start(heading: number) {
        this.swing = SWORD.swingTime;
        this.cooldown = SWORD.cooldown;
        this.heading = heading;
        this.activePending = false;
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
        this.heading = 0;
        this.activePending = false;
        this.hitThisSwing.clear();
    }
}

export const SHIELD = {
    /** Frontal half-angle in radians: 160 degrees of protection in total. */
    cone: (80 * Math.PI) / 180,
    walkScale: 0.5,
    recoilTime: 0.18,
    shove: 0.12
};

/** Held guard and brief impact reaction, both advanced on the gameplay clock. */
export class Shield {
    raised = false;
    recoil = 0;
    blocks = 0;

    update(dt: number, held: boolean, available: boolean) {
        this.raised = held && available;
        this.recoil = Math.max(0, this.recoil - dt);
    }

    /** (dx, dz) points from the player toward the attacker; heading is in radians. */
    block(dx: number, dz: number, heading: number) {
        const distance = Math.hypot(dx, dz);
        if (!this.raised || distance === 0) return false;
        if ((dx * Math.sin(heading) + dz * Math.cos(heading)) / distance < Math.cos(SHIELD.cone)) return false;
        this.recoil = SHIELD.recoilTime;
        this.blocks++;
        return true;
    }

    reset() {
        this.raised = false;
        this.recoil = 0;
        this.blocks = 0;
    }
}
