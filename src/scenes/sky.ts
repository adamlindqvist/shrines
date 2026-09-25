import { Color } from 'playcanvas';
import type { Entity, GraphicsDevice } from 'playcanvas';

import { appendLathe, appendSphere, createGeo, meshEntity } from '../rendering/geometry';
import type { Geo } from '../rendering/geometry';
import { node } from '../rendering/primitives';
import { createRandom } from '../rendering/random';
import type { Random } from '../rendering/random';
import type { SceneResources } from '../rendering/resources';

import type { Island } from './terrain';

/** Tuning for the sky around a floating island. Distances are world units, periods seconds. */
export const SKY = {
    /** Cloud banks per 100 square units of open backdrop. */
    cloudDensity: 1.6,
    /** Cloud bank length range. */
    cloudLength: [2.6, 5.4],
    /** Clear air kept between the island rim and any cloud or islet. */
    rimMargin: 0.9,
    /** Cloud banks may tuck this close under the rim, measured past their half-length. */
    cloudMargin: -0.6,
    /** Clouds fill the band this far out from the rim; the camera never sees beyond it. */
    reach: 14,
    /** Cloud banks share this many drift layers, each one batched mesh. */
    driftLayers: 4,
    /** Side-to-side drift amplitude and period of each layer. */
    drift: 0.7,
    driftPeriod: [70, 110],
    /** Little floating islets, their radius range and gentle bob. */
    isletRadius: [0.8, 1.25],
    isletBob: 0.12,
    isletPeriod: [7, 11]
};

export type SkyOptions = {
    /** Half-size of the square area to decorate, normally the backdrop's size. */
    size: number;
    /** Seeds a separate stream so the sky never shifts scenery generation. */
    seed: number;
    /** Number of floating islets; defaults to one per 900 square units of backdrop, at least two. */
    islets?: number;
};

export type SkyHandles = {
    /** Ambient drift at scene time `time` seconds. */
    animate(time: number): void;
};

type SkyContext = { device: GraphicsDevice; resources: SceneResources };

/** Signed distance to the island rim, negative inside. */
function rimDistance(outline: number[][], x: number, z: number) {
    let inside = false,
        best = Infinity;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const [ax, az] = outline[j],
            [bx, bz] = outline[i];
        if (bz > z !== az > z && x < ((ax - bx) * (z - bz)) / (az - bz) + bx) inside = !inside;
        const dx = bx - ax,
            dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return inside ? -best : best;
}

/** A soft bank of flattened puffs, fullest in the middle, along local yaw `yaw` (radians). */
function appendCloud(g: Geo, rand: Random, x: number, y: number, z: number, length: number, yaw: number) {
    const ax = Math.sin(yaw),
        az = Math.cos(yaw);
    const puffs = 3 + Math.round(length * 0.8);
    for (let i = 0; i < puffs; i++) {
        const t = (i / (puffs - 1)) * 2 - 1;
        const r = (0.52 + (1 - t * t) * 0.55) * (0.85 + rand() * 0.3) * (length / 4.2 + 0.25);
        const along = (t * length) / 2,
            across = (rand() - 0.5) * 0.5 * r;
        appendSphere(
            g,
            x + ax * along + az * across,
            y + r * 0.18,
            z + az * along - ax * across,
            r,
            r * 0.72,
            r,
            14,
            8
        );
    }
    // A couple of low side puffs so banks read round from the tilted camera.
    for (let k = 0; k < 2; k++) {
        const along = (rand() - 0.5) * length * 0.6,
            side = k === 0 ? 1 : -1,
            r = 0.45 + rand() * 0.25;
        appendSphere(g, x + ax * along + az * side * r, y, z + az * along - ax * side * r, r, r * 0.6, r, 12, 7);
    }
}

/** A tiny floating isle: turf cap, tapering clay root and a bush or two. */
function appendIslet(turf: Geo, clay: Geo, leaf: Geo, rand: Random, r: number) {
    appendLathe(
        clay,
        [
            [0.04, -r * 1.3],
            [r * 0.42, -r * 1.02],
            [r * 0.8, -r * 0.66],
            [r * 1.02, -r * 0.34],
            [r * 1.03, -0.04]
        ],
        0,
        0,
        0,
        12,
        0.12,
        rand() * 6
    );
    appendLathe(
        turf,
        [
            [r * 1.04, -0.1],
            [r * 1.06, 0.02],
            [r * 0.9, 0.1],
            [0, 0.12]
        ],
        0,
        0,
        0,
        14
    );
    const bushes = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < bushes; i++) {
        const a = rand() * Math.PI * 2,
            d = rand() * r * 0.45,
            s = r * (0.3 + rand() * 0.14);
        appendSphere(leaf, Math.cos(a) * d, 0.1 + s * 0.7, Math.sin(a) * d, s, s * 0.9, s, 10, 7);
    }
}

/**
 * Drifting cloud banks and a few floating islets on the backdrop around the
 * island. Everything stays below the walkable top and off the island (low
 * banks may tuck under the bank's base), so it never covers play or collision.
 */
