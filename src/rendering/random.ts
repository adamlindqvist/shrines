/** A seeded pseudo-random source returning values in [0, 1). */
export type Random = () => number;

/**
 * Linear congruential generator. Every call advances the sequence, so a scene
 * that draws values in the same order produces the same layout every time.
 */
export function createRandom(seed: number): Random {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}
