import type { Entity, Material } from 'playcanvas';

import { appendLathe, appendPrism, appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';
import { box, node, roundedBox, sphere } from '../rendering/primitives';

import type { PropContext } from './context';

export type PuzzleSymbol = 'sun' | 'moon';

export type PushBlockHandles = {
    entity: Entity;
    visual: Entity;
    available: Entity;
    selected: Entity;
};

/** Grabbable turquoise block with state-driven interaction frames. */
export function createPushBlock(
    { device, palette: c }: PropContext,
    root: Entity,
    symbol: PuzzleSymbol = 'sun'
): PushBlockHandles {
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
    const top = createSymbol({ device, palette: c }, blockSpin, symbol, c.cream);
    top.setLocalPosition(0, 1.355, 0);
    for (const yaw of [0, 90, 180, 270]) {
        const face = node(blockSpin, 'symbol face');
        face.setLocalEulerAngles(0, yaw, 0);
        const mark = createSymbol({ device, palette: c }, face, symbol, c.cream);
        mark.setLocalPosition(0, 0.66, 0.753);
        mark.setLocalEulerAngles(90, 0, 0);
        mark.setLocalScale(0.8, 0.8, 0.8);
    }
    // Centre soft tubular arcs on the body rather than the ground-level pivot.
    // Each state is one mesh and follows the block without independent animation.
    const nearbyGeo = createGeo();
    for (let quarter = 0; quarter < 4; quarter++) {
        appendSelectionArc(nearbyGeo, (quarter * Math.PI) / 2 + 0.2, Math.PI / 2 - 0.4, 0.035);
    }
    const available = meshEntity(device, blockSpin, 'block grab arcs', nearbyGeo, c.grabHint, false, false);
    const heldGeo = createGeo();
    appendSelectionArc(heldGeo, 0, Math.PI * 2, 0.05);
    const selected = meshEntity(device, blockSpin, 'block held halo', heldGeo, c.grabSelected, false, false);
    available.enabled = false;
    selected.enabled = false;
    return { entity: root, visual: blockSpin, available, selected };
}

/** Rounded tube in the X/Z plane, with soft spherical ends on open arcs. */
function appendSelectionArc(g: Geo, start: number, sweep: number, thickness: number) {
    const radius = 1.2;
    const height = 0.66;
    const segments = Math.ceil(sweep * 16);
    const sides = 8;
    const base = g.p.length / 3;
    for (let segment = 0; segment <= segments; segment++) {
        const angle = start + (sweep * segment) / segments;
        const x = Math.cos(angle),
            z = Math.sin(angle);
        for (let side = 0; side <= sides; side++) {
            const around = (side * Math.PI * 2) / sides;
            const outward = Math.cos(around),
                up = Math.sin(around);
            g.p.push(x * (radius + thickness * outward), height + thickness * up, z * (radius + thickness * outward));
            g.n.push(x * outward, up, z * outward);
            g.u.push(segment / segments, side / sides);
            if (segment < segments && side < sides) {
                const v = base + segment * (sides + 1) + side;
                g.i.push(v, v + 1, v + sides + 1, v + 1, v + sides + 2, v + sides + 1);
            }
        }
    }
    if (sweep < Math.PI * 2) {
        for (const angle of [start, start + sweep]) {
            appendSphere(
                g,
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius,
                thickness,
                thickness,
                thickness,
                8,
                6
            );
        }
    }
}

export type SunSwitchHandles = {
    entity: Entity;
    /** Symbol inlay; recoloured when the switch activates. */
    sunDisk: Entity;
    base: Entity;
};

/**
 * Sandstone pressure plate. `yaw` is the plinth's rotation in degrees, which
 * the sun inlay counter-rotates so its rays stay aligned with the world axes.
 */
export function createSunSwitch(
    { device, palette: c }: PropContext,
    root: Entity,
    yaw: number,
    symbol: PuzzleSymbol = 'sun'
): SunSwitchHandles {
    const base = roundedBox(device, root, 'sandstone plinth', c.sandstone, 0, 0.11, 0, 2.1, 0.22, 2.1, 0.12);
    roundedBox(device, root, 'plinth groove', c.barkLight, 0, 0.226, 0, 1.8, 0.02, 1.8, 0.09);
    roundedBox(device, root, 'plinth inner', c.sandstone, 0, 0.236, 0, 1.66, 0.02, 1.66, 0.08);
    roundedBox(device, root, 'groove line', c.barkLight, 0, 0.246, 0, 1.48, 0.02, 1.48, 0.07);
    roundedBox(device, root, 'ivory inset', c.cream, 0, 0.256, 0, 1.36, 0.02, 1.36, 0.06);
    const sunDisk = createSymbol({ device, palette: c }, root, symbol, c.gold);
    sunDisk.setLocalPosition(0, 0.28, 0);
    sunDisk.setLocalScale(1.55, 1, 1.55);
    sunDisk.setLocalEulerAngles(0, -yaw, 0);
    return { entity: root, sunDisk, base };
}

/** Raised geometric marks, readable without relying on colour or a font. */
function createSymbol(ctx: PropContext, root: Entity, symbol: PuzzleSymbol, material: Material) {
    const g = createGeo();
    if (symbol === 'sun') {
        const poly: number[][] = [];
        for (let i = 0; i < 32; i++) {
            const angle = (i * Math.PI) / 16;
            const radius = i % 4 === 0 ? 0.5 : 0.31;
            poly.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
        }
        appendPrism(g, poly, 0, 0, 0.02, 0);
    } else {
        // A crescent strip avoids fan-triangulating a concave silhouette.
        const points = Array.from({ length: 25 }, (_, i) => {
            const t = i / 24;
            const angle = Math.PI / 3 + (t * Math.PI * 4) / 3;
            return {
                outer: [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5],
                inner: [(0.5 - 0.65 * Math.sin(t * Math.PI)) * 0.5, (Math.cos(t * Math.PI) * Math.sqrt(3)) / 4]
            };
        });
        for (let i = 0; i < points.length - 1; i++) {
            const poly = [points[i].outer, points[i + 1].outer, points[i + 1].inner, points[i].inner];
            const cx = poly.reduce((sum, p) => sum + p[0], 0) / 4;
            const cz = poly.reduce((sum, p) => sum + p[1], 0) / 4;
            appendPrism(
                g,
                poly.map(([x, z]) => [x - cx, z - cz]),
                cx,
                0,
                0.02,
                cz
            );
        }
    }
    return meshEntity(ctx.device, root, `${symbol} symbol`, g, material, false, true);
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
