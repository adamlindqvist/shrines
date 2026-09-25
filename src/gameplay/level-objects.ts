import type { Entity } from 'playcanvas';

import type { BridgeDefinition, PortalDefinition, ZoneDefinition } from '../levels/types';
import type { PortalHandles } from '../objects/puzzle';
import { BRIDGE } from '../objects/shrine';

import type { Collision, Obstacle } from './collision';
import type { Point } from './puzzle';

export type BridgeHandles = { visual: Entity; blockers: Obstacle[] };
/** `rise` in seconds, `spin` in radians/s, `sink` is how far below ground the gate starts. */
export const PORTAL = { reach: 0.85, rise: 0.9, spin: 1.6, sink: -0.4 };
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
    update(dt: number, player: Point, collision: Collision) {
        if (!this.unlocked) return;
        this.progress = Math.min(1, this.progress + dt / PORTAL.rise);
        this.spin = (this.spin + dt * PORTAL.spin) % (Math.PI * 2);
        this.apply();
        const p = this.definition;
        if (
            this.progress >= 1 &&
            Math.abs(collision.heightAt(player.x, player.z) - (p.y ?? 0)) < 0.08 &&
            Math.hypot(player.x - p.x, player.z - p.z) < (p.reach ?? PORTAL.reach)
        )
            this.reached = true;
    }
    reset() {
        this.unlocked = !this.definition.locked;
        this.reached = false;
        this.progress = this.unlocked ? 1 : 0;
        this.spin = 0;
        this.apply();
    }
    private apply() {
        const { gate, swirl, sigil, runesDim, runesLit } = this.handles;
        const t = this.progress;
        // Ease out with a small overshoot, settling exactly at 1.
        const back = 1.6;
        const u = t - 1;
        const scale = t <= 0 ? 0 : 1 + (back + 1) * u * u * u + back * u * u;
        gate.enabled = t > 0;
        gate.setLocalScale(scale, scale, scale);
        gate.setLocalPosition(0, PORTAL.sink * (1 - t) * (1 - t), 0);
        swirl.setLocalEulerAngles(0, (this.spin * 180) / Math.PI, 0);
        sigil.setLocalPosition(0, -0.012 * t, 0);
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
