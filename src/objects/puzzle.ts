import type { Entity } from 'playcanvas';

import { appendLathe, appendPrism, appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import { box, node, roundedBox, sphere } from '../rendering/primitives';

import type { PropContext } from './context';

/** Pushable turquoise block with faces aligned to `root`. */
export function createPushBlock({ device, palette: c }: PropContext, root: Entity) {
    const blockSpin = node(root, 'block facing');
    roundedBox(device, blockSpin, 'rounded teal block', c.teal, 0, 0.66, 0, 1.46, 1.32, 1.46, 0.2);
    for (const [ax, az] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0]
    ]) {
        roundedBox(
            device,
            blockSpin,
            'inset face',
            c.tealDark,
            ax * 0.724,
            0.66,
            az * 0.724,
            ax ? 0.04 : 1.0,
            0.9,
            az ? 0.04 : 1.0,
            0.1
        );
    }
    roundedBox(device, blockSpin, 'top inset border', c.tealDark, 0, 1.326, 0, 1.06, 0.022, 1.06, 0.09);
    roundedBox(device, blockSpin, 'top enamel panel', c.teal, 0, 1.341, 0, 0.96, 0.018, 0.96, 0.08);
    return { entity: root };
}

export type SunSwitchHandles = {
    entity: Entity;
    /** Gold star inlay; recoloured when the switch activates. */
    sunDisk: Entity;
};

/**
 * Sandstone pressure plate. `yaw` is the plinth's rotation in degrees, which
 * the sun inlay counter-rotates so its rays stay aligned with the world axes.
 */
export function createSunSwitch({ device, palette: c }: PropContext, root: Entity, yaw: number): SunSwitchHandles {
    roundedBox(device, root, 'sandstone plinth', c.sandstone, 0, 0.11, 0, 2.1, 0.22, 2.1, 0.12);
    roundedBox(device, root, 'plinth groove', c.barkLight, 0, 0.226, 0, 1.8, 0.02, 1.8, 0.09);
    roundedBox(device, root, 'plinth inner', c.sandstone, 0, 0.236, 0, 1.66, 0.02, 1.66, 0.08);
    roundedBox(device, root, 'groove line', c.barkLight, 0, 0.246, 0, 1.48, 0.02, 1.48, 0.07);
    roundedBox(device, root, 'ivory inset', c.cream, 0, 0.256, 0, 1.36, 0.02, 1.36, 0.06);
    const poly: number[][] = [];
    for (let i = 0; i < 8; i++) {
        const a0 = (i * Math.PI) / 4,
            w = 0.28;
        poly.push([Math.cos(a0 - w) * 0.44, Math.sin(a0 - w) * 0.44]);
        poly.push([Math.cos(a0) * 0.82, Math.sin(a0) * 0.82]);
        poly.push([Math.cos(a0 + w) * 0.44, Math.sin(a0 + w) * 0.44]);
        for (let k = 1; k < 4; k++) {
            const a = a0 + w + ((Math.PI / 4 - 2 * w) * k) / 4;
            poly.push([Math.cos(a) * 0.44, Math.sin(a) * 0.44]);
        }
    }
    const g = createGeo();
    appendPrism(g, poly, 0, 0, 0.1, 0);
    appendSphere(g, 0, 0.02, 0, 0.46, 0.17, 0.46, 18, 8);
    const sunDisk = meshEntity(device, root, 'sun disc', g, c.gold);
    sunDisk.setLocalPosition(0, 0.266, 0);
    sunDisk.setLocalEulerAngles(0, -yaw, 0);
    return { entity: root, sunDisk };
}

export type ChestHandles = {
    entity: Entity;
    /** Hinged lid pivot, rotated about X to open. */
    lid: Entity;
};

export const CHEST_RADIUS = 0.78;

/** Banded treasure chest with a barrel lid, standing on the origin of `root`. */
export function createTreasureChest({ device, palette: c }: PropContext, root: Entity): ChestHandles {
    roundedBox(device, root, 'wood chest', c.brown, 0, 0.44, 0, 1.52, 0.82, 1.0, 0.1);
    for (const x of [-0.44, 0, 0.44]) box(root, 'plank groove', c.black, x, 0.46, 0.508, 0.035, 0.64, 0.012);
    const lid = node(root, 'treasure lid', 0, 0.83, -0.5);
    {
        const g = createGeo();
        appendLathe(
            g,
            [
                [0, -0.76],
                [0.46, -0.76],
                [0.48, -0.68],
                [0.49, 0.68],
                [0.46, 0.76],
                [0, 0.76]
            ],
            0,
            0,
            0,
            18
        );
        const shell = meshEntity(device, lid, 'barrel lid', g, c.brown);
        shell.setLocalPosition(0, 0.03, 0.5);
        shell.setLocalEulerAngles(0, 0, 90);
        shell.setLocalScale(1.58, 1, 1);
    }
    for (const x of [-0.62, 0.62]) {
        box(root, 'gold chest band', c.gold, x, 0.45, 0, 0.14, 0.88, 1.05);
        const g = createGeo();
        appendLathe(
            g,
            [
                [0, -0.07],
                [0.51, -0.07],
                [0.52, 0.07],
                [0, 0.07]
            ],
            0,
            0,
            0,
            18
        );
        const band = meshEntity(device, lid, 'gold lid band', g, c.gold);
        band.setLocalPosition(x, 0.03, 0.5);
        band.setLocalEulerAngles(0, 0, 90);
        band.setLocalScale(1.58, 1, 1);
    }
    box(root, 'gold chest rim', c.gold, 0, 0.82, 0, 1.56, 0.1, 1.04);
    box(root, 'lock plate', c.gold, 0, 0.63, 0.515, 0.34, 0.36, 0.07);
    sphere(root, 'keyhole', c.black, 0, 0.675, 0.555, 0.075, 0.09, 0.03);
    box(root, 'keyhole stem', c.black, 0, 0.615, 0.555, 0.04, 0.09, 0.03);
    return { entity: root, lid };
}
