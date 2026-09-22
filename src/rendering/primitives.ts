import { Entity } from 'playcanvas';
import type { GraphicsDevice, Material } from 'playcanvas';

import { appendRoundedBox, createGeo, meshEntity } from './geometry';

/** Empty transform node, positioned locally under `parent`. */
export function node(parent: Entity, name: string, x = 0, y = 0, z = 0) {
    const e = new Entity(name);
    parent.addChild(e);
    e.setLocalPosition(x, y, z);
    return e;
}

/** Built-in engine primitive (sphere, box, cylinder…) scaled to size. */
export function shape(
    parent: Entity,
    name: string,
    type: string,
    material: Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number
) {
    const e = node(parent, name, x, y, z);
    e.addComponent('render', { type, castShadows: true, receiveShadows: true });
    e.setLocalScale(sx, sy, sz);
    e.render!.meshInstances[0].material = material;
    return e;
}

export const sphere = (
    parent: Entity,
    name: string,
    material: Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy = sx,
    sz = sx
) => shape(parent, name, 'sphere', material, x, y, z, sx, sy, sz);

export const box = (
    parent: Entity,
    name: string,
    material: Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number
) => shape(parent, name, 'box', material, x, y, z, sx, sy, sz);

export const cylinder = (
    parent: Entity,
    name: string,
    material: Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number
) => shape(parent, name, 'cylinder', material, x, y, z, sx, sy, sz);

/** Procedural rounded box centred at (x, y, z). */
export function roundedBox(
    device: GraphicsDevice,
    parent: Entity,
    name: string,
    material: Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    r: number
) {
    const g = createGeo();
    appendRoundedBox(g, 0, 0, 0, w, h, d, r, 7);
    const e = meshEntity(device, parent, name, g, material);
    e.setLocalPosition(x, y, z);
    return e;
}
