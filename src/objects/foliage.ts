import { appendSphere, createGeo } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';
import type { Random } from '../rendering/random';

/** Three shared bush meshes, one per foliage tone, merged into a draw call each. */
export type BushBatch = {
    light: Geo;
    mid: Geo;
    dark: Geo;
};

export const createBushBatch = (): BushBatch => ({ light: createGeo(), mid: createGeo(), dark: createGeo() });

/** Appends one round bush of size `s` to a randomly chosen tone of the batch. */
export function appendBush(batch: BushBatch, rand: Random, x: number, z: number, s = 0.7) {
    const r = rand();
    appendSphere(
        r > 0.62 ? batch.light : r > 0.28 ? batch.mid : batch.dark,
        x,
        s * 0.42,
        z,
        s * 0.8,
        s * 0.74,
        s * 0.8,
        14,
        9
    );
}
