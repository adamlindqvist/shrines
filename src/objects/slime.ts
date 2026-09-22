import type { Entity } from 'playcanvas';

import { appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import { node, sphere } from '../rendering/primitives';

import type { PropContext } from './context';

export type SlimeHandles = {
    entity: Entity;
    /** Inner pivot squashed and stretched by the slime behaviour. */
    body: Entity;
};

/** Strawberry slime sitting on the origin of `root`, facing +Z. */
export function createSlime({ device, palette }: PropContext, root: Entity): SlimeHandles {
    const body = node(root, 'slime squash');
    const g = createGeo();
    appendSphere(g, 0, 0.38, 0, 0.6, 0.53, 0.55, 22, 14);
    meshEntity(device, body, 'pink jelly', g, palette.pink);
    for (const ex of [-0.15, 0.15]) sphere(body, 'slime eye', palette.black, ex, 0.43, 0.535, 0.075, 0.16, 0.06);
    sphere(body, 'slime glint', palette.cream, -0.2, 0.76, 0.28, 0.085, 0.075, 0.05);
    return { entity: root, body };
}