export function createSky({ device, resources }: SkyContext, root: Entity, island: Island, options: SkyOptions) {
    const rand = createRandom(options.seed);
    const S = options.size,
        floor = -island.wallHeight - 0.05;
    const sky = node(root, 'sky around the island', 0, 0, 0);

    const cloudMaterial = resources.material('soft cloud', '#fffdf6', 10, 0);
    cloudMaterial.emissive = new Color().fromString('#dfeef0');
    cloudMaterial.emissiveIntensity = 0.42;
    cloudMaterial.update();
    const turfMaterial = resources.material('islet turf', '#a6c745');
    const clayMaterial = resources.material('islet clay', '#b07c40');
    const leafMaterial = resources.material('islet bush', '#6fb83b');

    // Perimeter samples with outward normals, so placement can favour the rim.
    const rim = island.outline.map(([x, z], i) => {
        const [nx, nz] = island.outline[(i + 1) % island.outline.length];
        const length = Math.hypot(nx - x, nz - z) || 1;
        const mx = (x + nx) / 2,
            mz = (z + nz) / 2;
        const out = rimDistance(island.outline, mx + (nz - z) / length, mz - (nx - x) / length) > 0 ? 1 : -1;
        return { x: mx, z: mz, nx: ((nz - z) / length) * out, nz: (-(nx - x) / length) * out, length };
    });
    const perimeter = rim.reduce((sum, r) => sum + r.length, 0);
    const taken: { x: number; z: number; r: number }[] = [];
    // A spot `radius` clear of the rim and earlier picks, out to `reach`; `bias` > 1 hugs the rim.
    const pick = (radius: number, reach: number, bias: number, margin = SKY.rimMargin) => {
        for (let attempt = 0; attempt < 60; attempt++) {
            let along = rand() * perimeter,
                k = 0;
            while (along > rim[k].length && k < rim.length - 1) along -= rim[k++].length;
            const clear = radius + margin,
                d = clear + Math.pow(rand(), bias) * Math.max(0, reach - clear),
                x = rim[k].x + rim[k].nx * d + (rand() - 0.5) * 2,
                z = rim[k].z + rim[k].nz * d + (rand() - 0.5) * 2;
            if (Math.abs(x) > S * 0.95 || Math.abs(z) > S * 0.95) continue;
            if (rimDistance(island.outline, x, z) < clear) continue;
            if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < (t.r + radius) * 0.8)) continue;
            taken.push({ x, z, r: radius });
            return { x, z };
        }
        return null;
    };

    // Floating islets first: they are rarer and want the choicest open sky.
    const isletCount = options.islets ?? Math.max(2, Math.round(perimeter / 30));
    const islets: { entity: Entity; x: number; y: number; z: number; period: number; phase: number }[] = [];
    for (let i = 0; i < isletCount; i++) {
        const r = SKY.isletRadius[0] + rand() * (SKY.isletRadius[1] - SKY.isletRadius[0]);
        const spot = pick(r + 1.2, SKY.reach * 0.6, 1.2);
        if (!spot) continue;
        const turf = createGeo(),
            clay = createGeo(),
            leaf = createGeo();
        appendIslet(turf, clay, leaf, rand, r);
        // Hover between the backdrop and the walkable top, root clear of the floor.
        const y = Math.min(-0.3, floor + r * 1.3 + 0.2 + rand() * 0.3);
        const entity = node(sky, 'floating islet', spot.x, y, spot.z);
        entity.setLocalEulerAngles(0, rand() * 360, 0);
        meshEntity(device, entity, 'islet clay root', clay, clayMaterial, false, false);
        meshEntity(device, entity, 'islet turf', turf, turfMaterial, false, false);
        meshEntity(device, entity, 'islet bushes', leaf, leafMaterial, false, false);
        const period = SKY.isletPeriod[0] + rand() * (SKY.isletPeriod[1] - SKY.isletPeriod[0]);
        islets.push({ entity, ...spot, y, period, phase: rand() * Math.PI * 2 });
    }

    // Cloud banks nestle into the backdrop within a band around the rim, spread over a few drift layers.
    const band = perimeter * SKY.reach + Math.PI * SKY.reach * SKY.reach;
    const cloudCount = Math.round((band / 100) * SKY.cloudDensity);
    const layers = Array.from({ length: SKY.driftLayers }, () => createGeo());
    for (let i = 0; i < cloudCount; i++) {
        const length = SKY.cloudLength[0] + rand() * (SKY.cloudLength[1] - SKY.cloudLength[0]);
        // Low banks may tuck close under the rim; the island hides whatever passes beneath it.
        const spot = pick(length / 2 + SKY.drift, SKY.reach, 1.8, SKY.cloudMargin);
        if (!spot) continue;
        const yaw = Math.PI / 2 + (rand() - 0.5) * 0.7;
        appendCloud(layers[i % SKY.driftLayers], rand, spot.x, floor, spot.z, length, yaw);
    }
    const drifts = layers.map((g, i) => {
        const entity = node(sky, 'drifting clouds', 0, 0, 0);
        if (g.p.length) meshEntity(device, entity, 'cloud banks', g, cloudMaterial, false, false);
        const period = SKY.driftPeriod[0] + rand() * (SKY.driftPeriod[1] - SKY.driftPeriod[0]);
        return { entity, period, phase: (i / SKY.driftLayers) * Math.PI * 2 + rand() };
    });

    return {
        animate(time: number) {
            for (const d of drifts) {
                const a = (time / d.period) * Math.PI * 2 + d.phase;
                d.entity.setLocalPosition(Math.sin(a) * SKY.drift, Math.sin(a * 2.3) * 0.04, 0);
            }
            for (const islet of islets) {
                const a = (time / islet.period) * Math.PI * 2 + islet.phase;
                islet.entity.setLocalPosition(islet.x, islet.y + Math.sin(a) * SKY.isletBob, islet.z);
            }
        }
    } satisfies SkyHandles;
}
