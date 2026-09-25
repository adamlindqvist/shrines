import type { Entity } from 'playcanvas';

import type { BridgeDefinition, PortalDefinition, ZoneDefinition } from '../levels/types';
import type { PortalHandles } from '../objects/puzzle';
import { BRIDGE } from '../objects/shrine';

import type { Collision, Obstacle } from './collision';
import type { Point } from './puzzle';

export type BridgeHandles = { visual: Entity; blockers: Obstacle[] };
/**
 * `rise` is the whole opening in seconds and `spin` the resting swirl speed in radians/s.
 * `depth` is how far below the plinth the gate starts; it clears the lintel so nothing shows while buried.
 * Opening phases are fractions of `rise`: the plinth rumbles, the gate climbs with a slight overshoot,
 * lands with a squash, then the glow widens and the swirl blooms while spinning down to its resting speed.
 */
export const PORTAL = {
    reach: 0.85,
    rise: 1.1,
    spin: 1.6,
    depth: 2.7,
    climb: { start: 0.08, end: 0.62 },
    land: 0.22,
    bloom: { start: 0.58, end: 1 },
    rumble: 0,
    spinBoost: 4
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, start: number, end: number) => clamp01((t - start) / (end - start));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number, back: number) => 1 + (back + 1) * (t - 1) ** 3 + back * (t - 1) ** 2;
export const BRIDGE_MOTION = { duration: 0.8, depth: 2.4 };

/** Overlapping circles cover the whole deck, including both shore approaches. */
export function createBridgeBlockers(x: number, z: number, length: number): Obstacle[] {
    const blockers: Obstacle[] = [];
    const columns = Math.ceil(BRIDGE.width / 0.5);
    const rows = Math.ceil(length / 0.5);
    for (let column = 0; column <= columns; column++) {
        for (let row = 0; row <= rows; row++) {
            blockers.push({
                x: x - BRIDGE.width / 2 + (column / columns) * BRIDGE.width,
                z: z - length / 2 + (row / rows) * length,
                r: 0.36,
                enabled: true
            });
        }
    }
    return blockers;
}

export class BridgeController {
    state: 'closed' | 'opening' | 'open' = 'closed';
    private progress = 0;
    readonly definition: BridgeDefinition;
    private readonly handles: BridgeHandles;
    constructor(definition: BridgeDefinition, handles: BridgeHandles) {
        this.definition = definition;
        this.handles = handles;
        this.reset();
    }
    open() {
        if (this.state === 'closed') this.state = 'opening';
    }
    update(dt: number) {
        if (this.state !== 'opening') return;
        this.progress = Math.min(1, this.progress + dt / BRIDGE_MOTION.duration);
        if (this.progress >= 1 - 1e-9) {
            this.progress = 1;
            this.state = 'open';
        }
        this.apply();
    }
    reset() {
        this.state = this.definition.state;
        this.progress = this.state === 'open' ? 1 : 0;
        this.apply();
    }
    private apply() {
        const t = this.progress * this.progress * (3 - 2 * this.progress);
        this.handles.visual.setLocalPosition(0, BRIDGE_MOTION.depth * (t - 1), 0);
        for (const blocker of this.handles.blockers) blocker.enabled = this.state !== 'open';
    }
}

export class PortalController {
    unlocked = false;
    reached = false;
    /** Opening progress, 0 while dormant and 1 once the gate is fully risen. */
    progress = 0;
    private spin = 0;
    readonly definition: PortalDefinition;
    private readonly handles: PortalHandles;
    constructor(definition: PortalDefinition, handles: PortalHandles) {
        this.definition = definition;
        this.handles = handles;
        this.reset();
    }
    open() {
        this.unlocked = true;
    }
    /** Advances the opening; `landed` is true on the frame the gate settles onto the plinth. */
    update(dt: number, player: Point, collision: Collision) {
        if (!this.unlocked) return { landed: false };
        const before = this.progress;
        this.progress = Math.min(1, this.progress + dt / PORTAL.rise);
        // The swirl whirls in fast and eases down to its resting speed as the opening completes.
        const boost = 1 + PORTAL.spinBoost * (1 - this.progress) ** 2;
        this.spin = (this.spin + dt * PORTAL.spin * boost) % (Math.PI * 2);
        this.apply();
        const p = this.definition;
        if (
            this.progress >= 1 &&
            Math.abs(collision.heightAt(player.x, player.z) - (p.y ?? 0)) < 0.08 &&
            Math.hypot(player.x - p.x, player.z - p.z) < (p.reach ?? PORTAL.reach)
        )
            this.reached = true;
        const landedAt = PORTAL.climb.end;
        return { landed: before < landedAt && this.progress >= landedAt };
    }
    reset() {
        this.unlocked = !this.definition.locked;
        this.reached = false;
        this.progress = this.unlocked ? 1 : 0;
        this.spin = 0;
        this.apply();
    }
    private apply() {
        const { gate, glow, swirl, sigil, runesDim, runesLit } = this.handles;
        const t = this.progress;
        const { climb, bloom } = PORTAL;
        // Climb from below the plinth, overshooting a hair before settling at rest height.
        const c = span(t, climb.start, climb.end);
        const lift = c <= 0 ? 0 : easeOutBack(c, 0.9);
        // Stretch slightly while climbing, then a damped squash and rebound after landing.
        const l = span(t, climb.end, climb.end + PORTAL.land);
        const squash = l > 0 ? Math.sin(l * Math.PI * 2) * (1 - l) ** 2 * 0.09 : 0;
        const stretch = Math.sin(c * Math.PI) * 0.04;
        const sy = 1 + stretch - squash;
        const sxz = 1 - stretch * 0.5 + squash * 0.5;
        gate.enabled = t > 0;
        gate.setLocalScale(sxz, sy, sxz);
        gate.setLocalPosition(0, -PORTAL.depth * (1 - lift), 0);
        // The plinth trembles while the stone pushes through, quieting as the gate emerges.
        const quake = t > 0 && c < 1 ? PORTAL.rumble * (1 - c) : 0;
        sigil.setLocalPosition(Math.sin(t * 61) * quake, 0, Math.sin(t * 47 + 1.3) * quake * 0.6);
        // The glow widens from the centre and the swirl blooms out once the gate has landed.
        const b = span(t, bloom.start, bloom.end);
        const pane = easeOutCubic(b);
        glow.enabled = b > 0;
        glow.setLocalScale(pane, 0.35 + 0.65 * pane, 1);
        const bloomed = b <= 0 ? 0 : easeOutBack(b, 1.8);
        swirl.enabled = b > 0;
        swirl.setLocalScale(bloomed, 1, bloomed);
        swirl.setLocalEulerAngles(0, (this.spin * 180) / Math.PI, 0);
        runesDim.enabled = t <= 0;
        runesLit.enabled = t > 0;
    }
}

export class ZoneTracker {
    readonly visited = new Set<string>();
    private readonly zones: ZoneDefinition[];
    constructor(zones: ZoneDefinition[]) {
        this.zones = zones;
    }
    update(player: Point & { y: number }) {
        for (const z of this.zones) {
            if (
                player.x >= z.minX &&
                player.x <= z.maxX &&
                player.z >= z.minZ &&
                player.z <= z.maxZ &&
                player.y >= z.minY &&
                player.y <= z.maxY
            )
                this.visited.add(z.id);
        }
    }
    reset() {
        this.visited.clear();
    }
}
