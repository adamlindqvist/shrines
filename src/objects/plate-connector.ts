import type { Entity } from 'playcanvas';

import { appendPrism, createGeo, meshEntity } from '../rendering/geometry';
import { roundedBox } from '../rendering/primitives';

import type { PropContext } from './context';

export const PLATE_CONNECTOR = { edge: 1.1, width: 0.22, chevronWidth: 0.3, count: 3 };

export type PlateConnectorHandles = {
    entity: Entity;
    /** Ordered from the prerequisite plate toward the dependent plate. */
    chevrons: Entity[];
};

/** Ground inlay extending along local +Z; its owner supplies placement and yaw. */
export function createPlateConnector(ctx: PropContext, root: Entity, length: number): PlateConnectorHandles {
    const { device, palette } = ctx;
    roundedBox(
        device,
        root,
        'dependency stone inlay',
        palette.sandstone,
        0,
        0.02,
        0,
        PLATE_CONNECTOR.width,
        0.03,
        length,
        0.015
    );
    const chevrons = Array.from({ length: PLATE_CONNECTOR.count }, (_, i) => {
        const g = createGeo();
        const half = PLATE_CONNECTOR.chevronWidth / 2;
        // Two convex strokes form a chevron, avoiding a concave triangle fan.
        for (const side of [-1, 1]) {
            const points = [
                [0, 0.14],
                [side * half, -0.06],
                [side * half, -0.15],
                [0, 0.05]
            ];
            const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
            const cz = points.reduce((sum, p) => sum + p[1], 0) / points.length;
            const centered = points.map(([x, z]) => [x - cx, z - cz]);
            appendPrism(g, side > 0 ? centered.reverse() : centered, cx, 0.035, 0.048, cz);
        }
        const mark = meshEntity(device, root, `dependency chevron ${i + 1}`, g, palette.stone, false, true);
        mark.setLocalPosition(0, 0, -length / 2 + (length * (i + 1)) / (PLATE_CONNECTOR.count + 1));
        return mark;
    });
    return { entity: root, chevrons };
}
