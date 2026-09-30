import type { Entity } from 'playcanvas';

import { appendRoundedBox, createGeo, meshEntity } from '../rendering/geometry';
import { node } from '../rendering/primitives';

import type { PropContext } from './context';

/** Dry-land gate dimensions in world units. Width is the space between the posts. */
export const GATE = { minWidth: 3.2, height: 2, depth: 0.3, postSize: 0.7, postHeight: 2.35, barSpacing: 0.55 };
export type GateVisual = { entity: Entity; panel: Entity };

/** Rounded sandstone posts and a warm wooden grille that slides below the ground. */
export function createGate({ device, palette }: PropContext, root: Entity, width: number): GateVisual {
    const stone = createGeo();
    for (const side of [-1, 1]) {
        const x = (side * (width + GATE.postSize)) / 2;
        appendRoundedBox(stone, x, GATE.postHeight / 2, 0, GATE.postSize, GATE.postHeight, 0.8, 0.14, 5);
        appendRoundedBox(stone, x, GATE.postHeight, 0, 0.84, 0.16, 0.94, 0.07, 5);
    }
    meshEntity(device, root, 'sandstone gate posts', stone, palette.sandstone);
    const panel = node(root, 'sliding wooden gate');
    const wood = createGeo();
    const bars = Math.ceil(width / GATE.barSpacing);
    for (let i = 0; i <= bars; i++) {
        const x = -width / 2 + (i * width) / bars;
        appendRoundedBox(wood, x, GATE.height / 2, 0, 0.16, GATE.height, GATE.depth, 0.06, 4);
    }
    for (const y of [0.38, 1.58]) {
        appendRoundedBox(wood, 0, y, 0, width, 0.2, GATE.depth + 0.05, 0.06, 4);
    }
    meshEntity(device, panel, 'wooden gate grille', wood, palette.bark);
    const trim = createGeo();
    appendRoundedBox(trim, 0, 1.58, 0.2, 0.52, 0.52, 0.1, 0.12, 5);
    meshEntity(device, panel, 'golden gate seal', trim, palette.gold);
    return { entity: root, panel };
}
