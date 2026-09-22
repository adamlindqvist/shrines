import type { Entity } from 'playcanvas';

import { appendLathe, createGeo, meshEntity } from '../rendering/geometry';
import { cylinder } from '../rendering/primitives';

import type { PropContext } from './context';

/** Pots keep one collision radius regardless of scale. */
export const POT_RADIUS = 0.38;

/** Terracotta pot of size `s`, standing on the origin of `root`. */
export function createPot({ device, palette }: PropContext, root: Entity, s = 1) {
    const g = createGeo();
    appendLathe(
        g,
        [
            [0.24, 0],
            [0.42, 0.13],
            [0.55, 0.36],
            [0.51, 0.6],
            [0.36, 0.76],
            [0.32, 0.82],
            [0.39, 0.89],
            [0.37, 0.93]
        ].map((v) => [v[0] * s, v[1] * s]),
        0,
        0,
        0,
        18
    );
    meshEntity(device, root, 'pot body', g, palette.terra);
    cylinder(root, 'pot hollow', palette.black, 0, 0.915 * s, 0, 0.56 * s, 0.012, 0.56 * s);
}

/** Height of the log's axis above the ground. */
export const LOG_HEIGHT = 0.43;
export const LOG_RADIUS = 0.8;

/** Fallen log with ringed cut ends, lying along the X axis of `root`. */
export function createLog({ device, palette }: PropContext, root: Entity) {
    const g = createGeo();
    appendLathe(
        g,
        [
            [0.0, -1.3],
            [0.41, -1.3],
            [0.44, -1.1],
            [0.43, -0.3],
            [0.45, 0.5],
            [0.44, 1.12],
            [0.41, 1.3],
            [0, 1.3]
        ],
        0,
        0,
        0,
        18,
        0.035,
        0.7
    );
    const body = meshEntity(device, root, 'log body', g, palette.bark);
    body.setLocalEulerAngles(0, 0, 90);
    for (let i = 0; i < 4; i++) {
        const ring = cylinder(
            root,
            'timber ring',
            i % 2 ? palette.barkLight : palette.bark,
            1.31 + i * 0.004,
            0,
            0,
            0.39 - i * 0.098,
            0.008,
            0.39 - i * 0.098
        );
        ring.setLocalEulerAngles(0, 0, 90);
    }
}
