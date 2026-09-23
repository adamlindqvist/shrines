import type { Entity, Material, Vec3 } from 'playcanvas';

import { box, sphere } from '../rendering/primitives';
import type { Random } from '../rendering/random';

type Particle = {
    entity: Entity;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    max: number;
    scale: Vec3;
    gravity: boolean;
};

/** Short-lived sparks and sword arcs, owned by one scene. */
export class Effects {
    private readonly particles: Particle[] = [];

    private readonly parent: Entity;
    private readonly rand: Random;

    constructor(parent: Entity, rand: Random) {
        this.parent = parent;
        this.rand = rand;
    }

    get count() {
        return this.particles.length;
    }

    /** Pops `count` cubes out of the ground at (x, z) that fall under gravity. */
    burst(x: number, z: number, material: Material, count = 9) {
        const rand = this.rand;
        for (let i = 0; i < count; i++) {
            const e = box(this.parent, 'spark', material, x, 0.4 + rand() * 0.3, z, 0.09, 0.09, 0.09);
            this.particles.push({
                entity: e,
                vx: (rand() - 0.5) * 3,
                vy: 1.5 + rand() * 2,
                vz: (rand() - 0.5) * 3,
                life: 0.45 + rand() * 0.3,
                max: 0.75,
                scale: e.getLocalScale().clone(),
                gravity: true
            });
        }
    }

    /** A small ring of sandy grains kicked outward from the block's footprint. */
    sand(x: number, z: number, material: Material) {
        for (let i = 0; i < 14; i++) {
            const angle = ((i + this.rand() * 0.5) * Math.PI * 2) / 14;
            const dx = Math.cos(angle),
                dz = Math.sin(angle);
            const radius = 0.77 / Math.max(Math.abs(dx), Math.abs(dz));
            const size = 0.055 + this.rand() * 0.045;
            const e = box(
                this.parent,
                'sand grain',
                material,
                x + dx * radius,
                0.08,
                z + dz * radius,
                size,
                size,
                size
            );
            e.render!.castShadows = false;
            const life = 0.35 + this.rand() * 0.15;
            const speed = 0.7 + this.rand() * 0.7;
            this.particles.push({
                entity: e,
                vx: dx * speed,
                vy: 0.95 + this.rand() * 0.45,
                vz: dz * speed,
                life,
                max: life,
                scale: e.getLocalScale().clone(),
                gravity: true
            });
        }
    }

    /** A fan of glints 1.45 units out from (x, z), centred on `heading` radians. */
    arc(x: number, z: number, heading: number, material: Material) {
        for (let i = 0; i < 14; i++) {
            const a = heading - 1.15 + (i / 13) * 2.3;
            const e = sphere(
                this.parent,
                'golden sword arc',
                material,
                x + Math.sin(a) * 1.45,
                0.52,
                z + Math.cos(a) * 1.45,
                0.14,
                0.07,
                0.14
            );
            this.particles.push({
                entity: e,
                vx: Math.sin(a) * 0.4,
                vy: 0,
                vz: Math.cos(a) * 0.4,
                life: 0.23,
                max: 0.23,
                scale: e.getLocalScale().clone(),
                gravity: false
            });
        }
    }

    update(dt: number) {
        const particles = this.particles;
        for (let i = particles.length - 1; i >= 0; i--) {
            const e = particles[i];
            e.life -= dt;
            if (e.life <= 0) {
                e.entity.destroy();
                particles.splice(i, 1);
                continue;
            }
            if (e.gravity) e.vy -= dt * 5;
            e.entity.translate(e.vx * dt, e.vy * dt, e.vz * dt);
            const s = Math.min(1, (e.life / e.max) * 2);
            e.entity.setLocalScale(e.scale.x * s, e.scale.y * s, e.scale.z * s);
        }
    }

    clear() {
        for (const e of this.particles) e.entity.destroy();
        this.particles.length = 0;
    }
}
