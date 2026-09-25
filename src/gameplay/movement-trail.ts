import { BLEND_NORMAL, Curve, CurveSet, Entity, PARTICLESORT_NEWER_FIRST, Vec3 } from 'playcanvas';
import type { GraphicsDevice, Texture } from 'playcanvas';

import { createRandom } from '../rendering/random';
import { SceneResources } from '../rendering/resources';
import { canvasTexture, paintCanvas } from '../rendering/textures';

export const MOVEMENT_TRAIL = {
    spacingMin: 0.22,
    spacingMax: 0.5,
    lifetime: 0.4,
    capacity: 20,
    offset: 0.4,
    footWidth: 0.24,
    // Raised above low puzzle plates while remaining below the hero's body.
    height: 0.34,
    diameterFrom: 0.38,
    diameterTo: 0.95,
    sizeMin: 0.4,
    sizeMax: 1.25,
    riseSpeed: 0.48
};

type Puff = { entity: Entity; remaining: number };

/** World-space smoke sampled from resolved locomotion, with a gameplay-owned clock. */
export class MovementTrail {
    private readonly pool: Puff[] = [];
    private readonly resources = new SceneResources();
    private texture?: Texture;
    private rand = createRandom(0xd057);
    private untilNext = this.spacing();
    private readonly device: GraphicsDevice;
    private readonly root: Entity;
    private readonly heightAt: (x: number, z: number) => number;

    constructor(device: GraphicsDevice, root: Entity, heightAt: (x: number, z: number) => number) {
        this.device = device;
        this.root = root;
        this.heightAt = heightAt;
    }

    get count() {
        return this.pool.filter((puff) => puff.remaining > 0).length;
    }

    /** Start position and displacement must exclude teleports and damage shoves. */
    sample(x: number, z: number, dx: number, dz: number) {
        const length = Math.hypot(dx, dz);
        if (length < 0.00001) return;
        const ux = dx / length,
            uz = dz / length;
        let next = this.untilNext;
        while (next <= length + 1e-9) {
            const lateral = (this.rand() * 2 - 1) * MOVEMENT_TRAIL.footWidth;
            const puff = this.pool.find((p) => p.remaining <= 0) ?? this.createPuff();
            if (puff) {
                const px = x + ux * (next - MOVEMENT_TRAIL.offset) - uz * lateral,
                    pz = z + uz * (next - MOVEMENT_TRAIL.offset) + ux * lateral;
                puff.entity.setPosition(px, this.heightAt(px, pz) + MOVEMENT_TRAIL.height, pz);
                puff.entity.enabled = true;
                const component = puff.entity.particlesystem!;
                component.reset();
                component.pause();
                // Keep normal depth testing so the hero and nearby scenery can occlude the dust.
                component.emitter!.material!.depthWrite = false;
                component.emitter!.meshInstance.visible = true;
                component.emitter!.addTime(0, false);
                component.emitter!.finishFrame();
                puff.remaining = MOVEMENT_TRAIL.lifetime;
            }
            next += this.spacing();
        }
        this.untilNext = Math.max(0, next - length);
    }

    private spacing() {
        return MOVEMENT_TRAIL.spacingMin + this.rand() * (MOVEMENT_TRAIL.spacingMax - MOVEMENT_TRAIL.spacingMin);
    }

    /** Called only when gameplay effects can advance; the Engine component stays paused. */
    update(dt: number) {
        for (const puff of this.pool) {
            if (puff.remaining <= 0) continue;
            puff.remaining = Math.max(0, puff.remaining - dt);
            if (!puff.remaining) {
                puff.entity.enabled = false;
                continue;
            }
            const emitter = puff.entity.particlesystem!.emitter!;
            emitter.addTime(dt, false);
            emitter.finishFrame();
        }
    }

    reset() {
        this.rand = createRandom(0xd057);
        this.untilNext = this.spacing();
        for (const puff of this.pool) {
            puff.remaining = 0;
            puff.entity.enabled = false;
        }
    }

    destroy() {
        for (const puff of this.pool) puff.entity.destroy();
        this.pool.length = 0;
        this.resources.destroy();
        this.texture = undefined;
    }

    private createPuff(): Puff | undefined {
        if (this.pool.length >= MOVEMENT_TRAIL.capacity) return;
        if (!this.texture) {
            const { c, x } = paintCanvas(128);
            // Dense overlapping lobes give each billow a scalloped silhouette and a soft rim.
            for (const [cx, cy, radius] of [
                [43, 73, 34],
                [78, 77, 33],
                [87, 48, 27],
                [57, 42, 32],
                [61, 66, 35]
            ]) {
                const gradient = x.createRadialGradient(cx, cy, 2, cx, cy, radius);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.65, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.82, 'rgba(245, 245, 239, 0.9)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                x.fillStyle = gradient;
                x.fillRect(0, 0, 128, 128);
            }
            this.texture = this.resources.track(canvasTexture(this.device, c, true, true));
        }
        const entity = new Entity('movement smoke');
        entity.enabled = false;
        this.root.addChild(entity);
        entity.addComponent('particlesystem', {
            numParticles: 1,
            lifetime: MOVEMENT_TRAIL.lifetime,
            rate: 1,
            loop: false,
            startAngle: -40,
            startAngle2: 40,
            autoPlay: false,
            // Each emitter stays at its ground contact until its one puff expires.
            // Local simulation lets pooled emitters restart at a new contact without stale positions.
            localSpace: true,
            // Sorting selects the Engine CPU path: cheaper and deterministic for one particle,
            // without one pair of GPU simulation passes per puff per frame.
            sort: PARTICLESORT_NEWER_FIRST,
            lighting: false,
            blendType: BLEND_NORMAL,
            emitterExtents: new Vec3(0.06, 0, 0.06),
            colorMap: this.texture,
            colorGraph: new CurveSet([
                [0, 1],
                [0, 0.98],
                [0, 0.94]
            ]),
            alphaGraph: new Curve([0, 0, 0.06, 0.95, 0.4, 0.9, 0.7, 0.55, 1, 0]),
            // Engine billboard vertices span -1..1, so scale is half the diameter.
            scaleGraph: new Curve([
                0,
                (MOVEMENT_TRAIL.diameterFrom * MOVEMENT_TRAIL.sizeMin) / 2,
                1,
                (MOVEMENT_TRAIL.diameterTo * MOVEMENT_TRAIL.sizeMin) / 2
            ]),
            scaleGraph2: new Curve([
                0,
                (MOVEMENT_TRAIL.diameterFrom * MOVEMENT_TRAIL.sizeMax) / 2,
                1,
                (MOVEMENT_TRAIL.diameterTo * MOVEMENT_TRAIL.sizeMax) / 2
            ]),
            rotationSpeedGraph: new Curve([0, -35]),
            rotationSpeedGraph2: new Curve([0, 35]),
            velocityGraph: new CurveSet([
                [0, -0.06],
                [0, MOVEMENT_TRAIL.riseSpeed * 0.7],
                [0, -0.06]
            ]),
            velocityGraph2: new CurveSet([
                [0, 0.06],
                [0, MOVEMENT_TRAIL.riseSpeed * 1.3],
                [0, 0.06]
            ])
        });
        const puff = { entity, remaining: 0 };
        this.pool.push(puff);
        return puff;
    }
}
