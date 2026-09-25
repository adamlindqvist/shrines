import type { Entity, Material } from 'playcanvas';

import { appendPrism, appendRoundedBox, appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';
import { node, roundedBox } from '../rendering/primitives';

import { createBlockStone } from './block-model';
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
    createBlockStone({ device, palette: c }, blockSpin, symbol);
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

export type PortalHandles = {
    entity: Entity;
    /** Ground marking that stays visible; sinks slightly as the gate rises. */
    sigil: Entity;
    /** Rune stones: dim while dormant, swapped for the glowing set once awake. */
    runesDim: Entity;
    runesLit: Entity;
    /** Gate pivot at ground level, scaled up from zero while opening. */
    gate: Entity;
    /** Swirl pivot inside the ring, spun about its local Y axis. */
    swirl: Entity;
};

/** Doorway proportions; the gate stands in the local X/Y plane and faces +Z. */
export const PORTAL_FRAME = { opening: 1.3, height: 1.8, pillar: 0.44, depth: 0.56, sigil: 2.2 };

/**
 * Sandstone plinth that waits for a turquoise doorway, matching the block and
 * plate style, centred on the origin of `root`. The gate is hidden until opened.
 */
export function createPortal(ctx: PropContext, root: Entity): PortalHandles {
    const { device, palette: c } = ctx;
    const { opening, height, pillar, depth, sigil: size } = PORTAL_FRAME;
    const sigil = node(root, 'portal plinth');
    {
        // The same stepped slab, groove and ivory inset as the symbol plates, kept low.
        const sand = createGeo();
        appendRoundedBox(sand, 0, 0.06, 0, size, 0.12, size, 0.08, 4);
        appendRoundedBox(sand, 0, 0.13, 0, size - 0.36, 0.02, size - 0.36, 0.06, 3);
        meshEntity(device, sigil, 'portal plinth', sand, c.sandstone, false, true);
        const groove = createGeo();
        appendRoundedBox(groove, 0, 0.123, 0, size - 0.24, 0.02, size - 0.24, 0.07, 3);
        meshEntity(device, sigil, 'plinth groove', groove, c.barkLight, false, true);
        const inset = createGeo();
        appendRoundedBox(inset, 0, 0.143, 0, size - 0.6, 0.02, size - 0.6, 0.05, 3);
        meshEntity(device, sigil, 'ivory inset', inset, c.cream, false, true);
        const recess = createGeo();
        appendRoundedBox(recess, 0, 0.153, 0, opening, 0.012, 0.16, 0.04, 2);
        meshEntity(device, sigil, 'threshold groove', recess, c.blockRecess, false, true);
    }
    // Turquoise corner studs hint at the stone that will rise; they glow once awake.
    const runes = createGeo();
    const edge = size / 2 - 0.2;
    for (const [x, z] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1]
    ])
        appendRoundedBox(runes, x * edge, 0.2, z * edge, 0.26, 0.16, 0.26, 0.07, 4);
    const runesDim = meshEntity(device, sigil, 'dormant studs', runes, c.blockStone[0], true, true);
    const runesLit = meshEntity(device, sigil, 'awake studs', runes, c.portalGlow, true, false);
    runesLit.enabled = false;

    const gate = node(root, 'portal gate');
    // Lifted onto the plinth; the controller animates `gate` itself.
    const frame = node(gate, 'gate frame', 0, 0.12, 0);
    {
        const px = opening / 2 + pillar / 2;
        const width = opening + pillar * 2;
        const top = height + 0.06;
        const pillars = createGeo();
        for (const s of [-1, 1]) appendRoundedBox(pillars, s * px, top / 2, 0, pillar, top, depth, 0.14, 6);
        meshEntity(device, frame, 'turquoise pillars', pillars, c.blockStone[0]);
        const lintel = createGeo();
        appendRoundedBox(lintel, 0, top + 0.22, 0, width + 0.16, 0.44, depth + 0.08, 0.16, 6);
        meshEntity(device, frame, 'turquoise lintel', lintel, c.blockStone[1]);
        const recess = createGeo();
        for (const s of [-1, 1]) {
            appendRoundedBox(recess, s * px, top * 0.62, depth / 2, pillar * 0.5, 0.05, 0.03, 0.02, 2);
            appendRoundedBox(recess, s * px, top * 0.3, depth / 2, pillar * 0.5, 0.05, 0.03, 0.02, 2);
        }
        meshEntity(device, frame, 'carved channels', recess, c.blockRecess);
        const gold = createGeo();
        for (const s of [-1, 1]) {
            appendRoundedBox(gold, s * px, 0.08, 0, pillar + 0.06, 0.12, depth + 0.06, 0.05, 3);
            appendRoundedBox(gold, s * px, top - 0.02, 0, pillar + 0.04, 0.08, depth + 0.04, 0.03, 3);
        }
        meshEntity(device, frame, 'gold bands', gold, c.gold);
        const emblem = node(frame, 'lintel sun', 0, top + 0.22, (depth + 0.08) / 2 - 0.004);
        emblem.setLocalEulerAngles(90, 0, 0);
        emblem.setLocalScale(0.66, 1, 0.66);
        createSymbol(ctx, emblem, 'sun', c.gold);
        const glow = createGeo();
        appendRoundedBox(glow, 0, height / 2, 0, opening + 0.04, height, 0.08, 0.04, 2);
        meshEntity(device, frame, 'portal glow', glow, c.portalGlow, false, false);
    }
    // Built flat around Y, then stood up so the swirl faces +Z.
    const upright = node(frame, 'swirl upright', 0, height / 2, 0);
    upright.setLocalEulerAngles(90, 0, 0);
    const swirl = node(upright, 'portal swirl');
    {
        const arms = createGeo();
        for (let arm = 0; arm < 3; arm++) {
            const steps = 10;
            for (let i = 0; i < steps; i++) {
                const at = (t: number, r: number) => {
                    const angle = (arm * Math.PI * 2) / 3 + t * 2.4;
                    return [Math.cos(angle) * r, Math.sin(angle) * r];
                };
                const t0 = i / steps,
                    t1 = (i + 1) / steps;
                const r0 = 0.08 + t0 * 0.52,
                    r1 = 0.08 + t1 * 0.52;
                const w0 = 0.02 + t0 * 0.04,
                    w1 = 0.02 + t1 * 0.04;
                const poly = [at(t0, r0 + w0), at(t1, r1 + w1), at(t1, r1 - w1), at(t0, r0 - w0)];
                const cx = poly.reduce((sum, q) => sum + q[0], 0) / 4;
                const cz = poly.reduce((sum, q) => sum + q[1], 0) / 4;
                appendPrism(
                    arms,
                    poly.map(([x, z]) => [x - cx, z - cz]),
                    cx,
                    0.045,
                    0.065,
                    cz
                );
            }
        }
        meshEntity(device, swirl, 'swirl arms', arms, c.portalLight, false, false);
    }
    gate.enabled = false;
    return { entity: root, sigil, runesDim, runesLit, gate, swirl };
}
