import type { Entity } from 'playcanvas';

import { appendRoundedBox, createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';

import type { PropContext } from './context';

/** Stone bridge proportions; the deck runs along local Z and its top is flush with the meadow. */
export const BRIDGE = {
    width: 3.8,
    parapetWidth: 0.42,
    parapetHeight: 0.3,
    pillarSize: 0.78,
    pillarHeight: 1.0,
    /** Pillars stand this far inside each end of the deck. */
    pillarInset: 0.35
};

/** Shrine dais proportions; the steps face local +Z. */
export const SHRINE = {
    width: 5.0,
    depth: 2.6,
    height: 0.42,
    stepCount: 3,
    stepDepth: 0.28,
    pillarSize: 0.72,
    pillarHeight: 1.45
};

/** Height of the dais top, where the chest stands. */
export const SHRINE_TOP = SHRINE.height + 0.03;

function pillar(g: Geo, x: number, y: number, z: number, size: number, height: number) {
    appendRoundedBox(g, x, y + 0.09, z, size + 0.14, 0.18, size + 0.14, 0.05, 3);
    appendRoundedBox(g, x, y + height / 2, z, size, height, size, 0.07, 3);
    appendRoundedBox(g, x, y + height + 0.06, z, size + 0.16, 0.16, size + 0.16, 0.05, 3);
    appendRoundedBox(g, x, y + height + 0.2, z, size * 0.72, 0.14, size * 0.72, 0.05, 3);
}

/** Paved stone bridge of `length` along local Z, with curbs and four corner pillars. */
export function createStoneBridge({ device, palette }: PropContext, root: Entity, length: number) {
    const { width: W, parapetWidth: PW, parapetHeight: PH, pillarSize, pillarHeight, pillarInset } = BRIDGE;
    const trim = createGeo(),
        paving = createGeo();
    // Deck slab and underside.
    appendRoundedBox(trim, 0, -0.22, 0, W, 0.5, length, 0.08, 3);
    // Paving slabs in two staggered columns.
    const inner = W - PW * 2 - 0.12;
    const rows = Math.max(2, Math.round(length / 1.05));
    const slab = length / rows;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < 2; c++) {
            const z = -length / 2 + slab * (r + 0.5);
            const x = (c - 0.5) * (inner / 2);
            appendRoundedBox(paving, x, 0.02, z, inner / 2 - 0.08, 0.08, slab - 0.08, 0.03, 2);
        }
    // Curbs along both sides.
    for (const side of [-1, 1]) {
        const x = side * (W / 2 - PW / 2);
        appendRoundedBox(trim, x, PH / 2, 0, PW, PH, length - 0.1, 0.07, 3);
        for (const end of [-1, 1])
            pillar(
                trim,
                side * (W / 2 - pillarSize / 2 + 0.06),
                0,
                end * (length / 2 - pillarInset),
                pillarSize,
                pillarHeight
            );
    }
    meshEntity(device, root, 'bridge stonework', trim, palette.stone);
    meshEntity(device, root, 'bridge paving', paving, palette.paving);
}

/** Raised shrine dais with a sandy top, front steps, a low rim and four pillars. */
export function createShrineDais({ device, palette }: PropContext, root: Entity) {
    const { width: W, depth: D, height: H, stepCount, stepDepth, pillarSize, pillarHeight } = SHRINE;
    const trim = createGeo(),
        paving = createGeo(),
        sand = createGeo();
    appendRoundedBox(trim, 0, H / 2, 0, W, H, D, 0.08, 3);
    appendRoundedBox(sand, 0, H, 0, W - 0.7, 0.06, D - 0.7, 0.03, 2);
    // Low rim on the sides and back.
    appendRoundedBox(trim, 0, H + 0.1, -D / 2 + 0.17, W - 0.2, 0.2, 0.3, 0.06, 3);
    for (const side of [-1, 1]) appendRoundedBox(trim, side * (W / 2 - 0.17), H + 0.1, 0, 0.3, 0.2, D - 0.2, 0.06, 3);
    // Steps descending toward +Z.
    const stepWidth = W - pillarSize * 2 - 0.2;
    for (let s = 0; s < stepCount; s++) {
        const top = (H * (stepCount - s)) / (stepCount + 1);
        appendRoundedBox(paving, 0, top / 2, D / 2 + stepDepth * (s + 0.5), stepWidth, top, stepDepth + 0.02, 0.04, 2);
    }
    for (const sx of [-1, 1])
        for (const sz of [-1, 1])
            pillar(trim, sx * (W / 2 - pillarSize / 2), 0, sz * (D / 2 - pillarSize / 2), pillarSize, pillarHeight + H);
    meshEntity(device, root, 'shrine stonework', trim, palette.stone);
    meshEntity(device, root, 'shrine steps', paving, palette.paving);
    meshEntity(device, root, 'shrine sand floor', sand, palette.sandstone);
}

/** How far the steps reach in front of the dais centre, along local +Z. */
export const shrineFront = () => SHRINE.depth / 2 + SHRINE.stepDepth * SHRINE.stepCount;
