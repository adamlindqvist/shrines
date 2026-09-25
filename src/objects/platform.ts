import type { Entity } from 'playcanvas';

import { appendLathe, appendPrism, appendRoundedBox, appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';

import type { PropContext } from './context';

/** Deck tops sit flush with the meadow; everything else hangs below toward the sunken water. */
const DECK_TOP = 0.03;

/** Pier proportions. Bollards stand on the deck corners; the lantern post is taller. */
export const PIER = { bollardRadius: 0.17, bollardHeight: 0.36, lanternHeight: 1.25, edge: 0.2 };

/** Stable pseudo-random variation in [0, 1) so factories never touch the scene's seeded stream. */
const hash = (i: number, salt = 0) => {
    const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return s - Math.floor(s);
};

/** A flat four-pointed rune lying on the deck. */
function appendRune(g: Geo, x: number, y: number, z: number, outer: number, inner: number, h = 0.02) {
    const poly: number[][] = [];
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const r = i % 2 === 0 ? outer : inner;
        poly.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    appendPrism(g, poly, x, y, y + h, z);
}

/**
 * Floating shrine stone `width` (X) by `depth` (Z): a curbed deck of cut paving with a turquoise
 * compass rune, glowing notches along a turquoise band, and a craggy keel over a hanging crystal.
 */
export function createFloatingStone({ device, palette }: PropContext, root: Entity, width: number, depth: number) {
    const stone = createGeo(),
        paving = createGeo(),
        sand = createGeo(),
        inlay = createGeo(),
        glow = createGeo();
    const W = width,
        D = depth;
    // Slab and a segmented curb whose stones rise only a hair above the deck.
    appendRoundedBox(stone, 0, DECK_TOP - 0.22, 0, W, 0.4, D, 0.14, 3);
    const curb = 0.3;
    for (const [len, count, alongX] of [
        [W, Math.max(3, Math.round(W / 0.9)), true],
        [D - curb * 2, Math.max(2, Math.round((D - curb * 2) / 0.9)), false]
    ] as const) {
        const seg = len / count;
        for (let i = 0; i < count; i++) {
            const t = -len / 2 + seg * (i + 0.5);
            const h = 0.08 + hash(i, alongX ? 1 : 2) * 0.02;
            for (const side of [-1, 1]) {
                const x = alongX ? t : side * (W / 2 - curb / 2);
                const z = alongX ? side * (D / 2 - curb / 2) : t;
                const sx = alongX ? seg - 0.04 : curb;
                const sz = alongX ? curb : seg - 0.04;
                appendRoundedBox(stone, x, DECK_TOP - 0.03 + h / 2, z, sx, h, sz, 0.03, 2);
            }
        }
    }
    // Cut paving slabs inside the curb, a few warmer ones mixed in.
    const innerW = W - curb * 2,
        innerD = D - curb * 2;
    const cols = Math.max(2, Math.round(innerW / 0.95)),
        rows = Math.max(2, Math.round(innerD / 0.95));
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            const k = r * cols + c;
            const tile = hash(k, 3) < 0.28 ? sand : paving;
            const x = -innerW / 2 + (innerW / cols) * (c + 0.5),
                z = -innerD / 2 + (innerD / rows) * (r + 0.5);
            const h = 0.07 + hash(k, 4) * 0.012;
            appendRoundedBox(tile, x, DECK_TOP - h / 2, z, innerW / cols - 0.05, h, innerD / rows - 0.05, 0.02, 2);
        }
    // Compass rune in the centre, with a glowing heart.
    appendRune(inlay, 0, DECK_TOP, 0, 0.62, 0.2);
    appendRune(glow, 0, DECK_TOP + 0.02, 0, 0.26, 0.09);
    // Turquoise band with glowing notches on every face, and turquoise corner caps.
    appendRoundedBox(inlay, 0, DECK_TOP - 0.26, 0, W + 0.05, 0.1, D + 0.05, 0.05, 2);
    for (const side of [-1, 1]) {
        for (let i = -1; i <= 1; i++) {
            appendRoundedBox(glow, i * W * 0.28, DECK_TOP - 0.26, side * (D / 2 + 0.04), 0.22, 0.06, 0.04, 0.015, 1);
            if (i !== 0)
                appendRoundedBox(
                    glow,
                    side * (W / 2 + 0.04),
                    DECK_TOP - 0.26,
                    i * D * 0.25,
                    0.04,
                    0.06,
                    0.22,
                    0.015,
                    1
                );
        }
        for (const sz of [-1, 1])
            appendRoundedBox(
                inlay,
                side * (W / 2 - curb / 2),
                DECK_TOP + 0.075,
                sz * (D / 2 - curb / 2),
                0.34,
                0.05,
                0.34,
                0.03,
                2
            );
    }
    // Craggy keel: offset chunks stepping inward like a boulder torn from the riverbed.
    const chunks = 7;
    for (let i = 0; i < chunks; i++) {
        const t = i / (chunks - 1);
        const scale = 0.86 - t * 0.6;
        const ox = (hash(i, 5) - 0.5) * W * 0.18,
            oz = (hash(i, 6) - 0.5) * D * 0.18;
        appendRoundedBox(
            stone,
            ox,
            -0.48 - t * 0.78,
            oz,
            W * scale,
            0.3,
            D * scale * (0.85 + hash(i, 7) * 0.2),
            0.12,
            2
        );
    }
    // Faceted crystal hanging beneath, with two small companions.
    appendSphere(glow, 0, -1.6, 0, 0.26, 0.5, 0.26, 6, 4);
    appendSphere(glow, W * 0.14, -1.3, -D * 0.1, 0.12, 0.24, 0.12, 5, 3);
    appendSphere(glow, -W * 0.12, -1.36, D * 0.12, 0.1, 0.2, 0.1, 5, 3);
    meshEntity(device, root, 'floating stone', stone, palette.stone);
    meshEntity(device, root, 'floating stone paving', paving, palette.paving);
    meshEntity(device, root, 'floating stone warm paving', sand, palette.sandstone);
    meshEntity(device, root, 'floating stone runes', inlay, palette.teal);
    meshEntity(device, root, 'floating stone glow', glow, palette.portalGlow, false);
}

