import type { Entity } from 'playcanvas';

import type { PlatformDefinition } from '../levels/types';

import type { WalkSurface } from './collision';
import type { Point } from './puzzle';

export type PlatformHandles = { entity: Entity; visual: Entity; surface: WalkSurface };

/**
 * `minSize` fits the player beside a carried box. A dormant stone rests `depth` below its
 * deck and rises over `riseTime` seconds; it only carries riders once fully risen.
 */
export const PLATFORM = { minSize: 3.2, riseTime: 0.8, depth: 2.4 };

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Drifts a floating stone back and forth; riders are moved by the caller from the returned delta. */
export class PlatformController {
    state: 'dormant' | 'rising' | 'active' = 'dormant';
    /** Motion clock in seconds, advancing only while active. */
    private clock = 0;
    private rise = 0;
    readonly definition: PlatformDefinition;
    private readonly handles: PlatformHandles;

    constructor(definition: PlatformDefinition, handles: PlatformHandles) {
        this.definition = definition;
        this.handles = handles;
        this.reset();
    }

    /** Current deck centre on X/Z. */
    get position(): Point {
        const s = this.handles.surface;
        return { x: (s.minX + s.maxX) / 2, z: (s.minZ + s.maxZ) / 2 };
    }

    /** Whether the deck carries riders at (x, z); check before `update` moves it. */
    contains(x: number, z: number) {
        const s = this.handles.surface;
        return this.state === 'active' && x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ;
    }

    activate() {
        if (this.state === 'dormant') this.state = 'rising';
    }

    /** Advances the rise or drift and returns how far the deck moved this frame. */
    update(dt: number) {
        const before = this.position;
        if (this.state === 'rising') {
            this.rise = Math.min(1, this.rise + dt / PLATFORM.riseTime);
            if (this.rise >= 1 - 1e-9) {
                this.rise = 1;
                this.state = 'active';
            }
        } else if (this.state === 'active') this.clock = (this.clock + dt) % this.cycle;
        this.apply();
        const after = this.position;
        return { dx: after.x - before.x, dz: after.z - before.z };
    }

    reset() {
        this.state = this.definition.state;
        this.rise = this.state === 'active' ? 1 : 0;
        this.clock = ((this.definition.phase % this.cycle) + this.cycle) % this.cycle;
        this.apply();
    }

    private get cycle() {
        return 2 * (this.definition.duration + this.definition.dwell);
    }

    /** Travel progress from the start end (0) to the far end (1): dwell, glide, dwell, glide back. */
    private progress() {
        const { duration, dwell } = this.definition;
        const t = this.clock;
        if (t < dwell) return 0;
        if (t < dwell + duration) return smooth((t - dwell) / duration);
        if (t < 2 * dwell + duration) return 1;
        return 1 - smooth((t - 2 * dwell - duration) / duration);
    }

    private apply() {
        const { x, z, travel, width, depth } = this.definition;
        const s = this.progress();
        const cx = x + travel.x * s,
            cz = z + travel.z * s;
        const surface = this.handles.surface;
        surface.minX = cx - width / 2;
        surface.maxX = cx + width / 2;
        surface.minZ = cz - depth / 2;
        surface.maxZ = cz + depth / 2;
        surface.enabled = this.state === 'active';
        this.handles.entity.setPosition(cx, 0, cz);
        this.handles.visual.setLocalPosition(0, PLATFORM.depth * (smooth(this.rise) - 1), 0);
    }
}
