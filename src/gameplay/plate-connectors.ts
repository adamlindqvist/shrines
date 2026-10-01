import type { Material } from 'playcanvas';

import type { PlateConnectorHandles } from '../objects/plate-connector';

/** Time in gameplay seconds for the complete source-to-target lighting sequence. */
export const PLATE_CONNECTOR_MOTION = { duration: 0.45 };

/** Lights a dependency inlay from its prerequisite toward the newly ready plate. */
export class PlateConnectorController {
    private elapsed = 0;
    readonly sourceId: string;
    private readonly handles: PlateConnectorHandles;
    private readonly materials: { idle: Material; lit: Material };

    constructor(sourceId: string, handles: PlateConnectorHandles, materials: { idle: Material; lit: Material }) {
        this.sourceId = sourceId;
        this.handles = handles;
        this.materials = materials;
        this.reset();
    }

    /** Called only while playing; dt is the clamped gameplay time in seconds. */
    update(dt: number, active: boolean) {
        this.elapsed = active ? Math.min(PLATE_CONNECTOR_MOTION.duration, this.elapsed + dt) : 0;
        const count = this.handles.chevrons.length;
        this.handles.chevrons.forEach((mark, i) => {
            // Keep exact beat boundaries stable under floating-point accumulation.
            const lit = active && this.elapsed + 1e-9 >= (PLATE_CONNECTOR_MOTION.duration * (i + 1)) / count;
            mark.render!.meshInstances[0].material = lit ? this.materials.lit : this.materials.idle;
        });
    }

    reset() {
        this.update(0, false);
    }
}
