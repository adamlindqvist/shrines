import type { GateDefinition } from '../levels/types';
import { GATE } from '../objects/gate';
import type { GateVisual } from '../objects/gate';

import type { Obstacle } from './collision';

export const GATE_MOTION = { duration: 0.6, depth: GATE.height + 0.15, blockerRadius: 0.25, blockerSpacing: 0.4 };
export type GateHandles = GateVisual & { blockers: Obstacle[] };
/** A solid body's X/Z footprint; reused for collision-safe closing. */
export type GateBody = { x: number; z: number; r: number };

/** Overlapping circles across local X, rotated with the authored gate yaw in degrees. */
export function createGateBlockers({ x, z, width, rotation = 0 }: GateDefinition): Obstacle[] {
    const angle = (rotation * Math.PI) / 180;
    const steps = Math.ceil(width / GATE_MOTION.blockerSpacing);
    return Array.from({ length: steps + 1 }, (_, i) => {
        const offset = -width / 2 + (i * width) / steps;
        return {
            x: x + Math.cos(angle) * offset,
            z: z - Math.sin(angle) * offset,
            r: GATE_MOTION.blockerRadius,
            enabled: true
        };
    });
}

/** Reversible gate with a safety hold whenever its open passage contains a body. */
export class GateController {
    state: 'closed' | 'opening' | 'open' | 'waiting' | 'closing' = 'closed';
    progress = 0;
    desiredOpen = false;
    readonly definition: GateDefinition;
    private readonly handles: GateHandles;

    constructor(definition: GateDefinition, handles: GateHandles) {
        this.definition = definition;
        this.handles = handles;
        this.reset();
    }

    update(dt: number, desiredOpen: boolean, bodies: readonly GateBody[]) {
        this.desiredOpen = desiredOpen;
        const occupied = bodies.some((body) =>
            this.handles.blockers.some(
                (blocker) => Math.hypot(body.x - blocker.x, body.z - blocker.z) <= body.r + blocker.r
            )
        );
        if (!desiredOpen && this.progress === 1 && occupied) {
            this.state = 'waiting';
        } else {
            this.progress = Math.max(
                0,
                Math.min(1, this.progress + ((desiredOpen ? 1 : -1) * dt) / GATE_MOTION.duration)
            );
            if (this.progress >= 1 - 1e-9) this.progress = 1;
            if (this.progress <= 1e-9) this.progress = 0;
            this.state =
                this.progress === 1 ? 'open' : this.progress === 0 ? 'closed' : desiredOpen ? 'opening' : 'closing';
        }
        this.apply();
    }

    reset() {
        this.state = 'closed';
        this.progress = 0;
        this.desiredOpen = false;
        this.apply();
    }

    private apply() {
        const t = this.progress * this.progress * (3 - 2 * this.progress);
        this.handles.panel.setLocalPosition(0, -GATE_MOTION.depth * t, 0);
        this.handles.panel.enabled = this.progress < 1;
        for (const blocker of this.handles.blockers) blocker.enabled = this.progress < 1;
    }
}
