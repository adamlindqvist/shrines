import type { Entity } from 'playcanvas';

import { appendLathe, appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import { node } from '../rendering/primitives';

import type { PropContext } from './context';

// x, y, z, radius, tone (0 sunlit / 1 mid / 2 shaded)
const LOBES: number[][] = [
    [0, 3.02, 0, 0.62, 0],
    [-0.4, 2.86, 0.15, 0.53, 0],
    [0.38, 2.84, -0.17, 0.54, 0],
    [0.09, 2.76, 0.42, 0.5, 0],
    [-0.12, 2.78, -0.42, 0.49, 0],
    [-0.6, 2.36, -0.23, 0.56, 1],
    [0.6, 2.32, 0.23, 0.58, 1],
    [0.21, 2.24, 0.6, 0.53, 1],
    [-0.26, 2.28, -0.6, 0.52, 1],
    [-0.5, 2.1, 0.4, 0.48, 1],
    [0.5, 2.06, -0.4, 0.49, 1],
    [-0.3, 1.9, 0.15, 0.45, 2],
    [0.29, 1.86, -0.12, 0.44, 2],
    [0, 1.86, 0.38, 0.41, 2],
    [-0.03, 1.9, -0.38, 0.41, 2]
];

export type TreeHandles = {
    entity: Entity;
    /** Crown pivot, swayed by the scene's ambient animation. */
    canopy: Entity;
};

/** Collision radius of a tree trunk at scale `s`. */
export const treeRadius = (s: number) => 0.58 * s;

/** Builds a rounded woodland tree whose trunk base sits at the origin of `root`. */
export function createTree({ device, palette }: PropContext, root: Entity, s = 1): TreeHandles {
    // Flared, slightly knotty trunk.
    const trunk = createGeo();
    appendLathe(
        trunk,
        [
            [0.55, 0],
            [0.4, 0.22],
            [0.32, 0.6],
            [0.29, 1.05],
            [0.3, 1.4],
            [0.33, 1.68],
            [0.29, 1.8]
        ].map((p) => [p[0] * s, p[1] * s]),
        0,
        0,
        0,
        16,
        0.055,
        1.7
    );
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI * 0.5 + 0.45;
        appendSphere(trunk, Math.cos(a) * 0.4 * s, 0.1 * s, Math.sin(a) * 0.4 * s, 0.25 * s, 0.32 * s, 0.25 * s, 10, 7);
    }
    meshEntity(device, root, 'trunk', trunk, palette.bark);

    const crown = node(root, 'gently swaying canopy');
    const tones = [createGeo(), createGeo(), createGeo()];
    for (const [lx, ly, lz, r, tone] of LOBES)
        appendSphere(
            tones[tone],
            lx * s * 1.18,
            (1.05 + ly * 0.12) * s,
            lz * s * 1.18,
            r * s * 1.22,
            r * 1.16 * s,
            r * s * 1.22,
            18,
            12
        );
    // Dark core seen through the gaps between lobes.
    appendSphere(tones[2], 0, 2.6 * s, 0, 0.98 * s, 0.9 * s, 0.98 * s, 14, 9);
    meshEntity(device, crown, 'sunlit crown', tones[0], palette.leafLight);
    meshEntity(device, crown, 'cushion foliage', tones[1], palette.leaf);
    meshEntity(device, crown, 'shaded underside', tones[2], palette.leafDark);
    return { entity: root, canopy: crown };
}
