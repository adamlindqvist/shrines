import type { Entity, Material } from 'playcanvas';

import { appendLathe, appendPrism, appendRoundedBox, appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';
import { node, roundedBox } from '../rendering/primitives';

import { createBlockStone } from './block-model';
import type { PropContext } from './context';

export type PuzzleSymbol = 'sun' | 'moon';
export type PlateMode = 'permanent' | 'temporary';

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
 * Sandstone pressure plate: square and permanent, or round with a segmented rim and temporary. `yaw` is the plinth's rotation in degrees, which
 * the sun inlay counter-rotates so its rays stay aligned with the world axes.
 */
export function createSunSwitch(
    { device, palette: c }: PropContext,
    root: Entity,
    yaw: number,
    symbol: PuzzleSymbol = 'sun',
    mode: PlateMode = 'permanent'
): SunSwitchHandles {
    let base: Entity;
    if (mode === 'temporary') {
        const stone = createGeo();
        appendLathe(
            stone,
            [
                [0, 0],
                [1.1, 0],
                [1.18, 0.08],
                [1.18, 0.14],
                [1.1, 0.22],
                [0, 0.22]
            ],
            0,
            0,
            0,
            32
        );
        base = meshEntity(device, root, 'round temporary plate', stone, c.sandstone);
        const inset = createGeo();
        appendLathe(
            inset,
            [
                [0, 0.232],
                [0.91, 0.232],
                [0.94, 0.248],
                [0.91, 0.27],
                [0, 0.27]
            ],
            0,
            0,
            0,
            32
        );
        meshEntity(device, root, 'round turquoise pressure inset', inset, c.blockStone[0]);
        // Four separated ivory arcs retain their readable shape even while a block covers the centre.
        const rim = createGeo();
        for (let quarter = 0; quarter < 4; quarter++) {
            for (let segment = 0; segment < 10; segment++) {
                const a = (quarter * Math.PI) / 2 + 0.17 + (segment * (Math.PI / 2 - 0.34)) / 10;
                const b = a + (Math.PI / 2 - 0.34) / 10;
                appendPrism(
                    rim,
                    [
                        [Math.cos(a) * 1.13, Math.sin(a) * 1.13],
                        [Math.cos(b) * 1.13, Math.sin(b) * 1.13],
                        [Math.cos(b) * 1.01, Math.sin(b) * 1.01],
                        [Math.cos(a) * 1.01, Math.sin(a) * 1.01]
                    ],
                    0,
                    0.225,
                    0.255,
                    0
                );
            }
        }
        meshEntity(device, root, 'segmented temporary plate rim', rim, c.cream);
    } else {
        base = roundedBox(device, root, 'rounded sandstone plate', c.sandstone, 0, 0.11, 0, 2.1, 0.22, 2.1, 0.18);
        roundedBox(device, root, 'ivory plate border', c.cream, 0, 0.226, 0, 1.88, 0.028, 1.88, 0.12);
        roundedBox(device, root, 'turquoise symbol inset', c.blockStone[0], 0, 0.249, 0, 1.62, 0.024, 1.62, 0.1);
    }
    const sunDisk = createSymbol({ device, palette: c }, root, symbol, c.gold);
    sunDisk.setLocalPosition(0, 0.28, 0);
    // The crescent has more solid area than the sun's rays, so give it a smaller footprint.
    const symbolScale = symbol === 'moon' ? 1.12 : 1.4;
    sunDisk.setLocalScale(symbolScale, 1, symbolScale);
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
    /** Ground marking that stays visible; rumbles while the gate breaks through. */
    sigil: Entity;
    /** Rune stones: dim while dormant, swapped for the glowing set once awake. */
    runesDim: Entity;
    runesLit: Entity;
    /** Gate pivot at ground level, raised from below the plinth while opening. */
    gate: Entity;
    /** Glow pane pivot at the centre of the doorway, widened from zero once the gate lands. */
    glow: Entity;
    /** Swirl pivot inside the doorway, spun about its local Y axis. */
    swirl: Entity;
};

/** Doorway proportions; the gate stands in the local X/Y plane and faces +Z. */
export const PORTAL_FRAME = { opening: 1.3, height: 1.85, spring: 1.2, pillar: 0.44, depth: 0.56, sigil: 2.5 };

/**
 * Sandstone plinth that waits for a rounded stone arch, matching the block and
 * plate style, centred on the origin of `root`. The gate is hidden until opened.
 */
export function createPortal(ctx: PropContext, root: Entity): PortalHandles {
    const { device, palette: c } = ctx;
    const { opening, height, spring, pillar, depth, sigil: size } = PORTAL_FRAME;
    const sigil = node(root, 'portal plinth');
    {
        // A low, bevelled sun seal reads as a sleeping shrine, distinct from a pressure plate.
        const sand = createGeo();
        const radius = size / 2;
        appendLathe(
            sand,
            [
                [0, 0],
                [radius - 0.06, 0],
                [radius, 0.045],
                [radius, 0.075],
                [radius - 0.08, 0.12],
                [0, 0.12]
            ],
            0,
            0,
            0,
            20
        );
        meshEntity(device, sigil, 'rounded sandstone seal', sand, c.sandstone, false, true);
        const rim = createGeo();
        appendLathe(
            rim,
            [
                [radius - 0.13, 0.121],
                [radius - 0.26, 0.121]
            ],
            0,
            0,
            0,
            20
        );
        meshEntity(device, sigil, 'ivory seal rim', rim, c.cream, false, true);
        const inset = createGeo();
        appendLathe(
            inset,
            [
                [0.61, 0.123],
                [0, 0.123]
            ],
            0,
            0,
            0,
            24
        );
        meshEntity(device, sigil, 'turquoise sun inset', inset, c.blockStone[0], false, true);
        const sun = createSymbol(ctx, sigil, 'sun', c.gold);
        sun.setLocalPosition(0, 0.126, 0);
        sun.setLocalScale(0.9, 1, 0.9);
    }
    // Four low cabochons sit inside the ivory rim and wake with the doorway.
    const runes = createGeo();
    const edge = size / 2 - 0.38;
    for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + (i * Math.PI) / 2;
        appendSphere(runes, Math.cos(angle) * edge, 0.125, Math.sin(angle) * edge, 0.12, 0.055, 0.12, 12, 6);
    }
    const runesDim = meshEntity(device, sigil, 'dormant studs', runes, c.blockStone[0], true, true);
    const runesLit = meshEntity(device, sigil, 'awake studs', runes, c.portalGlow, true, false);
    runesLit.enabled = false;

    const gate = node(root, 'portal gate');
    // Lifted onto the plinth; the controller animates `gate` itself.
    const frame = node(gate, 'gate frame', 0, 0.12, 0);
    {
        const radius = (opening + pillar) / 2;
        const stone = createGeo();
        const inlays = createGeo();
        const trim = createGeo();
        // Short, softly worn masonry blocks give the doorway a tactile silhouette.
        for (const side of [-1, 1]) {
            for (let row = 0; row < 3; row++) {
                appendRoundedBox(stone, side * radius, 0.2 + row * 0.4, 0, pillar, 0.42, depth, 0.1, 4);
            }
            appendRoundedBox(trim, side * radius, 0.1, 0, pillar + 0.12, 0.2, depth + 0.12, 0.08, 4);
            appendRoundedBox(inlays, side * radius, 0.67, depth / 2 - 0.025, 0.16, 0.3, 0.08, 0.04, 4);
        }
        // Batch the arch stones into the same mesh as the piers.
        for (let segment = 0; segment <= 8; segment++) {
            const angle = (segment * Math.PI) / 8;
            const block = createGeo();
            appendRoundedBox(block, 0, 0, 0, pillar, 0.38, depth, 0.09, 4);
            const cos = Math.cos(angle),
                sin = Math.sin(angle);
            const base = stone.p.length / 3;
            for (let v = 0; v < block.p.length; v += 3) {
                const x = block.p[v],
                    y = block.p[v + 1];
                stone.p.push(cos * (x + radius) - sin * y, spring + sin * (x + radius) + cos * y, block.p[v + 2]);
                stone.n.push(
                    cos * block.n[v] - sin * block.n[v + 1],
                    sin * block.n[v] + cos * block.n[v + 1],
                    block.n[v + 2]
                );
            }
            stone.u.push(...block.u);
            stone.i.push(...block.i.map((index) => base + index));
        }
        appendRoundedBox(inlays, 0, spring + radius, depth / 2 + 0.02, 0.5, 0.5, 0.1, 0.05, 4);
        meshEntity(device, frame, 'rounded sandstone arch', stone, c.sandstone);
        meshEntity(device, frame, 'ivory foot stones', trim, c.cream);
        meshEntity(device, frame, 'turquoise inlays', inlays, c.blockStone[0]);
        const emblem = node(frame, 'arch sun', 0, spring + radius, depth / 2 + 0.075);
        emblem.setLocalEulerAngles(90, 0, 0);
        emblem.setLocalScale(0.5, 1, 0.5);
        createSymbol(ctx, emblem, 'sun', c.gold);
    }
    const glow = node(frame, 'glow pane', 0, height / 2, 0);
    {
        // A round-topped veil fills the arch without square corners outside the stone.
        const pane = createGeo();
        const radius = opening / 2 + 0.025;
        const outline = [
            [-radius, height / 2],
            [radius, height / 2]
        ];
        for (let segment = 0; segment <= 20; segment++) {
            const angle = (segment * Math.PI) / 20;
            outline.push([Math.cos(angle) * radius, height / 2 - spring - Math.sin(angle) * radius]);
        }
        appendPrism(pane, outline.reverse(), 0, -0.025, 0.025, 0);
        const veil = meshEntity(device, glow, 'arched turquoise veil', pane, c.portalVeil, false, false);
        veil.setLocalEulerAngles(90, 0, 0);
    }
    // Built flat around Y, then stood up so the swirl faces +Z.
    const upright = node(frame, 'swirl upright', 0, height / 2, 0);
    upright.setLocalEulerAngles(90, 0, 0);
    const swirl = node(upright, 'portal swirl');
    {
        const arms = createGeo();
        for (let arm = 0; arm < 2; arm++) {
            const steps = 18;
            for (let i = 0; i < steps; i++) {
                const at = (t: number, r: number) => {
                    const angle = arm * Math.PI + t * 2.8;
                    return [Math.cos(angle) * r, Math.sin(angle) * r];
                };
                const t0 = i / steps,
                    t1 = (i + 1) / steps;
                const r0 = 0.08 + t0 * 0.52,
                    r1 = 0.08 + t1 * 0.52;
                const w0 = 0.012 + t0 * 0.023,
                    w1 = 0.012 + t1 * 0.023;
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
        meshEntity(device, swirl, 'swirl arms', arms, c.portalThread, false, false);
    }
    gate.enabled = false;
    return { entity: root, sigil, runesDim, runesLit, gate, glow, swirl };
}
