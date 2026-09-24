import type { Entity } from 'playcanvas';

import type { BridgeDefinition, ChestDefinition, ZoneDefinition } from '../levels/types';
import type { ChestHandles } from '../objects/puzzle';
import { BRIDGE } from '../objects/shrine';

import type { Collision, Obstacle } from './collision';
import type { Point } from './puzzle';

export type BridgeHandles = { visual: Entity; blockers: Obstacle[] };
export const CHEST = { reach: 1.7, lidSpeed: 150 };
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

export class ChestController {
    unlocked = false;
    reached = false;
    private angle = 0;
    readonly definition: ChestDefinition;
    private readonly handles: ChestHandles;
    constructor(definition: ChestDefinition, handles: ChestHandles) {
        this.definition = definition;
        this.handles = handles;
        this.reset();
    }
    unlock() {
        this.unlocked = true;
    }
    update(dt: number, player: Point, collision: Collision) {
        if (!this.unlocked) return;
        this.angle = Math.min(100, this.angle + dt * CHEST.lidSpeed);
        this.handles.lid.setLocalEulerAngles(-this.angle, 0, 0);
        const c = this.definition;
        if (
            Math.abs(collision.heightAt(player.x, player.z) - (c.y ?? 0)) < 0.08 &&
            Math.hypot(player.x - c.x, player.z - c.z) < (c.reach ?? CHEST.reach)
        )
            this.reached = true;
    }
    reset() {
        this.unlocked = !this.definition.locked;
        this.reached = false;
        this.angle = 0;
        this.handles.lid.setLocalEulerAngles(0, 0, 0);
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