/**
 * Mooring posts standing in the water just outside a pier's two long sides, inset from its ends.
 * Piers dock floating stones at their short ends, which the posts keep clear; the posts are
 * outside the walkway and do not collide.
 */
export const pierBollards = (width: number, depth: number) => {
    const alongZ = depth >= width;
    const out = PIER.bollardRadius + 0.03;
    return [-1, 1].flatMap((a) =>
        [-1, 1].map((b) => {
            const x = alongZ ? a * (width / 2 + out) : a * (width / 2 - out - 0.1);
            const z = alongZ ? b * (depth / 2 - out - 0.1) : b * (depth / 2 + out);
            return { x, z, lantern: x > 0 && z < 0 };
        })
    );
};

/**
 * Wooden jetty `width` (X) by `depth` (Z): uneven cross planks framed by edge beams, round
 * posts into the water, rope-wrapped mooring posts and one lantern post.
 */
export function createPier({ device, palette }: PropContext, root: Entity, width: number, depth: number) {
    const planks = createGeo(),
        dark = createGeo(),
        frame = createGeo(),
        rope = createGeo(),
        nails = createGeo(),
        brass = createGeo(),
        light = createGeo();
    const E = PIER.edge;
    const innerW = width - E * 2;
    const rows = Math.max(2, Math.round(depth / 0.4));
    const pitch = depth / rows;
    for (let r = 0; r < rows; r++) {
        // Boards vary in length, offset and height, and every few is a darker, older plank.
        const len = innerW - hash(r, 1) * 0.12;
        const ox = (hash(r, 2) - 0.5) * 0.08;
        const z = -depth / 2 + pitch * (r + 0.5);
        const h = 0.09 + hash(r, 3) * 0.015;
        appendRoundedBox(hash(r, 4) < 0.25 ? dark : planks, ox, DECK_TOP - h / 2, z, len, h, pitch - 0.06, 0.025, 2);
        for (const side of [-1, 1])
            appendSphere(nails, ox + side * (len / 2 - 0.12), DECK_TOP + 0.005, z, 0.028, 0.012, 0.028, 5, 2);
    }
    // Edge beams frame the deck along both sides.
    for (const side of [-1, 1])
        appendRoundedBox(frame, side * (width / 2 - E / 2), DECK_TOP - 0.06, 0, E, 0.14, depth, 0.04, 2);
    // Round posts down into the water with a low rail between them.
    const posts = Math.max(2, Math.round(depth / 1.6) + 1);
    for (const side of [-1, 1]) {
        const x = side * (width / 2 - E / 2);
        for (let i = 0; i < posts; i++) {
            const z = -depth / 2 + E / 2 + ((depth - E) * i) / (posts - 1);
            appendLathe(
                frame,
                [
                    [0.13, -2.4],
                    [0.14, -1.2],
                    [0.13, DECK_TOP - 0.1]
                ],
                x,
                0,
                z,
                8,
                0.08,
                i + side
            );
        }
        appendRoundedBox(frame, x, -0.75, 0, 0.12, 0.14, depth - 0.2, 0.04, 2);
    }
    // Mooring posts with rope wraps; one becomes a lantern post.
    const R = PIER.bollardRadius;
    for (const { x, z, lantern } of pierBollards(width, depth)) {
        const top = lantern ? PIER.lanternHeight : PIER.bollardHeight;
        appendLathe(
            frame,
            [
                [R, -2.4],
                [R, top - 0.06],
                [R * 0.8, top],
                [0.01, top + 0.02]
            ],
            x,
            0,
            z,
            10
        );
        appendLathe(
            rope,
            [
                [R + 0.02, 0.1],
                [R + 0.045, 0.14],
                [R + 0.045, 0.2],
                [R + 0.02, 0.24]
            ],
            x,
            0,
            z,
            10
        );
        if (!lantern) continue;
        // A short arm toward the deck centre carries a small hanging lantern.
        const dx = -Math.sign(x) * 0.28,
            dz = -Math.sign(z) * 0.28;
        appendRoundedBox(
            frame,
            x + dx / 2,
            top - 0.12,
            z + dz / 2,
            Math.abs(dx) + 0.1,
            0.07,
            Math.abs(dz) + 0.1,
            0.02,
            1
        );
        const lx = x + dx,
            lz = z + dz,
            ly = top - 0.42;
        appendRoundedBox(brass, lx, ly + 0.19, lz, 0.24, 0.05, 0.24, 0.02, 1);
        appendRoundedBox(brass, lx, ly - 0.14, lz, 0.22, 0.04, 0.22, 0.015, 1);
        appendRoundedBox(light, lx, ly + 0.02, lz, 0.15, 0.26, 0.15, 0.04, 2);
        appendRoundedBox(brass, lx, ly + 0.25, lz, 0.05, 0.08, 0.05, 0.01, 1);
    }
    meshEntity(device, root, 'pier planks', planks, palette.barkLight);
    meshEntity(device, root, 'pier old planks', dark, palette.brown);
    meshEntity(device, root, 'pier frame', frame, palette.bark);
    meshEntity(device, root, 'pier rope', rope, palette.cream);
    meshEntity(device, root, 'pier nails', nails, palette.black, false);
    meshEntity(device, root, 'pier lantern frame', brass, palette.gold);
    meshEntity(device, root, 'pier lantern', light, palette.portalLight, false);
}
